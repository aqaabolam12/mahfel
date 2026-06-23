// ─── STATE ───────────────────────────────────────────────────────────────────
let socket=null,me=null,token=null;
let currentServerId='default',currentChannelId='general',currentChannelType='text';
let currentVoiceId=null,myServerRole='member';
let onlineUsers={},peerConnections={},localStream=null;
let isMuted=false,isDeafened=false,isPlaying=false;
let tracks=[],currentTrackIdx=0,authMode='login';
let memberListOpen=false,lastTypingSent=0;
let myServers=[],serverMembers={};
let audioContext=null,analyserNode=null,speakingInterval=null;
let botAudio=null,botPlaying=false;

const EMOJIS=['😀','😂','🥰','😎','🤔','😅','🙄','😭','🔥','❤️','👍','👎','🎉','🎵','🎮','💻','🌟','⚡','🚀','💡','🙏','👏','😍','🤣','😊','😇','🥳','😤','💪','🤝'];
const THEMES={
  purple:{accent:'#7c6af7',accent2:'#a855f7',bg:'#0d0f14',bgChat:'#1a2035'},
  blue:  {accent:'#3b82f6',accent2:'#06b6d4',bg:'#0a0f1e',bgChat:'#0f1a2e'},
  green: {accent:'#22c55e',accent2:'#10b981',bg:'#0a1a0f',bgChat:'#0f1f14'},
  red:   {accent:'#ef4444',accent2:'#f97316',bg:'#1a0a0a',bgChat:'#1f0f0f'},
  dark:  {accent:'#94a3b8',accent2:'#64748b',bg:'#080808',bgChat:'#111111'},
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function switchTab(mode){
  authMode=mode;
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(i===0&&mode==='login')||(i===1&&mode==='register')));
  document.getElementById('authError').textContent='';
}
async function doAuth(){
  const username=document.getElementById('authUser').value.trim();
  const password=document.getElementById('authPass').value.trim();
  if(!username||!password){showError('نام‌کاربری و رمز الزامیه');return;}
  const url=authMode==='login'?'/api/login':'/api/register';
  try{
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const data=await res.json();
    if(!data.ok){showError(data.msg);return;}
    me=data.user;token=data.token;
    localStorage.setItem('mahfel_token',token);
    localStorage.setItem('mahfel_user',JSON.stringify(me));
    startApp();
  }catch(e){showError('خطا در اتصال');}
}
function showError(msg){document.getElementById('authError').textContent=msg;}
window.onload=async()=>{
  buildEmojiPicker();buildThemePicker();
  const t=localStorage.getItem('mahfel_token');
  const u=localStorage.getItem('mahfel_user');
  if(t&&u){token=t;me=JSON.parse(u);startApp();}
};
function startApp(){
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  applyTheme(localStorage.getItem('mahfel_theme')||'purple');
  connectSocket();updateMyUI();loadServers();
}
function updateMyUI(){
  if(!me)return;
  document.getElementById('myAvatarEl').textContent=me.avatar;
  document.getElementById('myAvatarEl').style.background=me.color;
  document.getElementById('myUsernameEl').textContent=me.username;
  document.getElementById('myStatusEl').textContent=me.status||'آنلاین';
  document.getElementById('profileAvatar').textContent=me.avatar;
  document.getElementById('profileAvatar').style.background=me.color;
  document.getElementById('profileUsername').textContent=me.username;
  document.getElementById('profileBio').value=me.bio||'';
  document.getElementById('profileStatus').value=me.status||'آنلاین';
}
function doLogout(){localStorage.removeItem('mahfel_token');localStorage.removeItem('mahfel_user');location.reload();}

// ─── THEME ────────────────────────────────────────────────────────────────────
function buildThemePicker(){
  const c=document.getElementById('themeColors');if(!c)return;
  Object.entries(THEMES).forEach(([name,t])=>{
    const btn=document.createElement('div');
    btn.className='theme-dot';btn.style.background=t.accent;btn.title=name;
    btn.onclick=()=>{applyTheme(name);localStorage.setItem('mahfel_theme',name);showToast('تم تغییر کرد ✅');};
    c.appendChild(btn);
  });
}
function applyTheme(name){
  const t=THEMES[name]||THEMES.purple;
  const r=document.documentElement.style;
  r.setProperty('--accent',t.accent);r.setProperty('--accent2',t.accent2);
  r.setProperty('--bg-deep',t.bg);r.setProperty('--bg-chat',t.bgChat);
  r.setProperty('--accent-glow',t.accent+'55');
}

