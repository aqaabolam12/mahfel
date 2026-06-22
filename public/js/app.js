// ─── STATE ───────────────────────────────────────────────────────────────────
let socket = null;
let me = null;
let token = null;
let currentServerId = 'default';
let currentChannelId = 'general';
let currentChannelType = 'text';
let currentVoiceId = null;
let onlineUsers = {};
let peerConnections = {};
let localStream = null;
let isMuted = false;
let isDeafened = false;
let isPlaying = false;
let tracks = [];
let currentTrackIdx = 0;
let authMode = 'login';
let memberListOpen = false;
let typingTimers = {};
let lastTypingSent = 0;

const EMOJIS = ['😀','😂','🥰','😎','🤔','😅','🙄','😭','🔥','❤️','👍','👎','🎉','🎵','🎮','💻','🌟','⚡','🚀','💡','🙏','👏','😍','🤣','😊','😇','🥳','😤','💪','🤝'];

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function switchTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&mode==='login')||(i===1&&mode==='register')));
  document.getElementById('authError').textContent = '';
}

async function doAuth() {
  const username = document.getElementById('authUser').value.trim();
  const password = document.getElementById('authPass').value.trim();
  if (!username || !password) { showError('نام‌کاربری و رمز الزامیه'); return; }
  const url = authMode === 'login' ? '/api/login' : '/api/register';
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
  const data = await res.json();
  if (!data.ok) { showError(data.msg); return; }
  me = data.user;
  token = data.token;
  localStorage.setItem('mahfel_token', token);
  startApp();
}

function showError(msg) { document.getElementById('authError').textContent = msg; }

async function tryAutoLogin() {
  const t = localStorage.getItem('mahfel_token');
  if (!t) return false;
  // we'll try to connect with stored token; if auth fails, show login
  token = t;
  return true;
}

function doLogout() {
  localStorage.removeItem('mahfel_token');
  location.reload();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.onload = async () => {
  buildEmojiPicker();
  const hasToken = await tryAutoLogin();
  if (hasToken) {
    // try silent login via test — we stored token, attempt connect
    // If socket auth fails, we'll catch the error
    startApp();
  }
};

function startApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  connectSocket();
  updateMyUI();
  loadServers();
}

function updateMyUI() {
  if (!me) return;
  document.getElementById('myAvatarEl').textContent = me.avatar;
  document.getElementById('myAvatarEl').style.background = me.color;
  document.getElementById('myUsernameEl').textContent = me.username;
  document.getElementById('myStatusEl').textContent = me.status || 'آنلاین';
  document.getElementById('profileAvatar').textContent = me.avatar;
  document.getElementById('profileAvatar').style.background = me.color;
  document.getElementById('profileUsername').textContent = me.username;
  document.getElementById('profileBio').value = me.bio || '';
  document.getElementById('profileStatus').value = me.status || 'آنلاین';
}

// ─── SOCKET ───────────────────────────────────────────────────────────────────
function connectSocket() {
  socket = io({ auth: { token } });

  socket.on('connect_error', (err) => {
    if (err.message === 'auth') {
      localStorage.removeItem('mahfel_token');
      location.reload();
    }
  });

  socket.on('connect', () => {
    socket.emit('join_channel', { channelId: 'general' });
  });

  socket.on('message', ({ channelId, msg }) => {
    if (channelId === currentChannelId) appendMessage(msg);
  });

  socket.on('history', ({ channelId, messages }) => {
    if (channelId !== currentChannelId) return;
    const area = document.getElementById('messagesArea');
    area.innerHTML = '';
    if (messages.length === 0) {
      area.innerHTML = '<div class="sys-msg">اولین پیام رو بفرست! 👋</div>';
    } else {
      messages.forEach(m => appendMessage(m, true));
    }
    area.scrollTop = area.scrollHeight;
  });

  socket.on('typing', ({ username, channelId }) => {
    if (channelId !== currentChannelId || username === me?.username) return;
    showTyping(username);
  });

  socket.on('user_online', (user) => {
    onlineUsers[user.id] = user;
    renderMemberList();
  });

  socket.on('user_offline', ({ id }) => {
    delete onlineUsers[id];
    renderMemberList();
  });

  socket.on('voice_update', ({ channelId, users }) => {
    updateVoiceUsers(channelId, users);
    if (channelId === currentVoiceId) renderVoiceParticipants(users);
  });

  socket.on('channel_created', (ch) => {
    const srv = getMyServers().find(s => s.id === ch.serverId);
    if (srv) { srv.channels.push(ch); }
    if (ch.serverId === currentServerId) renderChannels();
  });

  // WebRTC signaling
  socket.on('voice_user_joined', async ({ user: joinedUser, socketId }) => {
    if (!localStream) return;
    const pc = createPeerConnection(socketId);
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('rtc_offer', { to: socketId, offer });
  });

  socket.on('rtc_offer', async ({ from, offer }) => {
    const pc = createPeerConnection(from);
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('rtc_answer', { to: from, answer });
  });

  socket.on('rtc_answer', async ({ from, answer }) => {
    const pc = peerConnections[from];
    if (pc) await pc.setRemoteDescription(answer);
  });

  socket.on('rtc_candidate', async ({ from, candidate }) => {
    const pc = peerConnections[from];
    if (pc) await pc.addIceCandidate(candidate);
  });
}

