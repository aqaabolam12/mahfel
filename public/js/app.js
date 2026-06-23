// ─── STATE ───────────────────────────────────────────────────────────────────
let socket=null, me=null, token=null;
let currentServerId='default', currentChannelId='general', currentChannelType='text';
let currentVoiceId=null, myServerRole='member';
let onlineUsers={}, myServers=[], serverMembers={};
let peerConnections={}, localStream=null, peerAudios={};
let isMuted=false, isDeafened=false;
let localMutes={}, localVolumes={};
let voiceUsersCache={};
let audioCtx=null, analyser=null, speakDetect=null;
let tracks=[], trackIdx=0, isPlaying=false, botAudio=null;
let authMode='login', memberListOpen=false, lastTyping=0, emojiOpen=false;

const EMOJIS=['😀','😂','🥰','😎','🤔','😅','🙄','😭','🔥','❤️','👍','👎','🎉','🎵','🎮','💻','🌟','⚡','🚀','💡','🙏','👏','😍','🤣','😊','😇','🥳','😤','💪','🤝'];
const THEMES={
  purple:{a:'#7c6af7',b:'#a855f7',bg:'#0d0f14',chat:'#1a2035'},
  blue:  {a:'#3b82f6',b:'#06b6d4',bg:'#0a0f1e',chat:'#0f1a2e'},
  green: {a:'#22c55e',b:'#10b981',bg:'#0a1a0f',chat:'#0f1f14'},
  red:   {a:'#ef4444',b:'#f97316',bg:'#1a0a0a',chat:'#1f0f0f'},
  dark:  {a:'#94a3b8',b:'#64748b',bg:'#080808',chat:'#111111'},
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.onload=()=>{
  buildEmojiPicker(); buildThemePicker();
  const t=localStorage.getItem('mt'), u=localStorage.getItem('mu');
  if(t&&u){token=t; me=JSON.parse(u); startApp();}
};
function startApp(){
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  applyTheme(localStorage.getItem('mtheme')||'purple');
  connectSocket(); updateMyUI(); loadServers();
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function switchTab(mode){
  authMode=mode;
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(i===0&&mode==='login')||(i===1&&mode==='register')));
  document.getElementById('authError').textContent='';
}
async function doAuth(){
  const u=document.getElementById('authUser').value.trim();
  const p=document.getElementById('authPass').value.trim();
  if(!u||!p){showError('نام‌کاربری و رمز الزامیه');return;}
  try{
    const res=await fetch(authMode==='login'?'/api/login':'/api/register',
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await res.json();
    if(!d.ok){showError(d.msg);return;}
    me=d.user; token=d.token;
    localStorage.setItem('mt',token); localStorage.setItem('mu',JSON.stringify(me));
    startApp();
  }catch(e){showError('خطا در اتصال');}
}
function showError(m){document.getElementById('authError').textContent=m;}
function doLogout(){localStorage.removeItem('mt');localStorage.removeItem('mu');location.reload();}

// ─── THEME ─────────────────────────────────────────────────────────────────────
function buildThemePicker(){
  const c=document.getElementById('themeColors'); if(!c)return;
  Object.entries(THEMES).forEach(([name,t])=>{
    const b=document.createElement('div');
    b.className='theme-dot'; b.style.background=t.a; b.title=name;
    b.onclick=()=>{applyTheme(name);localStorage.setItem('mtheme',name);showToast('تم تغییر کرد ✅');};
    c.appendChild(b);
  });
}
function applyTheme(name){
  const t=THEMES[name]||THEMES.purple;
  const s=document.documentElement.style;
  s.setProperty('--accent',t.a); s.setProperty('--accent2',t.b);
  s.setProperty('--bg-deep',t.bg); s.setProperty('--bg-chat',t.chat);
  s.setProperty('--accent-glow',t.a+'44');
}
function updateMyUI(){
  if(!me)return;
  ['myAvatarEl','profileAvatar'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.textContent=me.avatar; el.style.background=me.color;}
  });
  setText('myUsernameEl',me.username); setText('myStatusEl',me.status||'آنلاین');
  setText('profileUsername',me.username);
  setVal('profileBio',me.bio||''); setVal('profileStatus',me.status||'آنلاین');
}
function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function setVal(id,v){const e=document.getElementById(id);if(e)e.value=v;}