// ─── SOCKET ───────────────────────────────────────────────────────────────────
function connectSocket(){
  socket=io({auth:{token}});
  socket.on('connect_error',err=>{if(err.message==='auth'){localStorage.removeItem('mahfel_token');location.reload();}});
  socket.on('connect',()=>socket.emit('join_channel',{channelId:'general'}));
  socket.on('message',({channelId,msg})=>{
    if(channelId===currentChannelId){
      appendMessage(msg);
      handleBotCommand(msg);
    }
  });
  socket.on('history',({channelId,messages})=>{
    if(channelId!==currentChannelId)return;
    const area=document.getElementById('messagesArea');
    area.innerHTML='';
    if(!messages.length)area.innerHTML='<div class="sys-msg">اولین پیام رو بفرست! 👋</div>';
    else messages.forEach(m=>appendMessage(m,true));
    area.scrollTop=area.scrollHeight;
  });
  socket.on('typing',({username,channelId})=>{
    if(channelId!==currentChannelId||username===me?.username)return;
    showTyping(username);
  });
  socket.on('user_online',user=>{onlineUsers[user.id]=user;renderMemberList();});
  socket.on('user_offline',({id})=>{delete onlineUsers[id];renderMemberList();});
  socket.on('voice_update',({channelId,users})=>{
    updateVoiceUsersSidebar(channelId,users);
    if(channelId===currentVoiceId)renderVoiceParticipants(users);
  });
  socket.on('voice_speaking',({userId,speaking})=>{
    document.querySelectorAll(`.vc-avatar[data-uid="${userId}"]`).forEach(el=>el.classList.toggle('speaking',speaking));
  });
  socket.on('channel_created',ch=>{
    const srv=myServers.find(s=>s.id===ch.serverId);
    if(srv&&!srv.channels.find(c=>c.id===ch.id))srv.channels.push(ch);
    if(ch.serverId===currentServerId)renderChannels();
  });
  socket.on('role_update',({serverId,userId,role})=>{
    if(userId===me?.id&&serverId===currentServerId)myServerRole=role;
    if(serverMembers[serverId]){const m=serverMembers[serverId].find(m=>m.id===userId);if(m)m.serverRole=role;}
    renderMemberList();renderChannels();
  });
  socket.on('kicked',({serverId})=>{
    showToast('از سرور اخراج شدی!');
    myServers=myServers.filter(s=>s.id!==serverId);
    renderServerBar();if(currentServerId===serverId)selectServer('default');
  });
  socket.on('member_kicked',({userId})=>{
    if(serverMembers[currentServerId])serverMembers[currentServerId]=serverMembers[currentServerId].filter(m=>m.id!==userId);
    renderMemberList();
  });
  socket.on('bot_play',({title,url,requestedBy})=>{
    appendBotMessage(`🎵 داره پخش میشه: **${title}** — درخواست از ${requestedBy}`);
    botPlayAudio(url);
  });
  socket.on('bot_stop',()=>{
    if(botAudio){botAudio.pause();botAudio=null;botPlaying=false;}
    appendBotMessage('⏹ موزیک متوقف شد');
  });
  // WebRTC
  socket.on('voice_user_joined',async({user:u,socketId})=>{
    if(!localStream)return;
    const pc=createPC(socketId);
    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('rtc_offer',{to:socketId,offer});
  });
  socket.on('rtc_offer',async({from,offer})=>{
    const pc=createPC(from);
    if(localStream)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    await pc.setRemoteDescription(offer);
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('rtc_answer',{to:from,answer});
  });
  socket.on('rtc_answer',async({from,answer})=>{const pc=peerConnections[from];if(pc)await pc.setRemoteDescription(answer);});
  socket.on('rtc_candidate',async({from,candidate})=>{const pc=peerConnections[from];if(pc)try{await pc.addIceCandidate(candidate);}catch(e){}});
}
function createPC(socketId){
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
  peerConnections[socketId]=pc;
  pc.onicecandidate=e=>{if(e.candidate)socket.emit('rtc_candidate',{to:socketId,candidate:e.candidate});};
  pc.ontrack=e=>{
    const audio=new Audio();audio.srcObject=e.streams[0];audio.autoplay=true;
    document.body.appendChild(audio);audio.play().catch(()=>{});
  };
  return pc;
}