function createPeerConnection(socketId) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  peerConnections[socketId] = pc;
  pc.onicecandidate = e => { if (e.candidate) socket.emit('rtc_candidate', { to: socketId, candidate: e.candidate }); };
  pc.ontrack = e => {
    const audio = new Audio();
    audio.srcObject = e.streams[0];
    audio.play();
  };
  return pc;
}

// ─── SERVERS ──────────────────────────────────────────────────────────────────
let myServers = [
  {
    id: 'default', name: '🏠 محفل اصلی', icon: '🏠', ownerId: null,
    channels: [
      { id: 'general', name: 'عمومی', type: 'text', serverId: 'default' },
      { id: 'music', name: 'موزیک', type: 'text', serverId: 'default' },
      { id: 'vc-main', name: 'ویس عمومی', type: 'voice', serverId: 'default' },
    ]
  }
];

function getMyServers() { return myServers; }

async function loadServers() {
  try {
    const res = await fetch('/api/servers', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.ok) {
      myServers = data.servers;
      renderServerBar();
      renderChannels();
    }
  } catch(e) {
    // use local default
    renderServerBar();
    renderChannels();
  }
}

function renderServerBar() {
  const extra = document.getElementById('extraServers');
  extra.innerHTML = '';
  myServers.forEach(s => {
    const el = document.createElement('div');
    el.className = 'server-icon' + (s.id === currentServerId ? ' active' : '');
    el.id = `si-${s.id}`;
    el.title = s.name;
    el.textContent = s.icon;
    el.onclick = () => selectServer(s.id);
    extra.appendChild(el);
  });
}

function selectServer(id) {
  currentServerId = id;
  document.querySelectorAll('.server-icon').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`si-${id}`);
  if (el) el.classList.add('active');
  const srv = myServers.find(s => s.id === id);
  document.getElementById('sidebarServerName').textContent = srv?.name || id;
  renderChannels();
  socket.emit('join_server', { serverId: id });
}

function renderChannels() {
  const srv = myServers.find(s => s.id === currentServerId);
  if (!srv) return;
  const list = document.getElementById('channelList');
  const textChs = srv.channels.filter(c => c.type === 'text');
  const voiceChs = srv.channels.filter(c => c.type === 'voice');

  list.innerHTML = `
    <div class="ch-group">
      <div class="ch-group-label">
        <span>▸ کانال‌های متنی</span>
        <span class="ch-add" title="کانال جدید" onclick="openModal('addChannelModal')">＋</span>
      </div>
      ${textChs.map(c => `
        <div class="ch-item ${c.id===currentChannelId?'active':''}" onclick="selectChannel('${c.id}','${c.name}','text')">
          <span class="ch-icon">💬</span>${c.name}
        </div>`).join('')}
    </div>
    <div class="ch-group">
      <div class="ch-group-label">
        <span>▸ کانال‌های ویس</span>
        <span class="ch-add" title="کانال ویس جدید" onclick="openModal('addChannelModal')">＋</span>
      </div>
      ${voiceChs.map(c => `
        <div class="ch-item ${c.id===currentChannelId?'active':''}" onclick="selectChannel('${c.id}','${c.name}','voice')">
          <span class="ch-icon">🔊</span>${c.name}
          <div id="vul-${c.id}" class="voice-users-list"></div>
        </div>`).join('')}
    </div>`;
}