// ─── SOCKET ───────────────────────────────────────────────────────────────────
function connectSocket(){
  socket=io({auth:{token}});
  socket.on('connect_error',e=>{if(e.message==='auth'){localStorage.removeItem('mt');location.reload();}});
  socket.on('connect',()=>socket.emit('join_channel',{channelId:'general'}));

  socket.on('message',({channelId,msg})=>{
    if(channelId===currentChannelId){appendMessage(msg); handleBotCmd(msg);}
  });
  socket.on('history',({channelId,messages})=>{
    if(channelId!==currentChannelId)return;
    const a=document.getElementById('messagesArea'); a.innerHTML='';
    if(!messages.length) a.innerHTML='<div class="sys-msg">اولین پیام رو بفرست! 👋</div>';
    else messages.forEach(m=>appendMessage(m,true));
    a.scrollTop=a.scrollHeight;
  });
  socket.on('typing',({username,channelId})=>{
    if(channelId===currentChannelId&&username!==me?.username)showTyping(username);
  });
  socket.on('user_online',u=>{onlineUsers[u.id]=u; renderMemberList();});
  socket.on('user_offline',({id})=>{delete onlineUsers[id]; renderMemberList();});

  socket.on('voice_update',({channelId,users})=>{
    voiceUsersCache[channelId]=users;
    // Update audio volumes for existing connections
    Object.entries(socketUserMap).forEach(([sid,uid])=>{
      const audio=peerAudios[sid];
      if(audio&&audio.dataset.userId!==uid){
        audio.dataset.userId=uid;
        audio.volume=localMutes[uid]?0:(localVolumes[uid]??1);
      }
    });
    updateVoiceSidebar(channelId,users);
    if(channelId===currentVoiceId)renderVcUsers(users);
  });
  socket.on('voice_speaking',({userId,speaking})=>{
    // Update speaking ring
    document.querySelectorAll(`.vc-avatar[data-uid="${userId}"]`).forEach(el=>{
      el.classList.toggle('speaking', speaking && !localMutes[userId]);
    });
  });

  socket.on('channel_created',ch=>{
    const s=myServers.find(s=>s.id===ch.serverId);
    if(s&&!s.channels.find(c=>c.id===ch.id))s.channels.push(ch);
    if(ch.serverId===currentServerId)renderChannels();
  });
  socket.on('role_update',({serverId,userId,role})=>{
    if(userId===me?.id&&serverId===currentServerId)myServerRole=role;
    const m=serverMembers[serverId]?.find(m=>m.id===userId);
    if(m)m.serverRole=role;
    renderMemberList(); renderChannels();
  });
  socket.on('kicked',({serverId})=>{
    showToast('از سرور اخراج شدی!');
    myServers=myServers.filter(s=>s.id!==serverId);
    renderServerBar();
    if(currentServerId===serverId)selectServer('default');
  });
  socket.on('member_kicked',({userId})=>{
    if(serverMembers[currentServerId])
      serverMembers[currentServerId]=serverMembers[currentServerId].filter(m=>m.id!==userId);
    renderMemberList();
  });

  // Bot
  socket.on('bot_play',({title,url,requestedBy})=>{
    appendBotMsg(`🎵 **${title}**\nدرخواست از ${requestedBy}`,{title,url});
    if(botAudio){botAudio.pause(); botAudio=null;}
    botAudio=new Audio(url);
    botAudio.crossOrigin='anonymous';
    botAudio.volume=1;
    botAudio.play().catch(e=>appendBotMsg('❌ نتونستم پخش کنم'));
  });
  socket.on('bot_stop',()=>{
    if(botAudio){botAudio.pause();botAudio=null;}
    appendBotMsg('⏹ موزیک متوقف شد');
  });
  socket.on('bot_message',({text})=>appendBotMsg(text));

  // WebRTC
  socket.on('voice_user_joined',async({user:u,socketId})=>{
    if(!localStream)return;
    const pc=newPC(socketId,u.id); // pass userId so audio gets tagged
    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('rtc_offer',{to:socketId,offer});
  });
  socket.on('rtc_offer',async({from,offer})=>{
    // Try to find userId from voice room cache
    const vcUsers=voiceUsersCache[currentVoiceId]||[];
    // We'll update socketUserMap when voice_update comes
    const pc=newPC(from,socketUserMap[from]||null);
    if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    await pc.setRemoteDescription(offer);
    const ans=await pc.createAnswer();
    await pc.setLocalDescription(ans);
    socket.emit('rtc_answer',{to:from,answer:ans});
  });
  socket.on('rtc_answer',async({from,answer})=>{
    try{await peerConnections[from]?.setRemoteDescription(answer);}catch(e){}
  });
  socket.on('rtc_candidate',async({from,candidate})=>{
    try{await peerConnections[from]?.addIceCandidate(candidate);}catch(e){}
  });
}