// ─── BOT COMMANDS ─────────────────────────────────────────────────────────────
function handleBotCommand(msg){
  if(msg.userId===me?.id){
    const text=msg.text.trim();
    // !p یا p_ برای پخش
    if(text.startsWith('!p ')||text.startsWith('p_')){
      const query=text.startsWith('!p ')?text.slice(3):text.slice(2);
      socket.emit('bot_search',{query:query.trim(),channelId:currentChannelId,username:me.username});
      appendBotMessage(`🔍 دنبال **${query.trim()}** میگردم...`);
    }
    // !stop
    else if(text==='!stop'||text==='استاپ'){
      socket.emit('bot_command',{cmd:'stop',channelId:currentChannelId});
    }
    // !skip
    else if(text==='!skip'||text==='اسکیپ'){
      socket.emit('bot_command',{cmd:'skip',channelId:currentChannelId});
    }
    // !q یا !queue
    else if(text==='!q'||text==='!queue'){
      socket.emit('bot_command',{cmd:'queue',channelId:currentChannelId});
    }
  }
}
function appendBotMessage(text){
  const area=document.getElementById('messagesArea');
  const div=document.createElement('div');
  div.className='msg-group';
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,#7c6af7,#a855f7)">🎵</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-uname" style="color:#7c6af7">بات موزیک</span>
        <span class="msg-time">${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2,'0')}</span>
      </div>
      <div class="msg-text">${text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>
    </div>`;
  area.appendChild(div);area.scrollTop=area.scrollHeight;
}
function botPlayAudio(url){
  if(botAudio){botAudio.pause();}
  botAudio=new Audio(url);
  botAudio.crossOrigin='anonymous';
  botAudio.play().then(()=>{botPlaying=true;}).catch(e=>{
    appendBotMessage('❌ نتونستم پخش کنم — لینک مستقیم MP3 لازمه');
  });
}

// ─── SERVERS ─────────────────────────────────────────────────────────────────
async function loadServers(){
  try{
    const res=await fetch('/api/servers',{headers:{Authorization:`Bearer ${token}`}});
    const data=await res.json();
    if(data.ok){myServers=data.servers;renderServerBar();renderChannels();}
  }catch(e){renderServerBar();renderChannels();}
}
function renderServerBar(){
  const extra=document.getElementById('extraServers');extra.innerHTML='';
  myServers.forEach(s=>{
    const el=document.createElement('div');
    el.className='server-icon'+(s.id===currentServerId?' active':'');
    el.id=`si-${s.id}`;el.title=s.name;el.textContent=s.icon;
    el.onclick=()=>selectServer(s.id);extra.appendChild(el);
  });
}
async function selectServer(id){
  currentServerId=id;
  document.querySelectorAll('.server-icon').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById(`si-${id}`);if(el)el.classList.add('active');
  const srv=myServers.find(s=>s.id===id);
  document.getElementById('sidebarServerName').textContent=srv?.name||id;
  renderChannels();socket.emit('join_server',{serverId:id});
  await loadMembers(id);
}
async function loadMembers(serverId){
  try{
    const res=await fetch(`/api/servers/${serverId}/members`,{headers:{Authorization:`Bearer ${token}`}});
    const data=await res.json();
    if(data.ok){
      serverMembers[serverId]=data.members;
      const mine=data.members.find(m=>m.id===me?.id);
      myServerRole=mine?.serverRole||'member';
      renderMemberList();renderChannels();
    }
  }catch(e){}
}
function renderChannels(){
  const srv=myServers.find(s=>s.id===currentServerId);if(!srv)return;
  const textChs=srv.channels.filter(c=>c.type==='text');
  const voiceChs=srv.channels.filter(c=>c.type==='voice');
  const canAdd=['owner','admin'].includes(myServerRole);
  document.getElementById('channelList').innerHTML=`
    <div class="ch-group">
      <div class="ch-group-label"><span>▸ متنی</span>${canAdd?`<span class="ch-add" onclick="openModal('addChannelModal')">＋</span>`:''}</div>
      ${textChs.map(c=>`<div class="ch-item ${c.id===currentChannelId?'active':''}" onclick="selectChannel('${c.id}','${c.name}','text')"><span class="ch-icon">💬</span>${c.name}</div>`).join('')}
    </div>
    <div class="ch-group">
      <div class="ch-group-label"><span>▸ ویس</span>${canAdd?`<span class="ch-add" onclick="openModal('addChannelModal')">＋</span>`:''}</div>
      ${voiceChs.map(c=>`
        <div class="ch-item ${c.id===currentChannelId?'active':''}" onclick="selectChannel('${c.id}','${c.name}','voice')">
          <span class="ch-icon">🔊</span>${c.name}
          <div id="vul-${c.id}" class="voice-users-list"></div>
        </div>`).join('')}
    </div>`;
}
function selectChannel(id,name,type){
  currentChannelId=id;currentChannelType=type;
  document.getElementById('headerName').textContent=name;
  document.getElementById('headerIcon').textContent=type==='voice'?'🔊':'💬';
  document.getElementById('headerType').textContent=type==='voice'?'ویس':'متن';
  renderChannels();
  if(type==='voice'){
    document.getElementById('voiceView').classList.remove('hidden');
    document.getElementById('chatView').classList.add('hidden');
    document.getElementById('vcTitle').textContent=`🔊 ${name}`;
    joinVoice(id);
  }else{
    document.getElementById('voiceView').classList.add('hidden');
    document.getElementById('chatView').classList.remove('hidden');
    socket.emit('join_channel',{channelId:id});
  }
}

// ─── MESSAGING ────────────────────────────────────────────────────────────────
function sendMessage(){
  const inp=document.getElementById('msgInput');
  const text=inp.value.trim();if(!text||!socket)return;
  socket.emit('message',{channelId:currentChannelId,text});
  inp.value='';
}
function handleKey(e){if(e.key==='Enter')sendMessage();}
function handleTyping(){
  const now=Date.now();
  if(now-lastTypingSent>2000){lastTypingSent=now;socket?.emit('typing',{channelId:currentChannelId});}
}
function appendMessage(msg,noScroll=false){
  const area=document.getElementById('messagesArea');
  const time=new Date(msg.time);
  const ts=`${time.getHours()}:${String(time.getMinutes()).padStart(2,'0')}`;
  const div=document.createElement('div');div.className='msg-group';
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color},${msg.color}cc)">${msg.avatar}</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color}">${msg.username}</span>
        <span class="msg-time">${ts}</span>
      </div>
      <div class="msg-text">${escapeHtml(msg.text)}</div>
    </div>`;
  area.appendChild(div);if(!noScroll)area.scrollTop=area.scrollHeight;
}
function escapeHtml(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
let typingTimer=null;
function showTyping(username){
  const bar=document.getElementById('typingBar');
  bar.innerHTML=`${username} داره تایپ می‌کنه <span>•</span><span>•</span><span>•</span>`;
  clearTimeout(typingTimer);typingTimer=setTimeout(()=>{bar.innerHTML='';},3000);
}

// ─── VOICE ────────────────────────────────────────────────────────────────────
async function joinVoice(channelId){
  try{
    localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    startSpeakingDetection();
    socket.emit('join_voice',{channelId});currentVoiceId=channelId;
    showToast('به ویس پیوستی 🎤');
  }catch(e){
    showToast('دسترسی به میکروفون نبود');
    socket.emit('join_voice',{channelId});currentVoiceId=channelId;
  }
}
function startSpeakingDetection(){
  if(!localStream)return;
  try{
    audioContext=new AudioContext();
    const src=audioContext.createMediaStreamSource(localStream);
    analyserNode=audioContext.createAnalyser();analyserNode.fftSize=512;
    src.connect(analyserNode);
    const data=new Uint8Array(analyserNode.frequencyBinCount);
    let wasSpeaking=false;
    speakingInterval=setInterval(()=>{
      if(!analyserNode||isMuted)return;
      analyserNode.getByteFrequencyData(data);
      const avg=data.reduce((a,b)=>a+b,0)/data.length;
      const speaking=avg>12;
      if(speaking!==wasSpeaking){wasSpeaking=speaking;socket.emit('voice_speaking',{channelId:currentVoiceId,speaking});}
    },150);
  }catch(e){}
}
function leaveVoice(){
  if(currentVoiceId)socket.emit('leave_voice',{channelId:currentVoiceId});
  currentVoiceId=null;clearInterval(speakingInterval);
  if(audioContext){audioContext.close();audioContext=null;}
  Object.values(peerConnections).forEach(pc=>pc.close());peerConnections={};
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
  document.getElementById('voiceView').classList.add('hidden');
  document.getElementById('chatView').classList.remove('hidden');
  socket.emit('join_channel',{channelId:currentChannelId});
  showToast('از ویس خارج شدی');
}
function toggleVcMic(){
  isMuted=!isMuted;
  if(localStream)localStream.getAudioTracks().forEach(t=>{t.enabled=!isMuted;});
  const btn=document.getElementById('vcMuteBtn');
  btn.textContent=isMuted?'🔇':'🎤';
  btn.style.background=isMuted?'rgba(239,68,68,0.3)':'';
  socket.emit('voice_mute',{channelId:currentVoiceId,muted:isMuted});
  showToast(isMuted?'🔇 میکروفون خاموش':'🎤 میکروفون روشن');
}
function toggleDeafen(){
  isDeafened=!isDeafened;
  const btn=document.getElementById('deafenBtn');
  btn.textContent=isDeafened?'🔕':'🔊';
  btn.style.background=isDeafened?'rgba(239,68,68,0.3)':'';
  showToast(isDeafened?'🔕 صدا قطع':'🔊 صدا وصل');
}
function toggleMic(){
  isMuted=!isMuted;
  if(localStream)localStream.getAudioTracks().forEach(t=>{t.enabled=!isMuted;});
  document.getElementById('micBtn').textContent=isMuted?'🔇':'🎤';
  showToast(isMuted?'🔇 میوت شدی':'🎤 آنمیوت شدی');
}
function renderVoiceParticipants(users){
  const area=document.getElementById('vcParticipants');
  if(!users.length){area.innerHTML='<div style="color:var(--text-muted);font-size:14px">هنوز کسی نیست...</div>';return;}
  area.innerHTML=users.map(u=>`
    <div class="vc-user">
      <div class="vc-avatar ${u.speaking?'speaking':''}" data-uid="${u.id}" style="background:linear-gradient(135deg,${u.color},${u.color}cc)">
        ${u.muted?'🔇':u.avatar}
      </div>
      <div class="vc-uname">${u.username}${u.muted?' 🔇':''}</div>
    </div>`).join('');
}
function updateVoiceUsersSidebar(channelId,users){
  const el=document.getElementById(`vul-${channelId}`);if(!el)return;
  el.innerHTML=users.map(u=>`<div class="vu-item"><div class="vu-avatar" style="background:${u.color}">${u.muted?'🔇':u.avatar}</div>${u.username}</div>`).join('');
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
  list.innerHTML=members.map(u=>{
    const isOnline=!!onlineUsers[u.id];
    const roleIcon=u.serverRole==='owner'?'👑':u.serverRole==='admin'?'🛡️':u.serverRole==='mod'?'🔨':'';
    return `<div class="ml-user" onclick="openUserMenu('${u.id}','${u.username}','${u.serverRole||'member'}')">
      <div class="ml-avatar ${isOnline?'online':''}" style="background:${u.color}">${u.avatar}</div>
      <div><div class="ml-uname">${u.username} ${roleIcon}</div>
      <div style="font-size:11px;color:var(--text-muted)">${isOnline?'🟢 آنلاین':'⚫ آفلاین'}</div></div>
    </div>`;
  }).join('')||'<div style="color:var(--text-muted);font-size:13px;padding:8px">اعضایی نیست</div>';
}

// ─── USER MENU ───────────────────────────────────────────────────────────────
function openUserMenu(userId,username,role){
  if(userId===me?.id)return;
  const canMod=['owner','admin'].includes(myServerRole);
  if(!canMod){showToast('دسترسی نداری');return;}
  document.getElementById('ctxUsername').textContent=username;
  document.getElementById('ctxUserId').value=userId;
  document.getElementById('ctxUserRole').value=role;
  document.getElementById('roleSelect').value=role==='owner'?'admin':role||'member';
  openModal('userMenuModal');
}
async function setRole(){
  const uid=document.getElementById('ctxUserId').value;
  const role=document.getElementById('roleSelect').value;
  const res=await fetch(`/api/servers/${currentServerId}/members/${uid}/role`,{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body:JSON.stringify({role})
  });
  const data=await res.json();
  if(data.ok){closeModal('userMenuModal');showToast('رول تغییر کرد ✅');await loadMembers(currentServerId);}
  else showToast(data.msg||'خطا');
}
async function kickUser(){
  const uid=document.getElementById('ctxUserId').value;
  const name=document.getElementById('ctxUsername').textContent;
  if(!confirm(`${name} رو کیک کنی؟`))return;
  const res=await fetch(`/api/servers/${currentServerId}/members/${uid}/kick`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}});
  const data=await res.json();
  if(data.ok){closeModal('userMenuModal');showToast('کیک شد ✅');await loadMembers(currentServerId);}
  else showToast(data.msg||'خطا');
}
async function banUser(){
  const uid=document.getElementById('ctxUserId').value;
  const name=document.getElementById('ctxUsername').textContent;
  if(!confirm(`${name} رو بن کنی؟`))return;
  const res=await fetch(`/api/servers/${currentServerId}/members/${uid}/ban`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}});
  const data=await res.json();
  if(data.ok){closeModal('userMenuModal');showToast('بن شد ✅');await loadMembers(currentServerId);}
  else showToast(data.msg||'خطا');
}