function selectChannel(id, name, type) {
  currentChannelId = id;
  currentChannelType = type;
  document.getElementById('headerName').textContent = name;
  document.getElementById('headerIcon').textContent = type === 'voice' ? '🔊' : '💬';
  document.getElementById('headerType').textContent = type === 'voice' ? 'ویس' : 'متن';
  renderChannels();

  if (type === 'voice') {
    document.getElementById('voiceView').classList.remove('hidden');
    document.getElementById('chatView').classList.add('hidden');
    document.getElementById('vcTitle').textContent = `🔊 ${name}`;
    joinVoice(id);
  } else {
    document.getElementById('voiceView').classList.add('hidden');
    document.getElementById('chatView').classList.remove('hidden');
    socket.emit('join_channel', { channelId: id });
  }
}

// ─── MESSAGING ────────────────────────────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !socket) return;
  socket.emit('message', { channelId: currentChannelId, text });
  input.value = '';
}

function handleKey(e) { if (e.key === 'Enter') sendMessage(); }

function handleTyping() {
  const now = Date.now();
  if (now - lastTypingSent > 2000) {
    lastTypingSent = now;
    socket?.emit('typing', { channelId: currentChannelId });
  }
}

function appendMessage(msg, noScroll = false) {
  const area = document.getElementById('messagesArea');
  const time = new Date(msg.time);
  const timeStr = `${time.getHours()}:${String(time.getMinutes()).padStart(2,'0')}`;
  const div = document.createElement('div');
  div.className = 'msg-group';
  div.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color},${msg.color}cc)">${msg.avatar}</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color}">${msg.username}</span>
        <span class="msg-time">${timeStr}</span>
      </div>
      <div class="msg-text">${escapeHtml(msg.text)}</div>
    </div>`;
  area.appendChild(div);
  if (!noScroll) area.scrollTop = area.scrollHeight;
}

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let typingShowTimer = null;
function showTyping(username) {
  const bar = document.getElementById('typingBar');
  bar.innerHTML = `${username} داره تایپ می‌کنه <span>•</span><span>•</span><span>•</span>`;
  clearTimeout(typingShowTimer);
  typingShowTimer = setTimeout(() => { bar.innerHTML = ''; }, 3000);
}

// ─── VOICE ────────────────────────────────────────────────────────────────────
async function joinVoice(channelId) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    socket.emit('join_voice', { channelId });
    currentVoiceId = channelId;
    showToast('به ویس پیوستی 🎤');
  } catch(e) {
    showToast('دسترسی به میکروفون نبود');
    socket.emit('join_voice', { channelId }); // join without audio (listen only)
    currentVoiceId = channelId;
  }
}

function leaveVoice() {
  if (currentVoiceId) {
    socket.emit('leave_voice', { channelId: currentVoiceId });
    currentVoiceId = null;
  }
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  selectChannel(currentChannelId === currentVoiceId ? 'general' : currentChannelId, 'عمومی', 'text');
  showToast('از ویس خارج شدی');
}

function toggleVcMic() {
  isMuted = !isMuted;
  if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
  const btn = document.getElementById('vcMuteBtn');
  btn.textContent = isMuted ? '🔇' : '🎤';
  showToast(isMuted ? 'میکروفون خاموش' : 'میکروفون روشن');
}

function toggleDeafen() {
  isDeafened = !isDeafened;
  showToast(isDeafened ? 'صدا قطع' : 'صدا وصل');
}

function toggleMic() {
  isMuted = !isMuted;
  if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
  document.getElementById('micBtn').textContent = isMuted ? '🔇' : '🎤';
  showToast(isMuted ? 'صدات قطعه' : 'صدات وصله');
}

function renderVoiceParticipants(users) {
  const area = document.getElementById('vcParticipants');
  if (users.length === 0) {
    area.innerHTML = '<div style="color:var(--text-muted);font-size:14px">هنوز کسی نیست...</div>';
    return;
  }
  area.innerHTML = users.map(u => `
    <div class="vc-user">
      <div class="vc-avatar" style="background:linear-gradient(135deg,${u.color},${u.color}cc)">${u.avatar}</div>
      <div class="vc-uname">${u.username}</div>
    </div>`).join('');
}

function updateVoiceUsers(channelId, users) {
  const el = document.getElementById(`vul-${channelId}`);
  if (!el) return;
  el.innerHTML = users.map(u => `
    <div class="vu-item">
      <div class="vu-avatar" style="background:${u.color}">${u.avatar}</div>
      ${u.username}
    </div>`).join('');
}

// ─── MEMBER LIST ──────────────────────────────────────────────────────────────
function toggleMemberList() {
  memberListOpen = !memberListOpen;
  document.getElementById('memberList').classList.toggle('hidden', !memberListOpen);
}

function renderMemberList() {
  const list = document.getElementById('memberItems');
  const users = Object.values(onlineUsers);
  list.innerHTML = users.map(u => `
    <div class="ml-user">
      <div class="ml-avatar" style="background:${u.color}">${u.avatar}</div>
      <div class="ml-uname">${u.username}</div>
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:13px;padding:8px">کسی آنلاین نیست</div>';
}