// ─── WEBRTC ───────────────────────────────────────────────────────────────────
// Map socketId -> userId for audio control
const socketUserMap = {};

function newPC(socketId, userId){
  if(userId) socketUserMap[socketId]=userId;
  
  const pc=new RTCPeerConnection({
    iceServers:[
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'}
    ]
  });
  peerConnections[socketId]=pc;
  
  pc.onicecandidate=e=>{
    if(e.candidate)socket.emit('rtc_candidate',{to:socketId,candidate:e.candidate});
  };
  
  pc.ontrack=e=>{
    if(peerAudios[socketId]){peerAudios[socketId].pause();peerAudios[socketId].remove();}
    const audio=document.createElement('audio');
    audio.autoplay=true;
    audio.srcObject=e.streams[0];
    audio.dataset.socketId=socketId;
    const uid=socketUserMap[socketId];
    if(uid){
      audio.dataset.userId=uid;
      audio.volume=localMutes[uid]?0:(localVolumes[uid]??1);
    }
    document.body.appendChild(audio);
    peerAudios[socketId]=audio;
    audio.play().catch(e=>console.log('audio play error:',e));
  };
  
  pc.onconnectionstatechange=()=>{
    console.log(`PC ${socketId}: ${pc.connectionState}`);
  };
  
  return pc;
}

// ─── VOICE ────────────────────────────────────────────────────────────────────
async function joinVoice(channelId){
  try{
    localStream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}
    });
    startSpeakDetect();
    socket.emit('join_voice',{channelId});
    currentVoiceId=channelId;
    playTone([523,659,784],0.1);
    showToast('🎤 به ویس پیوستی');
  }catch(e){
    socket.emit('join_voice',{channelId});
    currentVoiceId=channelId;
    showToast('⚠️ دسترسی میکروفون نبود');
  }
}

function startSpeakDetect(){
  if(!localStream)return;
  try{
    audioCtx=new AudioContext();
    const src=audioCtx.createMediaStreamSource(localStream);
    analyser=audioCtx.createAnalyser();
    analyser.fftSize=512;
    src.connect(analyser);
    const buf=new Uint8Array(analyser.frequencyBinCount);
    let wasSpeaking=false;
    speakDetect=setInterval(()=>{
      if(!analyser||isMuted)return;
      analyser.getByteFrequencyData(buf);
      const avg=buf.reduce((a,b)=>a+b,0)/buf.length;
      const speaking=avg>12;
      if(speaking!==wasSpeaking){
        wasSpeaking=speaking;
        socket.emit('voice_speaking',{channelId:currentVoiceId,speaking});
      }
    },150);
  }catch(e){}
}

function leaveVoice(){
  if(currentVoiceId)socket.emit('leave_voice',{channelId:currentVoiceId});
  clearInterval(speakDetect); speakDetect=null;
  if(audioCtx){audioCtx.close(); audioCtx=null; analyser=null;}
  Object.values(peerConnections).forEach(pc=>pc.close());
  peerConnections={};
  Object.values(peerAudios).forEach(a=>{a.pause();a.remove();});
  peerAudios={};
  if(localStream){localStream.getTracks().forEach(t=>t.stop()); localStream=null;}
  currentVoiceId=null;
  document.getElementById('voiceView').classList.add('hidden');
  document.getElementById('chatView').classList.remove('hidden');
  socket.emit('join_channel',{channelId:currentChannelId});
  playTone([784,523],0.1);
  showToast('📵 از ویس خارج شدی');
}