// ─── SERVER MANAGEMENT ───────────────────────────────────────────────────────
async function createServer(){
  const name=document.getElementById('newServerName').value.trim();
  const icon=document.getElementById('newServerIcon').value.trim()||'🌟';
  if(!name){showToast('اسم سرور رو بنویس');return;}
  const res=await fetch('/api/servers',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({name,icon})});
  const data=await res.json();
  if(data.ok){
    myServers.push(data.server);renderServerBar();
    document.getElementById('inviteLink').textContent=`${location.origin}?join=${data.server.id}`;
    document.getElementById('serverInviteSection').style.display='block';
    document.getElementById('newServerName').value='';showToast('سرور ساخته شد! 🎉');
  }
}
function copyInvite(){navigator.clipboard.writeText(document.getElementById('inviteLink').textContent);showToast('لینک کپی شد ✅');}
async function joinServer(){
  const id=document.getElementById('joinServerId').value.trim();if(!id)return;
  const res=await fetch(`/api/servers/${id}/join`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}});
  const data=await res.json();
  if(data.ok){if(!myServers.find(s=>s.id===data.server.id))myServers.push(data.server);renderServerBar();closeModal('joinServerModal');selectServer(data.server.id);showToast(`به ${data.server.name} پیوستی!`);}
  else showToast(data.msg||'سرور پیدا نشد');
}
async function addChannel(){
  const name=document.getElementById('newChName').value.trim();
  const type=document.querySelector('input[name="chType"]:checked').value;
  if(!name){showToast('اسم کانال رو بنویس');return;}
  const res=await fetch(`/api/servers/${currentServerId}/channels`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({name,type})});
  const data=await res.json();
  if(data.ok){closeModal('addChannelModal');document.getElementById('newChName').value='';showToast(`کانال ${name} ساخته شد`);}
}
function openServerOptions(){openModal('joinServerModal');}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
async function saveProfile(){
  const bio=document.getElementById('profileBio').value;
  const status=document.getElementById('profileStatus').value;
  const res=await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({bio,status})});
  const data=await res.json();
  if(data.ok){me={...me,...data.user};localStorage.setItem('mahfel_user',JSON.stringify(me));updateMyUI();closeModal('profileModal');showToast('پروفایل ذخیره شد ✅');}
}