// ─── SERVER MANAGEMENT ────────────────────────────────────────────────────────
async function createServer() {
  const name = document.getElementById('newServerName').value.trim();
  const icon = document.getElementById('newServerIcon').value.trim() || '🌟';
  if (!name) { showToast('اسم سرور رو بنویس'); return; }
  const res = await fetch('/api/servers', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body:JSON.stringify({name,icon})
  });
  const data = await res.json();
  if (data.ok) {
    myServers.push(data.server);
    renderServerBar();
    // show invite link
    const inviteUrl = `${location.origin}?join=${data.server.id}`;
    document.getElementById('inviteLink').textContent = inviteUrl;
    document.getElementById('serverInviteSection').style.display = 'block';
    document.getElementById('newServerName').value = '';
    showToast('سرور ساخته شد! 🎉');
  }
}

function copyInvite() {
  const txt = document.getElementById('inviteLink').textContent;
  navigator.clipboard.writeText(txt);
  showToast('لینک کپی شد ✅');
}

async function joinServer() {
  const id = document.getElementById('joinServerId').value.trim();
  if (!id) return;
  const res = await fetch(`/api/servers/${id}/join`, {
    method:'POST', headers:{'Authorization':`Bearer ${token}`}
  });
  const data = await res.json();
  if (data.ok) {
    if (!myServers.find(s => s.id === data.server.id)) myServers.push(data.server);
    renderServerBar();
    closeModal('joinServerModal');
    selectServer(data.server.id);
    showToast(`به ${data.server.name} پیوستی!`);
  } else {
    showToast(data.msg || 'سرور پیدا نشد');
  }
}

async function addChannel() {
  const name = document.getElementById('newChName').value.trim();
  const type = document.querySelector('input[name="chType"]:checked').value;
  if (!name) { showToast('اسم کانال رو بنویس'); return; }
  const res = await fetch(`/api/servers/${currentServerId}/channels`, {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body:JSON.stringify({name,type})
  });
  const data = await res.json();
  if (data.ok) {
    closeModal('addChannelModal');
    document.getElementById('newChName').value = '';
    showToast(`کانال ${name} ساخته شد`);
  }
}