function toggleVcMic(){
  isMuted=!isMuted;
  if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=!isMuted);
  const btn=document.getElementById('vcMuteBtn');
  if(btn){
    btn.textContent=isMuted?'🔇':'🎤';
    btn.style.background=isMuted?'rgba(239,68,68,0.4)':'';
  }
  socket.emit('voice_mute',{channelId:currentVoiceId,muted:isMuted});
  showToast(isMuted?'🔇 میکروفون خاموش':'🎤 میکروفون روشن');
}
function toggleMic(){
  isMuted=!isMuted;
  if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=!isMuted);
  const btn=document.getElementById('micBtn');
  if(btn)btn.textContent=isMuted?'🔇':'🎤';
  showToast(isMuted?'🔇 میوت':'🎤 آنمیوت');
}
function toggleDeafen(){
  isDeafened=!isDeafened;
  Object.values(peerAudios).forEach(a=>a.muted=isDeafened);
  const btn=document.getElementById('deafenBtn');
  if(btn){btn.textContent=isDeafened?'🔕':'🔊'; btn.style.background=isDeafened?'rgba(239,68,68,0.4)':'';}
  showToast(isDeafened?'🔕 صدا قطع':'🔊 صدا وصل');
}

// ─── LOCAL VOLUME ─────────────────────────────────────────────────────────────
function setLocalVolume(userId, vol){
  localVolumes[userId]=parseFloat(vol);
  // Apply to all audio elements for this user
  document.querySelectorAll('audio').forEach(a=>{
    if(a.dataset.userId===userId)
      a.volume=localMutes[userId]?0:parseFloat(vol);
  });
  const lbl=document.getElementById(`vol-lbl-${userId}`);
  if(lbl)lbl.textContent=Math.round(vol*100)+'%';
}

function toggleLocalMute(userId){
  localMutes[userId]=!localMutes[userId];
  const vol=localVolumes[userId]??1;
  document.querySelectorAll('audio').forEach(a=>{
    if(a.dataset.userId===userId)
      a.volume=localMutes[userId]?0:vol;
  });
  const btn=document.getElementById(`lmute-${userId}`);
  if(btn){
    btn.textContent=localMutes[userId]?'🔇':'🔊';
    btn.classList.toggle('muted',!!localMutes[userId]);
  }
  renderVcUsers(voiceUsersCache[currentVoiceId]||[]);
}

function renderVcUsers(users){
  const area=document.getElementById('vcParticipants');
  if(!area)return;
  if(!users.length){
    area.innerHTML='<div style="color:var(--text-muted);text-align:center;padding:20px">🎤 هنوز کسی نیست</div>';
    return;
  }
  area.innerHTML=users.map(u=>{
    const isMe=u.id===me?.id;
    const lMuted=!!localMutes[u.id];
    const vol=localVolumes[u.id]??1;
    const speaking=u.speaking&&!lMuted;
    return `<div class="vc-card">
      <div class="vc-avatar${speaking?' speaking':''}" data-uid="${u.id}"
        style="background:linear-gradient(135deg,${u.color},${u.color}bb)">
        ${u.muted||lMuted?'🔇':u.avatar}
      </div>
      <div class="vc-name">${u.username}${u.muted?' 🔇':''}</div>
      ${!isMe?`<div class="vc-vol-row">
        <button id="lmute-${u.id}" class="lmute-btn${lMuted?' muted':''}"
          onclick="toggleLocalMute('${u.id}')">${lMuted?'🔇':'🔊'}</button>
        <input type="range" class="vol-slider" min="0" max="100"
          value="${Math.round(vol*100)}"
          oninput="setLocalVolume('${u.id}',this.value/100)">
        <span id="vol-lbl-${u.id}" class="vol-lbl">${Math.round(vol*100)}%</span>
      </div>`:'<div class="vc-me-tag">شما</div>'}
    </div>`;
  }).join('');
}

function updateVoiceSidebar(channelId,users){
  const el=document.getElementById(`vul-${channelId}`);
  if(!el)return;
  el.innerHTML=users.map(u=>`<div class="vu-item">
    <div class="vu-avatar" style="background:${u.color}">${u.muted?'🔇':u.avatar}</div>
    ${u.username}
  </div>`).join('');
}