// ─── MUSIC PLAYER ─────────────────────────────────────────────────────────────
const audio=new Audio();
audio.addEventListener('ended',nextTrack);
audio.addEventListener('timeupdate',updateProgress);
function addMusic(){
  const url=document.getElementById('musicUrl').value.trim();if(!url){showToast('یه لینک بذار');return;}
  const name=url.split('/').pop()||'آهنگ جدید';
  tracks.push({name,url});document.getElementById('musicUrl').value='';
  renderMusicList();showToast('آهنگ اضافه شد');
  if(tracks.length===1)playTrack(0);
}
function renderMusicList(){
  const list=document.getElementById('musicList');
  if(!tracks.length){list.innerHTML='<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">لینک mp3 بذار</div>';return;}
  list.innerHTML=tracks.map((t,i)=>`
    <div class="track-item ${i===currentTrackIdx?'playing':''}" onclick="playTrack(${i})">
      <div class="track-num">${i===currentTrackIdx?'▶':(i+1)}</div>
      <div class="track-info"><div class="track-name">${t.name}</div></div>
      <div class="track-dur" style="cursor:pointer" onclick="removeTrack(event,${i})">✕</div>
    </div>`).join('');
}
function removeTrack(e,i){e.stopPropagation();tracks.splice(i,1);if(currentTrackIdx>=tracks.length)currentTrackIdx=0;renderMusicList();}
function playTrack(idx){currentTrackIdx=idx;audio.src=tracks[idx].url;audio.play().then(()=>{isPlaying=true;updatePlayBtn();}).catch(()=>{});renderMusicList();showToast(`▶ ${tracks[idx].name}`);}
function togglePlay(){if(audio.paused){audio.play();isPlaying=true;}else{audio.pause();isPlaying=false;}updatePlayBtn();}
function updatePlayBtn(){document.getElementById('playPauseBtn').textContent=isPlaying?'⏸':'▶';}
function prevTrack(){currentTrackIdx=(currentTrackIdx-1+tracks.length)%tracks.length;playTrack(currentTrackIdx);}
function nextTrack(){currentTrackIdx=(currentTrackIdx+1)%tracks.length;if(tracks.length>0)playTrack(currentTrackIdx);}
function updateProgress(){
  if(!audio.duration)return;
  document.getElementById('musicProgress').style.width=(audio.currentTime/audio.duration*100)+'%';
  document.getElementById('musicTime').textContent=`${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
}
function seekMusic(e){const bar=e.currentTarget.querySelector('.progress-bar');const rect=bar.getBoundingClientRect();audio.currentTime=((e.clientX-rect.left)/rect.width)*audio.duration;}
function fmtTime(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}

// ─── EMOJI ────────────────────────────────────────────────────────────────────
function buildEmojiPicker(){
  const p=document.getElementById('emojiPicker');
  p.innerHTML=EMOJIS.map(e=>`<div class="em" onclick="addEmoji('${e}')">${e}</div>`).join('');
}
let emojiOpen=false;
function toggleEmoji(){emojiOpen=!emojiOpen;document.getElementById('emojiPicker').classList.toggle('show',emojiOpen);}
function addEmoji(em){const inp=document.getElementById('msgInput');inp.value+=em;inp.focus();}
document.addEventListener('click',e=>{if(!e.target.closest('.input-area')){emojiOpen=false;document.getElementById('emojiPicker')?.classList.remove('show');}});

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id){
  document.getElementById(id).classList.remove('hidden');
  if(id==='musicModal')renderMusicList();
}
function closeModal(id){
  document.getElementById(id).classList.add('hidden');
  if(id==='createServerModal')document.getElementById('serverInviteSection').style.display='none';
}
document.querySelectorAll('.modal-overlay').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)closeModal(el.id);}));

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500);
}

// ─── INVITE ───────────────────────────────────────────────────────────────────
const inviteServerId=new URLSearchParams(location.search).get('join');
if(inviteServerId){
  window.addEventListener('load',()=>{
    setTimeout(async()=>{
      if(!token)return;
      const res=await fetch(`/api/servers/${inviteServerId}/join`,{method:'POST',headers:{'Authorization':`Bearer ${token}`}});
      const data=await res.json();
      if(data.ok){if(!myServers.find(s=>s.id===data.server.id))myServers.push(data.server);renderServerBar();selectServer(data.server.id);showToast(`به ${data.server.name} پیوستی! 🎉`);history.replaceState({},'','/');}
    },1500);
  });
}