function openServerOptions() {
  // simple: show join server dialog
  openModal('joinServerModal');
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
async function saveProfile() {
  const bio = document.getElementById('profileBio').value;
  const status = document.getElementById('profileStatus').value;
  const res = await fetch('/api/users/me', {
    method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body:JSON.stringify({bio,status})
  });
  const data = await res.json();
  if (data.ok) {
    me = { ...me, ...data.user };
    updateMyUI();
    closeModal('profileModal');
    showToast('پروفایل ذخیره شد ✅');
  }
}

// ─── MUSIC ───────────────────────────────────────────────────────────────────
const audio = new Audio();
audio.addEventListener('ended', nextTrack);
audio.addEventListener('timeupdate', updateProgress);

function addMusic() {
  const url = document.getElementById('musicUrl').value.trim();
  if (!url) { showToast('یه لینک بذار'); return; }
  const name = url.includes('youtu') ? '🎵 آهنگ از یوتیوب' : url.split('/').pop() || 'آهنگ جدید';
  tracks.push({ name, url, artist: '' });
  document.getElementById('musicUrl').value = '';
  renderMusicList();
  showToast('آهنگ اضافه شد');
  if (tracks.length === 1) playTrack(0);
}

function renderMusicList() {
  const list = document.getElementById('musicList');
  if (tracks.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">لینک mp3 یا فایل بذار</div>';
    return;
  }
  list.innerHTML = tracks.map((t,i) => `
    <div class="track-item ${i===currentTrackIdx?'playing':''}" onclick="playTrack(${i})">
      <div class="track-num">${i===currentTrackIdx?'▶':(i+1)}</div>
      <div class="track-info">
        <div class="track-name">${t.name}</div>
        <div class="track-artist">${t.artist}</div>
      </div>
    </div>`).join('');
}

function playTrack(idx) {
  currentTrackIdx = idx;
  const t = tracks[idx];
  audio.src = t.url;
  audio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(()=>{});
  renderMusicList();
  showToast(`▶ ${t.name}`);
}

function togglePlay() {
  if (audio.paused) { audio.play(); isPlaying = true; } else { audio.pause(); isPlaying = false; }
  updatePlayBtn();
}

function updatePlayBtn() {
  document.getElementById('playPauseBtn').textContent = isPlaying ? '⏸' : '▶';
}

function prevTrack() {
  currentTrackIdx = (currentTrackIdx - 1 + tracks.length) % tracks.length;
  playTrack(currentTrackIdx);
}

function nextTrack() {
  currentTrackIdx = (currentTrackIdx + 1) % tracks.length;
  if (tracks.length > 0) playTrack(currentTrackIdx);
}

function updateProgress() {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById('musicProgress').style.width = pct + '%';
  document.getElementById('musicTime').textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
}

function seekMusic(e) {
  const bar = e.currentTarget.querySelector('.progress-bar');
  const rect = bar.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
}

function fmtTime(s) {
  const m = Math.floor(s/60);
  return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

// ─── EMOJI ────────────────────────────────────────────────────────────────────
function buildEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  picker.innerHTML = EMOJIS.map(e => `<div class="em" onclick="addEmoji('${e}')">${e}</div>`).join('');
}

let emojiOpen = false;
function toggleEmoji() {
  emojiOpen = !emojiOpen;
  document.getElementById('emojiPicker').classList.toggle('show', emojiOpen);
}

function addEmoji(em) {
  const inp = document.getElementById('msgInput');
  inp.value += em;
  inp.focus();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.input-area')) {
    emojiOpen = false;
    document.getElementById('emojiPicker')?.classList.remove('show');
  }
});

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'musicModal') renderMusicList();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'createServerModal') {
    document.getElementById('serverInviteSection').style.display = 'none';
  }
}

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

// icon picker
document.querySelectorAll('.emoji-row span, .emoji-row').forEach(row => {
  if (row.tagName === 'DIV') {
    row.querySelectorAll('*').forEach(span => {
      span.style.cursor = 'pointer';
    });
    row.addEventListener('click', e => {
      if (e.target !== row) {
        document.getElementById('newServerIcon').value = e.target.textContent.trim();
      }
    });
  }
});

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── CHECK INVITE LINK ───────────────────────────────────────────────────────
const urlParams = new URLSearchParams(location.search);
const inviteServerId = urlParams.get('join');
if (inviteServerId) {
  window.addEventListener('load', () => {
    setTimeout(async () => {
      if (!token) return;
      const res = await fetch(`/api/servers/${inviteServerId}/join`, {
        method:'POST', headers:{'Authorization':`Bearer ${token}`}
      });
      const data = await res.json();
      if (data.ok) {
        if (!myServers.find(s => s.id === data.server.id)) myServers.push(data.server);
        renderServerBar();
        selectServer(data.server.id);
        showToast(`به ${data.server.name} پیوستی! 🎉`);
        history.replaceState({}, '', '/');
      }
    }, 1500);
  });
}