// ─── SOUNDS ───────────────────────────────────────────────────────────────────
function playTone(freqs,vol=0.2){
  try{
    const ctx=new AudioContext();
    freqs.forEach((f,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value=f;
      g.gain.setValueAtTime(vol,ctx.currentTime+i*0.12);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.12+0.3);
      o.start(ctx.currentTime+i*0.12);
      o.stop(ctx.currentTime+i*0.12+0.3);
    });
  }catch(e){}
}

// ─── MESSAGING ────────────────────────────────────────────────────────────────
function sendMessage(){
  const inp=document.getElementById('msgInput');
  const text=inp.value.trim();
  if(!text||!socket)return;
  socket.emit('message',{channelId:currentChannelId,text});
  inp.value='';
}
function handleKey(e){if(e.key==='Enter')sendMessage();}
function handleTyping(){
  const now=Date.now();
  if(now-lastTyping>2000){lastTyping=now;socket?.emit('typing',{channelId:currentChannelId});}
}
function appendMessage(msg,noScroll=false){
  const area=document.getElementById('messagesArea');
  const t=new Date(msg.time);
  const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const div=document.createElement('div');
  div.className='msg-group';
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color},${msg.color}cc)">${msg.avatar}</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color}">${msg.username}</span>
        <span class="msg-time">${ts}</span>
      </div>
      <div class="msg-text">${esc(msg.text)}</div>
    </div>`;
  area.appendChild(div);
  if(!noScroll)area.scrollTop=area.scrollHeight;
}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
let typingTimer=null;
function showTyping(name){
  const b=document.getElementById('typingBar');
  b.innerHTML=`${name} داره تایپ می‌کنه <span>•</span><span>•</span><span>•</span>`;
  clearTimeout(typingTimer);typingTimer=setTimeout(()=>b.innerHTML='',3000);
}

// ─── BOT ──────────────────────────────────────────────────────────────────────
function handleBotCmd(msg){
  if(msg.userId!==me?.id)return;
  const t=msg.text.trim();
  if(t.startsWith('!p ')||t.startsWith('p_')){
    const q=t.startsWith('!p ')?t.slice(3):t.slice(2);
    socket.emit('bot_search',{query:q.trim(),channelId:currentChannelId,username:me.username});
    appendBotMsg(`🔍 دنبال **${q.trim()}** میگردم...`);
  }else if(t.startsWith('!url ')){
    const url=t.slice(5).trim();
    socket.emit('bot_play_url',{url,channelId:currentChannelId,username:me.username});
  }else if(t==='!stop'){
    socket.emit('bot_command',{cmd:'stop',channelId:currentChannelId});
  }else if(t==='!help'){
    appendBotMsg('📋 **دستورات:**\n!p اسم آهنگ\n!url لینک mp3\n!stop');
  }
}
function appendBotMsg(text,embed=null){
  const area=document.getElementById('messagesArea');
  const t=new Date();
  const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const div=document.createElement('div');
  div.className='msg-group';
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,#7c6af7,#a855f7)">🎵</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-uname" style="color:#7c6af7">بات موزیک</span>
        <span class="msg-time">${ts}</span>
      </div>
      <div class="msg-text">${text.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>')}</div>
      ${embed?`<div class="bot-embed">
        <div class="bot-embed-art">🎵</div>
        <div class="bot-embed-info">
          <div class="bot-embed-title">${esc(embed.title)}</div>
          <div class="bot-embed-sub">پیش‌نمایش ۳۰ ثانیه‌ای</div>
        </div>
        <button class="bot-embed-btn" onclick="this.textContent=botAudio?.paused?'▶':'⏸';botAudio?.paused?botAudio.play():botAudio.pause()">⏸</button>
      </div>`:''}
    </div>`;
  area.appendChild(div);area.scrollTop=area.scrollHeight;
}

// ─── SERVERS ─────────────────────────────────────────────────────────────────
async function loadServers(){
  try{
    const d=await api('/api/servers');
    if(d.ok){myServers=d.servers; renderServerBar(); renderChannels();}
  }catch(e){renderServerBar();renderChannels();}
}
function renderServerBar(){
  const ex=document.getElementById('extraServers'); ex.innerHTML='';
  myServers.forEach(s=>{
    const el=document.createElement('div');
    el.className='server-icon'+(s.id===currentServerId?' active':'');
    el.id=`si-${s.id}`; el.title=s.name; el.textContent=s.icon;
    el.onclick=()=>selectServer(s.id); ex.appendChild(el);
  });
}
async function selectServer(id){
  currentServerId=id;
  document.querySelectorAll('.server-icon').forEach(e=>e.classList.remove('active'));
  document.getElementById(`si-${id}`)?.classList.add('active');
  setText('sidebarServerName',myServers.find(s=>s.id===id)?.name||id);
  renderChannels();
  socket.emit('join_server',{serverId:id});
  await loadMembers(id);
}
async function loadMembers(sid){
  try{
    const d=await api(`/api/servers/${sid}/members`);
    if(d.ok){
      serverMembers[sid]=d.members;
      myServerRole=d.members.find(m=>m.id===me?.id)?.serverRole||'member';
      renderMemberList(); renderChannels();
    }
  }catch(e){}
}
function renderChannels(){
  const srv=myServers.find(s=>s.id===currentServerId); if(!srv)return;
  const canAdd=['owner','admin'].includes(myServerRole);
  document.getElementById('channelList').innerHTML=`
    <div class="ch-group">
      <div class="ch-group-label"><span>▸ متنی</span>${canAdd?`<span class="ch-add" onclick="openModal('addChannelModal')">＋</span>`:''}</div>
      ${srv.channels.filter(c=>c.type==='text').map(c=>`
        <div class="ch-item${c.id===currentChannelId?' active':''}" onclick="selectChannel('${c.id}','${c.name}','text')">
          <span class="ch-icon">💬</span>${c.name}
        </div>`).join('')}
    </div>
    <div class="ch-group">
      <div class="ch-group-label"><span>▸ ویس</span>${canAdd?`<span class="ch-add" onclick="openModal('addChannelModal')">＋</span>`:''}</div>
      ${srv.channels.filter(c=>c.type==='voice').map(c=>`
        <div class="ch-item${c.id===currentChannelId?' active':''}" onclick="selectChannel('${c.id}','${c.name}','voice')">
          <span class="ch-icon">🔊</span>${c.name}
          <div id="vul-${c.id}" class="voice-users-list"></div>
        </div>`).join('')}
    </div>`;
}
function selectChannel(id,name,type){
  currentChannelId=id; currentChannelType=type;
  setText('headerName',name);
  setText('headerIcon',type==='voice'?'🔊':'💬');
  setText('headerType',type==='voice'?'ویس':'متن');
  renderChannels();
  if(type==='voice'){
    document.getElementById('voiceView').classList.remove('hidden');
    document.getElementById('chatView').classList.add('hidden');
    setText('vcTitle',`🔊 ${name}`);
    joinVoice(id);
  }else{
    document.getElementById('voiceView').classList.add('hidden');
    document.getElementById('chatView').classList.remove('hidden');
    socket.emit('join_channel',{channelId:id});
  }
}

// ─── MEMBER LIST ─────────────────────────────────────────────────────────────
function toggleMemberList(){
  memberListOpen=!memberListOpen;
  document.getElementById('memberList').classList.toggle('hidden',!memberListOpen);
  if(memberListOpen)renderMemberList();
}
function renderMemberList(){
  const list=document.getElementById('memberItems');
  const members=serverMembers[currentServerId]||[];
  const canMod=['owner','admin'].includes(myServerRole);
  list.innerHTML=members.map(u=>{
    const online=!!onlineUsers[u.id];
    const ri=u.serverRole==='owner'?'👑':u.serverRole==='admin'?'🛡️':u.serverRole==='mod'?'🔨':'';
    return `<div class="ml-user" onclick="${canMod&&u.id!==me?.id?`openUserMenu('${u.id}','${u.username}','${u.serverRole||'member'}')`:''}" style="${canMod&&u.id!==me?.id?'cursor:pointer':''}">
      <div class="ml-avatar ${online?'online':''}" style="background:${u.color}">${u.avatar}</div>
      <div><div class="ml-uname">${u.username} ${ri}</div>
      <div style="font-size:11px;color:var(--text-muted)">${online?'🟢 آنلاین':'⚫ آفلاین'}</div></div>
    </div>`;
  }).join('')||'<div style="color:var(--text-muted);padding:8px;font-size:13px">اعضایی نیست</div>';
}

// ─── USER MENU ───────────────────────────────────────────────────────────────
function openUserMenu(uid,name,role){
  setText('ctxUsername',name);
  setVal('ctxUserId',uid); setVal('ctxUserRole',role);
  setVal('roleSelect',role==='owner'?'admin':role||'member');
  openModal('userMenuModal');
}
async function setRole(){
  const uid=document.getElementById('ctxUserId').value;
  const role=document.getElementById('roleSelect').value;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/role`,'POST',{role});
  if(d.ok){closeModal('userMenuModal');showToast('رول تغییر کرد ✅');await loadMembers(currentServerId);}
  else showToast(d.msg||'خطا');
}
async function kickUser(){
  const uid=document.getElementById('ctxUserId').value;
  const name=document.getElementById('ctxUsername').textContent;
  if(!confirm(`${name} رو کیک کنی؟`))return;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/kick`,'POST');
  if(d.ok){closeModal('userMenuModal');showToast('کیک شد ✅');await loadMembers(currentServerId);}
  else showToast(d.msg);
}
async function banUser(){
  const uid=document.getElementById('ctxUserId').value;
  const name=document.getElementById('ctxUsername').textContent;
  if(!confirm(`${name} رو بن کنی؟`))return;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/ban`,'POST');
  if(d.ok){closeModal('userMenuModal');showToast('بن شد ✅');await loadMembers(currentServerId);}
  else showToast(d.msg);
}

// ─── SERVER MGMT ─────────────────────────────────────────────────────────────
async function createServer(){
  const name=document.getElementById('newServerName').value.trim();
  const icon=document.getElementById('newServerIcon').value.trim()||'🌟';
  if(!name){showToast('اسم سرور الزامیه');return;}
  const d=await api('/api/servers','POST',{name,icon});
  if(d.ok){
    myServers.push(d.server); renderServerBar();
    document.getElementById('inviteLink').textContent=`${location.origin}?join=${d.server.id}`;
    document.getElementById('serverInviteSection').style.display='block';
    document.getElementById('newServerName').value='';
    showToast('سرور ساخته شد 🎉');
  }
}
function copyInvite(){navigator.clipboard.writeText(document.getElementById('inviteLink').textContent);showToast('کپی شد ✅');}
async function joinServer(){
  const id=document.getElementById('joinServerId').value.trim(); if(!id)return;
  const d=await api(`/api/servers/${id}/join`,'POST');
  if(d.ok){if(!myServers.find(s=>s.id===d.server.id))myServers.push(d.server);renderServerBar();closeModal('joinServerModal');selectServer(d.server.id);showToast('پیوستی! 🎉');}
  else showToast(d.msg||'سرور پیدا نشد');
}
async function addChannel(){
  const name=document.getElementById('newChName').value.trim();
  const type=document.querySelector('input[name="chType"]:checked').value;
  if(!name){showToast('اسم کانال الزامیه');return;}
  const d=await api(`/api/servers/${currentServerId}/channels`,'POST',{name,type});
  if(d.ok){closeModal('addChannelModal');document.getElementById('newChName').value='';showToast('کانال ساخته شد');}
}
function openServerOptions(){openModal('joinServerModal');}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
async function saveProfile(){
  const bio=document.getElementById('profileBio').value;
  const status=document.getElementById('profileStatus').value;
  const d=await api('/api/users/me','PATCH',{bio,status});
  if(d.ok){me={...me,...d.user};localStorage.setItem('mu',JSON.stringify(me));updateMyUI();closeModal('profileModal');showToast('ذخیره شد ✅');}
}

// ─── MUSIC PLAYER ─────────────────────────────────────────────────────────────
const bgAudio=new Audio();
bgAudio.addEventListener('ended',nextTrack);
bgAudio.addEventListener('timeupdate',()=>{
  if(!bgAudio.duration)return;
  document.getElementById('musicProgress').style.width=(bgAudio.currentTime/bgAudio.duration*100)+'%';
  document.getElementById('musicTime').textContent=`${fmt(bgAudio.currentTime)}/${fmt(bgAudio.duration)}`;
});
function fmt(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
function addMusic(){
  const url=document.getElementById('musicUrl').value.trim();if(!url)return;
  tracks.push({name:url.split('/').pop()||'آهنگ',url});
  document.getElementById('musicUrl').value='';
  renderTracks(); showToast('اضافه شد');
  if(tracks.length===1)playTrack(0);
}
function renderTracks(){
  const l=document.getElementById('musicList');
  if(!tracks.length){l.innerHTML='<div style="color:var(--text-muted);text-align:center;padding:20px">لینک MP3 بذار</div>';return;}
  l.innerHTML=tracks.map((t,i)=>`<div class="track-item${i===trackIdx?' playing':''}" onclick="playTrack(${i})">
    <div class="track-num">${i===trackIdx?'▶':(i+1)}</div>
    <div class="track-info"><div class="track-name">${t.name}</div></div>
    <div onclick="rmTrack(event,${i})" style="cursor:pointer;opacity:.5">✕</div>
  </div>`).join('');
}
function rmTrack(e,i){e.stopPropagation();tracks.splice(i,1);if(trackIdx>=tracks.length)trackIdx=0;renderTracks();}
function playTrack(i){trackIdx=i;bgAudio.src=tracks[i].url;bgAudio.play().then(()=>{isPlaying=true;updPlayBtn();}).catch(()=>{});renderTracks();}
function togglePlay(){bgAudio.paused?bgAudio.play():bgAudio.pause();isPlaying=!bgAudio.paused;updPlayBtn();}
function updPlayBtn(){document.getElementById('playPauseBtn').textContent=isPlaying?'⏸':'▶';}
function prevTrack(){trackIdx=(trackIdx-1+tracks.length)%tracks.length;playTrack(trackIdx);}
function nextTrack(){trackIdx=(trackIdx+1)%tracks.length;if(tracks.length)playTrack(trackIdx);}
function seekMusic(e){const r=e.currentTarget.querySelector('.progress-bar').getBoundingClientRect();bgAudio.currentTime=((e.clientX-r.left)/r.width)*bgAudio.duration;}

// ─── EMOJI ─────────────────────────────────────────────────────────────────────
function buildEmojiPicker(){
  document.getElementById('emojiPicker').innerHTML=EMOJIS.map(e=>`<div class="em" onclick="addEmoji('${e}')">${e}</div>`).join('');
}
function toggleEmoji(){emojiOpen=!emojiOpen;document.getElementById('emojiPicker').classList.toggle('show',emojiOpen);}
function addEmoji(e){const i=document.getElementById('msgInput');i.value+=e;i.focus();}
document.addEventListener('click',e=>{if(!e.target.closest('.input-area')){emojiOpen=false;document.getElementById('emojiPicker')?.classList.remove('show');}});

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.remove('hidden');if(id==='musicModal')renderTracks();}
function closeModal(id){document.getElementById(id).classList.add('hidden');if(id==='createServerModal')document.getElementById('serverInviteSection').style.display='none';}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.modal-overlay').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)closeModal(el.id);}));
});

// ─── TOAST ─────────────────────────────────────────────────────────────────────
let toastT;
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2500);}

// ─── API HELPER ────────────────────────────────────────────────────────────────
async function api(url,method='GET',body=null){
  const opts={method,headers:{'Authorization':`Bearer ${token}`}};
  if(body){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
  const r=await fetch(url,opts);return r.json();
}

// ─── INVITE ───────────────────────────────────────────────────────────────────
const inviteId=new URLSearchParams(location.search).get('join');
if(inviteId){
  window.addEventListener('load',()=>setTimeout(async()=>{
    if(!token)return;
    const d=await api(`/api/servers/${inviteId}/join`,'POST');
    if(d.ok){if(!myServers.find(s=>s.id===d.server.id))myServers.push(d.server);renderServerBar();selectServer(d.server.id);showToast('پیوستی! 🎉');history.replaceState({},'','/');}
  },1500));
}
