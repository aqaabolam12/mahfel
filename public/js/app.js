// gaphub v43 - audio throttle fix
// ═══════════════════════════════════════════════════════════
//  GapHub — APP.JS  v15
// ═══════════════════════════════════════════════════════════

// ─── STATE ───────────────────────────────────────────────────────────────────
let socket=null, me=null, token=null;
let currentServerId='default', currentChannelId='general', currentChannelType='text';
let currentVoiceId=null, myServerRole='member';
let onlineUsers={}, myServers=[], serverMembers={}, serverRoles={};
let peerConnections={}, localStream=null, peerAudios={}, socketUserMap={};
let isMuted=false, isDeafened=false;
let localMutes={}, localVolumes={}, voiceUsersCache={};
let audioCtx=null, analyser=null, speakTimer=null;
let tracks=[], trackIdx=0, isPlaying=false, botAudio=null;
let authMode='login', memberListOpen=false, lastTyping=0, emojiOpen=false;
let particleAnim=null, currentBgEffect='none';

const EMOJIS=['😀','😂','🥰','😎','🤔','😅','🙄','😭','🔥','❤️','👍','👎','🎉','🎵','🎮','💻','🌟','⚡','🚀','💡','🙏','👏','😍','🤣','😊','😇','🥳','😤','💪','🤝','🎯','🏆','💎','🌈','🦋','🐉'];

const THEMES={
  purple:{a:'#7c6af7',b:'#a855f7',bg:'#0a0a0f',chat:'#111120'},
  blue:  {a:'#3b82f6',b:'#06b6d4',bg:'#060e1a',chat:'#0a1425'},
  green: {a:'#22c55e',b:'#10b981',bg:'#060f0a',chat:'#091510'},
  red:   {a:'#ef4444',b:'#f97316',bg:'#120808',chat:'#180d0d'},
  pink:  {a:'#ec4899',b:'#f472b6',bg:'#120a12',chat:'#180e18'},
  dark:  {a:'#94a3b8',b:'#64748b',bg:'#080808',chat:'#0f0f0f'},
};

const BG_EFFECTS=[
  {id:'none',      icon:'⬛',name:'بدون افکت'},
  {id:'particles', icon:'✨',name:'ذرات نئونی'},
  {id:'honeycomb', icon:'⬡', name:'هانی‌کامب'},
  {id:'circuit',   icon:'⚡',name:'مدار الکترونیک'},
  {id:'grid3d',    icon:'🔲',name:'گرید 3D'},
  {id:'lightning', icon:'🌩',name:'رعد نئونی'},
  {id:'waves',     icon:'〰',name:'موج انرژی'},
  {id:'glitch',    icon:'📺',name:'گلیچ'},
  {id:'smoke',     icon:'🌫',name:'دود بنفش'},
  {id:'space',     icon:'🌌',name:'فضایی'},
];

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.onload=()=>{
  buildEmojiPicker();
  buildThemePicker();
  buildBgSelector();
  // autofill last username
  const lastUser=localStorage.getItem('lastUser');
  if(lastUser&&$('authUser'))$('authUser').value=lastUser;
  // icon quick pick - make each emoji clickable
  const qp=document.getElementById('iconQuickPick');
  if(qp){
    const emojis=qp.textContent.trim().split(/\s+/).filter(Boolean);
    qp.innerHTML=emojis.map(e=>`<span onclick="selectServerEmoji('${e}')">${e}</span>`).join('');
  }
  const t=localStorage.getItem('mt'), u=localStorage.getItem('mu');
  if(t&&u){token=t;me=JSON.parse(u);startApp();}
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function switchTab(mode){
  authMode=mode;
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(i===0&&mode==='login')||(i===1&&mode==='register')));
  $('authError').textContent='';
}
async function doAuth(){
  const u=$('authUser').value.trim(), p=$('authPass').value.trim();
  if(!u||!p){showErr('نام‌کاربری و رمز الزامیه');return;}
  try{
    const d=await post(authMode==='login'?'/api/login':'/api/register',{username:u,password:p},false);
    if(!d.ok){showErr(d.msg);return;}
    me=d.user;token=d.token;
    const remember=$('rememberMe')?.checked!==false;
    if(remember){
      localStorage.setItem('mt',token);
      localStorage.setItem('mu',JSON.stringify(me));
      // ذخیره username برای autofill
      localStorage.setItem('lastUser',u);
    }
    startApp();
  }catch(e){showErr('خطا در اتصال');}
}
function showErr(m){$('authError').textContent=m;}
function doLogout(){localStorage.clear();location.reload();}

function startApp(){
  $('authScreen').classList.add('hidden');
  $('app').classList.remove('hidden');
  applyTheme(localStorage.getItem('mtheme')||'purple');
  applyBgEffect(localStorage.getItem('gaphub_bg')||'none');
  connectSocket();updateMyUI();loadServers();
  setTimeout(startPingMonitor, 3000);

}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const $=id=>document.getElementById(id);
function setText(id,v){const e=$(id);if(e)e.textContent=v;}
function setVal(id,v){const e=$(id);if(e)e.value=v;}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
async function api(url,method='GET',body=null){
  const o={method,headers:{'Authorization':`Bearer ${token}`}};
  if(body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body);}
  const r=await fetch(url,o);return r.json();
}
async function post(url,body,auth=true){
  const h={'Content-Type':'application/json'};
  if(auth)h['Authorization']=`Bearer ${token}`;
  const r=await fetch(url,{method:'POST',headers:h,body:JSON.stringify(body)});
  return r.json();
}

// ─── THEME ────────────────────────────────────────────────────────────────────
function buildThemePicker(){
  const c=$('themeColors');if(!c)return;
  c.innerHTML=Object.entries(THEMES).map(([name,t])=>`
    <div class="theme-dot ${(localStorage.getItem('mtheme')||'purple')===name?'active':''}"
      style="background:linear-gradient(135deg,${t.a},${t.b})"
      onclick="setTheme('${name}')" title="${name}"></div>`).join('');
}
function setTheme(name){
  applyTheme(name);localStorage.setItem('mtheme',name);
  document.querySelectorAll('.theme-dot').forEach((d,i)=>d.classList.toggle('active',Object.keys(THEMES)[i]===name));
  showToast('تم تغییر کرد ✅');
}
function applyTheme(name){
  const t=THEMES[name]||THEMES.purple,s=document.documentElement.style;
  s.setProperty('--accent',t.a);s.setProperty('--accent2',t.b);
  s.setProperty('--bg-deep',t.bg);s.setProperty('--bg-chat',t.chat);
  s.setProperty('--accent-glow',t.a+'44');
}

// ─── BG EFFECTS ───────────────────────────────────────────────────────────────
function buildBgSelector(){
  const c=$('bgEffectSelector');if(!c)return;
  const cur=localStorage.getItem('gaphub_bg')||'none';
  c.innerHTML=BG_EFFECTS.map(e=>`
    <div class="effect-card ${cur===e.id?'active':''}" onclick="setBgEffect('${e.id}')">
      <div class="e-icon">${e.icon}</div>
      <div>${e.name}</div>
    </div>`).join('');
}
function setBgEffect(id){
  currentBgEffect=id;localStorage.setItem('gaphub_bg',id);
  applyBgEffect(id);buildBgSelector();
  showToast(BG_EFFECTS.find(e=>e.id===id)?.name+' فعال شد');
}
function applyBgEffect(id){
  document.body.removeAttribute('data-theme');
  $('lightningBg').classList.add('hidden');
  $('energyWaves').classList.add('hidden');
  const cv=$('particleCanvas');cv.style.display='none';
  if(particleAnim){cancelAnimationFrame(particleAnim);particleAnim=null;}
  currentBgEffect=id;
  switch(id){
    case 'particles':startParticles('neon');break;
    case 'honeycomb':document.body.setAttribute('data-theme','honeycomb');break;
    case 'circuit':document.body.setAttribute('data-theme','circuit');break;
    case 'grid3d':document.body.setAttribute('data-theme','grid3d');break;
    case 'lightning':$('lightningBg').classList.remove('hidden');startParticles('lightning');break;
    case 'waves':$('energyWaves').classList.remove('hidden');break;
    case 'glitch':startParticles('glitch');break;
    case 'smoke':startParticles('smoke');break;
    case 'space':startParticles('space');break;
  }
}
function startParticles(type){
  const cv=$('particleCanvas');cv.style.display='block';
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  window.onresize=()=>{cv.width=window.innerWidth;cv.height=window.innerHeight;};
  const ctx=cv.getContext('2d');
  const COLS={neon:['#7c6af7','#a855f7','#06b6d4'],lightning:['#7c6af7','#fff','#a855f7'],
    glitch:['#ff00ff','#00ffff','#7c6af7'],smoke:['rgba(124,106,247,0.08)','rgba(168,85,247,0.06)'],space:['#fff','#7c6af7','#a855f7','#06b6d4']};
  const cols=COLS[type]||COLS.neon;
  const N=type==='space'?150:type==='smoke'?25:50;
  const pts=Array.from({length:N},()=>({
    x:Math.random()*cv.width,y:Math.random()*cv.height,
    r:type==='space'?Math.random()*1.5+.5:type==='smoke'?Math.random()*50+20:Math.random()*2+1,
    c:cols[Math.floor(Math.random()*cols.length)],
    vx:(Math.random()-.5)*(type==='smoke'?.2:.4),
    vy:type==='smoke'?-.2:type==='space'?Math.random()*.15-.075:(Math.random()-.5)*.4,
    p:Math.random()*Math.PI*2,ps:.015+Math.random()*.02
  }));
  function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    pts.forEach(p=>{
      p.p+=p.ps;
      const a=type==='space'?.3+Math.sin(p.p)*.4:type==='smoke'?.04+Math.sin(p.p)*.02:.25+Math.sin(p.p)*.25;
      ctx.save();ctx.globalAlpha=a;
      if(type==='smoke'){
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
        g.addColorStop(0,p.c);g.addColorStop(1,'transparent');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }else if(type==='glitch'&&Math.random()>.96){
        ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,Math.random()*40+5,Math.random()*3+1);
      }else{
        ctx.shadowBlur=type==='space'?4:12;ctx.shadowColor=p.c;
        ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=cv.width;if(p.x>cv.width)p.x=0;
      if(p.y<0)p.y=cv.height;if(p.y>cv.height)p.y=0;
    });
    particleAnim=requestAnimationFrame(draw);
  }
  draw();
}

// ─── MY UI ────────────────────────────────────────────────────────────────────
function updateMyUI(){
  if(!me)return;
  const av=me.avatarUrl?`<img src="${me.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span>${me.avatar}</span>`;
  [$('myAvatarEl'),$('myAvatarSmall')].forEach(el=>{if(el){el.innerHTML=av;el.style.background=me.color;}});
  [$('profileAvatarBig')].forEach(el=>{if(el){el.innerHTML=av;el.style.background=me.color;}});
  setText('myUsernameEl',me.username);setText('myStatusEl',me.status||'آنلاین');
  setText('profileUsernameDisplay',me.username);
  setVal('profileBio',me.bio||'');setVal('profileStatus',me.status||'آنلاین');
}

// ─── AVATAR UPLOAD ────────────────────────────────────────────────────────────
function uploadAvatar(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const dataUrl=ev.target.result;
    me.avatarUrl=dataUrl;
    updateMyUI();
    // Save to server
    api('/api/users/me','PATCH',{avatarUrl:dataUrl}).then(d=>{
      if(d.ok){me={...me,...d.user};localStorage.setItem('mu',JSON.stringify(me));showToast('عکس پروفایل آپلود شد ✅');}
    });
  };
  reader.readAsDataURL(file);
}

// ─── SOCKET ───────────────────────────────────────────────────────────────────
function connectSocket(){
  socket=io({auth:{token}});
  socket.on('connect_error',e=>{if(e.message==='auth'){localStorage.clear();location.reload();}});
  socket.on('connect',()=>socket.emit('join_channel',{channelId:'general'}));
  socket.on('message',({channelId,msg})=>{if(channelId===currentChannelId){appendMessage(msg);handleBotCmd(msg);}});
  socket.on('history',({channelId,messages})=>{
    if(channelId!==currentChannelId)return;
    const a=$('messagesArea');a.innerHTML='';
    if(!messages.length)a.innerHTML='<div class="sys-msg">اولین پیام رو بفرست! 👋</div>';
    else messages.forEach(m=>appendMessage(m,true));
    a.scrollTop=a.scrollHeight;
  });
  socket.on('typing',({username,channelId})=>{
    if(channelId===currentChannelId&&username!==me?.username)showTyping(username);
  });
  socket.on('user_online',u=>{onlineUsers[u.id]=u;renderMemberList();});
  socket.on('user_offline',({id})=>{delete onlineUsers[id];renderMemberList();});
  socket.on('voice_update',({channelId,users})=>{
    voiceUsersCache[channelId]=users;
    updateVoiceSidebar(channelId,users);
    if(channelId===currentVoiceId)renderVcUsers(users);
  });
  socket.on('voice_speaking',({userId,speaking})=>{
    document.querySelectorAll(`.vc-avatar[data-uid="${userId}"]`).forEach(el=>el.classList.toggle('speaking',speaking&&!localMutes[userId]));
  });
  socket.on('channel_created',ch=>{
    const s=myServers.find(s=>s.id===ch.serverId);
    if(s&&!s.channels.find(c=>c.id===ch.id))s.channels.push(ch);
    if(ch.serverId===currentServerId)renderChannels();
  });
  socket.on('role_update',({serverId,userId,role})=>{
    if(userId===me?.id&&serverId===currentServerId)myServerRole=role;
    const m=serverMembers[serverId]?.find(m=>m.id===userId);if(m)m.serverRole=role;
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
  socket.on('force_move',({channelId})=>{
    const s=myServers.find(s=>s.id===currentServerId);
    const ch=s?.channels.find(c=>c.id===channelId);
    if(ch){showToast(`📡 ادمین تو رو به ${ch.name} منتقل کرد`);selectChannel(channelId,ch.name,'voice');}
  });
  socket.on('bot_play',({title,url,requestedBy})=>{
    const p=title.split('—');
    appendBotMsg(`🎵 **${p[0]?.trim()||title}**\nدرخواست از ${requestedBy}`,{title:p[0]?.trim()||title,url});
    if(botAudio){botAudio.pause();botAudio=null;}
    botAudio=new Audio(url);botAudio.crossOrigin='anonymous';
    botAudio.play().catch(()=>appendBotMsg('❌ پخش نشد'));
  });
  socket.on('bot_stop',()=>{if(botAudio){botAudio.pause();botAudio=null;}appendBotMsg('⏹ متوقف شد');});
  socket.on('bot_message',({text})=>appendBotMsg(text));
  socket.on('roles_updated',({serverId,roles})=>{serverRoles[serverId]=roles;});
  // WebRTC - existing users tell new joiner who's there
  socket.on('voice_existing_users',async({users})=>{
    console.log('existing users in voice:', users.length);
    for(const {user:u,socketId} of users){
      if(!socketId||socketId===socket.id)continue;
      socketUserMap[socketId]=u.id;
      const pc=newPC(socketId,u.id);
      // New user also adds tracks and sends offer
      if(localStream){
        localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
        try{
          const offer=await pc.createOffer({offerToReceiveAudio:true});
          await pc.setLocalDescription(offer);
          socket.emit('rtc_offer',{to:socketId,offer});
          console.log('Sent offer to existing user:', socketId.slice(0,6));
        }catch(e){console.error('offer to existing error',e);}
      }
    }
  });

  // Existing user initiates offer to new joiner
  socket.on('voice_user_joined',async({user:u,socketId})=>{
    if(!localStream)return;
    socketUserMap[socketId]=u.id;
    const pc=newPC(socketId,u.id);
    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    try{
      const offer=await pc.createOffer({offerToReceiveAudio:true});
      await pc.setLocalDescription(offer);
      socket.emit('rtc_offer',{to:socketId,offer});
    }catch(e){console.error('offer error',e);}
  });

  socket.on('rtc_offer',async({from,offer})=>{
    socketUserMap[from]=socketUserMap[from]||null;
    let pc=peerConnections[from];
    if(!pc) pc=newPC(from,socketUserMap[from]);
    if(localStream) localStream.getTracks().forEach(t=>{
      if(!pc.getSenders().find(s=>s.track===t)) pc.addTrack(t,localStream);
    });
    try{
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const ans=await pc.createAnswer();
      await pc.setLocalDescription(ans);
      socket.emit('rtc_answer',{to:from,answer:ans});
    }catch(e){console.error('answer error',e);}
  });

  socket.on('rtc_answer',async({from,answer})=>{
    const pc=peerConnections[from];
    if(pc&&pc.signalingState!=='stable'){
      try{await pc.setRemoteDescription(new RTCSessionDescription(answer));}catch(e){}
    }
  });
  socket.on('rtc_candidate',async({from,candidate})=>{
    const pc=peerConnections[from];
    if(pc&&candidate){try{await pc.addIceCandidate(new RTCIceCandidate(candidate));}catch(e){}}
  });
  socket.on('force_disconnect_voice',()=>{if(currentVoiceId){leaveVoice();showToast('⚡ ادمین تو رو از ویس دیسکانکت کرد');}});

  // Audio relay from server
  socket.on('audio_chunk',({from,userId,chunk,sampleRate})=>{
    if(userId===me?.id||isDeafened)return;
    playRelayedAudio(userId,new Int16Array(chunk),sampleRate||24000);
  });
  socket.on('server_updated',({serverId,name,icon,iconUrl})=>{
    const srv=myServers.find(s=>s.id===serverId);
    if(srv){srv.name=name;srv.icon=icon;srv.iconUrl=iconUrl;renderServerBar();}
    if(serverId===currentServerId)setText('sidebarServerName',name);
  });
  socket.on('server_deleted',({serverId})=>{
    myServers=myServers.filter(s=>s.id!==serverId);renderServerBar();
    if(currentServerId===serverId)selectServer('default');
  });

  // Screen share signaling
  socket.on('screen_share_started',async({userId,username,socketId})=>{
    showToast(`🖥 ${username} داره صفحه‌ش رو نشون میده`);
    setText('ssUsername',`🖥 ${username}`);
    $('screenShareArea')?.classList.remove('hidden');
    $('vcScreenGrid')?.classList.remove('hidden');
    $('voiceView')?.classList.add('has-share');
    // Create PC to receive
    const pc=await createScreenPC(socketId,false);
    socket.emit('screen_request',{to:socketId});
  });
  socket.on('screen_share_stopped',()=>{
    $('vcScreenGrid')?.classList.add('hidden');
    $('voiceView')?.classList.remove('has-share');
    const v=$('screenShareVideo');if(v){v.srcObject=null;}
    Object.values(screenPCs).forEach(pc=>pc.close());
    Object.keys(screenPCs).forEach(k=>delete screenPCs[k]);
    showToast('🖥 اشتراک صفحه تموم شد');
  });
  socket.on('screen_request',async({from})=>{
    if(!isSharing||!screenStream)return;
    await createScreenPC(from,true);
  });
  socket.on('screen_offer',async({from,offer})=>{
    let pc=screenPCs[from];
    if(!pc)pc=await createScreenPC(from,false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('screen_answer',{to:from,answer});
  });
  socket.on('screen_answer',async({from,answer})=>{
    const pc=screenPCs[from];
    if(pc)await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });
  socket.on('screen_ice',async({from,candidate})=>{
    const pc=screenPCs[from];
    if(pc&&candidate)await pc.addIceCandidate(new RTCIceCandidate(candidate));
  });
}

// ─── WEBRTC ───────────────────────────────────────────────────────────────────
// ─── SOCKET.IO AUDIO SYSTEM (no WebRTC) ──────────────────────────────────────
let audioCtxRelay = null;
let audioSender = null;
let audioReceivers = {}; // { userId: AudioContext }
const SAMPLE_RATE = 24000;
const BUFFER_SIZE = 2048;

function newPC(sid, uid) {
  // Stub - kept for compatibility but not used
  socketUserMap[sid] = uid;
  return { 
    addTrack:()=>{}, 
    createOffer:()=>Promise.resolve({}),
    createAnswer:()=>Promise.resolve({}),
    setLocalDescription:()=>Promise.resolve(),
    setRemoteDescription:()=>Promise.resolve(),
    addIceCandidate:()=>Promise.resolve(),
    close:()=>{},
    getSenders:()=>[],
    connectionState:'connected',
    iceConnectionState:'connected',
    signalingState:'stable',
    restartIce:()=>{},
    onicecandidate:null,
    ontrack:null,
    onconnectionstatechange:null,
    oniceconnectionstatechange:null,
  };
}

function startAudioRelay() {
  if (!localStream) return;
  stopAudioRelay();
  try {
    // Use lower sample rate for less delay
    audioCtxRelay = new AudioContext({ latencyHint: 'interactive' }); // use default sample rate
    const src = audioCtxRelay.createMediaStreamSource(localStream);
    // 256 samples = ~16ms at 16000Hz (much less delay than 1024)
    const processor = audioCtxRelay.createScriptProcessor(1024, 1, 1);
    src.connect(processor);
    processor.connect(audioCtxRelay.destination);
    
    processor.onaudioprocess = (e) => {
      if (!currentVoiceId || isMuted || !socket.connected) return;
      const input = e.inputBuffer.getChannelData(0);
      
      // RMS check
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      if (Math.sqrt(sum / input.length) < 0.002) return;
      
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, input[i] * 32767));
      }
      socket.emit('audio_chunk', {
        channelId: currentVoiceId,
        chunk: Array.from(int16),
        sampleRate: audioCtxRelay.sampleRate
      });
    };
    
    audioSender = processor;
    console.log('✅ Audio relay started - low latency mode');
  } catch(e) {
    console.error('Audio relay error:', e);
  }
}

function stopAudioRelay() {
  if (audioSender) { audioSender.disconnect(); audioSender = null; }
  if (audioCtxRelay) { audioCtxRelay.close(); audioCtxRelay = null; }
}

const nextPlayTime = {};

function playRelayedAudio(userId, int16Data, sampleRate) {
  if (isDeafened) return;
  const vol = localMutes[userId] ? 0 : (localVolumes[userId] ?? 1);
  
  try {
    if (!audioReceivers[userId]) {
      audioReceivers[userId] = new AudioContext({ latencyHint: 'interactive' });
      nextPlayTime[userId] = 0;
    }
    const ctx = audioReceivers[userId];
    if (ctx.state === 'suspended') ctx.resume();
    
    const buf = ctx.createBuffer(1, int16Data.length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < int16Data.length; i++) {
      data[i] = int16Data[i] / 32767;
    }
    
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    // Minimal jitter buffer - only 20ms ahead
    if (!nextPlayTime[userId] || nextPlayTime[userId] < now - 0.1) {
      nextPlayTime[userId] = now + 0.02;
    }
    src.start(nextPlayTime[userId]);
    nextPlayTime[userId] += buf.duration;
  } catch(e) {}
}

// ─── VOICE ────────────────────────────────────────────────────────────────────
async function joinVoice(channelId){
  const savedMic=localStorage.getItem('gaphub_mic')||'';
  if(savedMic) selectedMicId=savedMic;
  
  try{
    const nc=localStorage.getItem('gaphub_nc')!=='0';
    const ag=localStorage.getItem('gaphub_ag')!=='0';
    const ec=localStorage.getItem('gaphub_ec')!=='0';
    const micId=localStorage.getItem('gaphub_mic')||'';
    const audioOpts={
      echoCancellation:ec,
      noiseSuppression:nc,
      autoGainControl:ag,
      sampleRate:24000,
    };
    if(micId) audioOpts.deviceId={ideal:micId};
    localStream=await navigator.mediaDevices.getUserMedia({audio:audioOpts});
    console.log('✅ Got mic');
    startSpeakDetect();
    startAudioRelay();
    socket.emit('join_voice',{channelId});
    currentVoiceId=channelId;
    playTone([523,659,784]);
    showToast('🎤 به ویس پیوستی');
  }catch(e){
    console.error('Mic error:', e);
    try{
      localStream=await navigator.mediaDevices.getUserMedia({audio:true});
      startSpeakDetect();
      startAudioRelay();
    }catch(e2){
      showToast('⚠️ میکروفون پیدا نشد');
    }
    socket.emit('join_voice',{channelId});
    currentVoiceId=channelId;
  }
}
function startSpeakDetect(){
  if(!localStream)return;
  try{
    audioCtx=new AudioContext();
    const src=audioCtx.createMediaStreamSource(localStream);
    analyser=audioCtx.createAnalyser();analyser.fftSize=512;src.connect(analyser);
    const buf=new Uint8Array(analyser.frequencyBinCount);
    let was=false;
    speakTimer=setInterval(()=>{
      if(!analyser||isMuted)return;
      analyser.getByteFrequencyData(buf);
      const avg=buf.reduce((a,b)=>a+b,0)/buf.length;
      const speaking=avg>12;
      if(speaking!==was){was=speaking;socket.emit('voice_speaking',{channelId:currentVoiceId,speaking});}
    },150);
  }catch(e){}
}
function leaveVoice(){
  if(currentVoiceId)socket.emit('leave_voice',{channelId:currentVoiceId});
  stopAudioRelay();
  clearInterval(speakTimer);if(audioCtx){audioCtx.close();audioCtx=null;analyser=null;}
  // Close audio receivers
  Object.values(audioReceivers).forEach(ctx=>{try{ctx.close();}catch(e){}});
  Object.keys(audioReceivers).forEach(k=>delete audioReceivers[k]);
  Object.values(peerConnections).forEach(pc=>{try{pc.close();}catch(e){}});peerConnections={};
  Object.values(peerAudios).forEach(a=>{try{a.pause();a.remove();}catch(e){}});peerAudios={};
  if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
  currentVoiceId=null;
  $('voiceView').classList.add('hidden');$('chatView').classList.remove('hidden');
  socket.emit('join_channel',{channelId:currentChannelId});
  playTone([784,523]);showToast('📵 از ویس خارج شدی');
}
function toggleVcMic(){
  isMuted=!isMuted;
  if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=!isMuted);
  const b=$('vcMuteBtn');if(b){b.classList.toggle('muted',isMuted);}
  socket.emit('voice_mute',{channelId:currentVoiceId,muted:isMuted});
  showToast(isMuted?'🔇 میوت':'🎤 آنمیوت');
}
function toggleMic(){
  isMuted=!isMuted;
  if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=!isMuted);
  const b=$('micBtn');if(b)b.textContent=isMuted?'🔇':'🎤';
}
function toggleDeafen(){
  isDeafened=!isDeafened;Object.values(peerAudios).forEach(a=>a.muted=isDeafened);
  const b=$('deafenBtn');if(b){b.classList.toggle('muted',isDeafened);}
  showToast(isDeafened?'🔕 صدا قطع':'🔊 صدا وصل');
}
function setLocalVolume(uid,vol){
  localVolumes[uid]=Math.max(0,Math.min(1,parseFloat(vol)));
  document.querySelectorAll('audio').forEach(a=>{if(a.dataset.userId===uid)a.volume=localMutes[uid]?0:localVolumes[uid];});
  const l=document.getElementById(`vl-${uid}`);if(l)l.textContent=Math.round(localVolumes[uid]*100)+'%';
}
function changeVolume(uid,delta){
  const cur=Math.round((localVolumes[uid]??1)*100);
  const newVol=Math.max(0,Math.min(100,cur+delta));
  setLocalVolume(uid,newVol/100);
}
function toggleLocalMute(uid){
  localMutes[uid]=!localMutes[uid];const vol=localVolumes[uid]??1;
  document.querySelectorAll('audio').forEach(a=>{if(a.dataset.userId===uid)a.volume=localMutes[uid]?0:vol;});
  renderVcUsers(voiceUsersCache[currentVoiceId]||[]);
}
function renderVcUsers(users){
  const a=$('vcParticipants');if(!a)return;
  if(!users.length){a.innerHTML='<div style="color:var(--muted);text-align:center;padding:40px">🎤 هنوز کسی نیست</div>';return;}
  a.innerHTML=users.map(u=>{
    const isMe=u.id===me?.id,lm=!!localMutes[u.id],vol=localVolumes[u.id]??1;
    const avatarContent=u.avatarUrl?`<img src="${u.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(u.muted||lm?'🔇':u.avatar);
    return `<div class="vc-card">
      <div class="vc-avatar ${u.speaking&&!lm?'speaking':''}" data-uid="${u.id}"
        style="background:linear-gradient(135deg,${u.color},${u.color}bb);${lm?'filter:grayscale(.8);opacity:.5':''}">
        ${avatarContent}
      </div>
      <div class="vc-name">${u.username}${u.muted?' 🔇':''}</div>
      ${!isMe?`<div class="vc-vol-row">
        <button id="lm-${u.id}" class="lmute-btn ${lm?'muted':''}" onclick="toggleLocalMute('${u.id}')">${lm?'🔇':'🔊'}</button>
        <input type="range" class="vol-slider" min="0" max="100" value="${Math.round(vol*100)}" oninput="setLocalVolume('${u.id}',this.value/100)">
        <span id="vl-${u.id}" class="vol-lbl">${Math.round(vol*100)}%</span>
      </div>`:'<div class="vc-me-tag">شما</div>'}
    </div>`;
  }).join('');
}
function updateVoiceSidebar(channelId,users){
  const el=document.getElementById(`vul-${channelId}`);if(!el)return;
  el.innerHTML=users.map(u=>`<div class="vu-item">
    <div class="vu-avatar" style="background:${u.color}">${u.muted?'🔇':u.avatar}</div>${u.username}
  </div>`).join('');
}
function playTone(freqs){
  try{
    const ctx=new AudioContext();
    freqs.forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.frequency.value=f;
      g.gain.setValueAtTime(.2,ctx.currentTime+i*.12);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.12+.3);
      o.start(ctx.currentTime+i*.12);o.stop(ctx.currentTime+i*.12+.3);
    });
  }catch(e){}
}

// ─── SERVERS ─────────────────────────────────────────────────────────────────
async function loadServers(){
  try{const d=await api('/api/servers');if(d.ok){myServers=d.servers;renderServerBar();renderChannels();}}
  catch(e){renderServerBar();renderChannels();}
}
function renderServerBar(){
  const c=$('serverIcons');c.innerHTML='';
  myServers.forEach(s=>{
    const el=document.createElement('div');
    el.className='server-icon'+(s.id===currentServerId?' active':'');
    el.id=`si-${s.id}`;el.title=s.name;
    if(s.iconUrl){
      el.style.padding='0';el.style.overflow='hidden';
      el.innerHTML=`<img src="${s.iconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    }else{
      el.innerHTML=`<span style="font-size:18px">${s.icon||'🌟'}</span>`;
    }
    el.onclick=()=>selectServer(s.id);c.appendChild(el);
  });
}
async function selectServer(id){
  currentServerId=id;
  document.querySelectorAll('.server-icon').forEach(e=>e.classList.remove('active'));
  document.getElementById(`si-${id}`)?.classList.add('active');
  setText('sidebarServerName',myServers.find(s=>s.id===id)?.name||id);
  renderChannels();socket.emit('join_server',{serverId:id});
  await loadMembers(id);await loadServerRoles(id);
}
async function loadMembers(sid){
  try{
    const d=await api(`/api/servers/${sid}/members`);
    if(d.ok&&d.members){
      serverMembers[sid]=d.members;
      const mine=d.members.find(m=>m.id===me?.id);
      myServerRole=mine?.serverRole||'member';
      renderMemberList();renderChannels();
    }
  }catch(e){console.error('loadMembers error:',e);}
}
function renderChannels(){
  const srv=myServers.find(s=>s.id===currentServerId);if(!srv)return;
  const canAdd=['owner','admin'].includes(myServerRole);
  $('channelList').innerHTML=`
    <div class="ch-group">
      <div class="ch-label"><span>▸ متنی</span>${canAdd?`<span class="ch-add-btn" onclick="openModal('addChannelModal')">＋</span>`:''}</div>
      ${srv.channels.filter(c=>c.type==='text').map(c=>`
        <div class="ch-item${c.id===currentChannelId?' active':''}" onclick="selectChannel('${c.id}','${c.name}','text')">
          <span class="ch-icon">＃</span>${c.name}
        </div>`).join('')}
    </div>
    <div class="ch-group">
      <div class="ch-label"><span>▸ ویس</span>${canAdd?`<span class="ch-add-btn" onclick="openModal('addChannelModal')">＋</span>`:''}</div>
      ${srv.channels.filter(c=>c.type==='voice').map(c=>`
        <div class="ch-item${c.id===currentChannelId?' active':''}" onclick="selectChannel('${c.id}','${c.name}','voice')">
          <span class="ch-icon">🔊</span>${c.name}
          <div id="vul-${c.id}" class="voice-users-list"></div>
        </div>`).join('')}
    </div>`;
}
function selectChannel(id,name,type){
  currentChannelId=id;currentChannelType=type;
  setText('headerName',name);setText('headerIcon',type==='voice'?'🔊':'＃');
  setText('headerType',type==='voice'?'ویس':'متن');renderChannels();
  if(type==='voice'){
    $('voiceView').classList.remove('hidden');$('chatView').classList.add('hidden');
    setText('vcTitle',`🔊 ${name}`);joinVoice(id);
  }else{
    $('voiceView').classList.add('hidden');$('chatView').classList.remove('hidden');
    socket.emit('join_channel',{channelId:id});
  }
}

// ─── MEMBER LIST ─────────────────────────────────────────────────────────────
function toggleMemberList(){
  if(window.innerWidth<=768){
    toggleMemberListMobile();
    return;
  }
  memberListOpen=!memberListOpen;
  $('memberList').classList.toggle('hidden',!memberListOpen);
  if(memberListOpen)renderMemberList();
}
function renderMemberList(){
  const list=$('memberItems');
  const members=serverMembers[currentServerId]||[];
  const canMod=['owner','admin'].includes(myServerRole);

  const online=members.filter(u=>!!onlineUsers[u.id]);
  const offline=members.filter(u=>!onlineUsers[u.id]);

  function memberCard(u){
    const isOnline=!!onlineUsers[u.id];
    const ri=u.serverRole==='owner'?'👑':u.serverRole==='admin'?'🛡':u.serverRole==='mod'?'🔨':'';
    const customRoles=(serverRoles[currentServerId]||[]).filter(r=>u.roles?.includes(r.id));
    const roleTag=customRoles.map(r=>`<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');
    const av=u.avatarUrl?`<img src="${u.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span>${u.avatar}</span>`;
    const clickable=canMod&&u.id!==me?.id;
    return `<div class="ml-user" onclick="${clickable?`openUserMenu('${u.id}','${u.username}','${u.serverRole||'member'}','${u.color}')`:''}"
      style="${clickable?'cursor:pointer':''}; opacity:${isOnline?1:0.45}">
      <div class="ml-avatar ${isOnline?'online':''}" style="background:${u.color}">${av}</div>
      <div style="min-width:0;flex:1">
        <div class="ml-uname">${u.username} ${ri}</div>
        <div style="font-size:10px;color:var(--muted)">${u.status||'آنلاین'}</div>
        ${roleTag?`<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px">${roleTag}</div>`:''}
      </div>
    </div>`;
  }

  let html='';

  if(online.length){
    html+=`<div class="ml-section-title">🟢 آنلاین — ${online.length}</div>`;
    html+=online.map(memberCard).join('');
  }

  if(offline.length){
    html+=`<div class="ml-section-title" style="margin-top:12px">⚫ آفلاین — ${offline.length}</div>`;
    html+=offline.map(memberCard).join('');
  }

  list.innerHTML=html||'<div style="color:var(--muted);padding:8px;font-size:13px">اعضایی نیست</div>';
}

// ─── USER MENU ───────────────────────────────────────────────────────────────
function openUserMenu(uid,name,role,color){
  setText('ctxUsername',name);setVal('ctxUserId',uid);setVal('ctxUserRole',role);setVal('roleSelect',role==='owner'?'admin':role||'member');
  const av=$('ctxAvatar');if(av){av.style.background=color||'var(--accent)';av.textContent=name[0]?.toUpperCase();}
  // Show custom roles
  const roles=serverRoles[currentServerId]||[];
  const member=serverMembers[currentServerId]?.find(m=>m.id===uid);
  $('ctxCustomRoles').innerHTML=roles.length?roles.map(r=>`
    <div class="role-item" style="cursor:pointer" onclick="toggleCustomRole('${uid}','${r.id}')">
      <div class="role-dot" style="background:${r.color}"></div>
      <div class="role-name">${r.name}</div>
      <span style="margin-right:auto;font-size:18px">${member?.roles?.includes(r.id)?'✅':''}</span>
    </div>`).join('')
    :'<div style="color:var(--muted);font-size:12px;text-align:center;padding:10px">هنوز رولی نساختی</div>';
  openModal('userMenuModal');
}
async function setRole(){
  const uid=$('ctxUserId').value,role=$('roleSelect').value;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/role`,'POST',{role});
  if(d.ok){closeModal('userMenuModal');showToast('رول تغییر کرد ✅');await loadMembers(currentServerId);}
  else showToast(d.msg||'خطا');
}
async function toggleCustomRole(uid,roleId){
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/assign-role`,'POST',{roleId});
  if(d.ok){await loadMembers(currentServerId);openUserMenu(uid,$('ctxUsername').textContent,$('ctxUserRole').value);}
}
async function kickUser(){
  const uid=$('ctxUserId').value,name=$('ctxUsername').textContent;
  if(!confirm(`${name} رو کیک کنی؟`))return;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/kick`,'POST');
  if(d.ok){closeModal('userMenuModal');showToast('کیک شد ✅');await loadMembers(currentServerId);}
}
async function banUser(){
  const uid=$('ctxUserId').value,name=$('ctxUsername').textContent;
  if(!confirm(`${name} رو بن کنی؟`))return;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/ban`,'POST');
  if(d.ok){closeModal('userMenuModal');showToast('بن شد ✅');await loadMembers(currentServerId);}
}
async function openMoveUser(){
  const uid=$('ctxUserId').value;
  const srv=myServers.find(s=>s.id===currentServerId);
  const vcs=srv?.channels.filter(c=>c.type==='voice')||[];
  if(!vcs.length){showToast('کانال ویس وجود نداره');return;}
  if(vcs.length===1){moveUser(uid,vcs[0].id,vcs[0].name);return;}
  $('ctxCustomRoles').innerHTML='<div style="font-size:13px;color:var(--dim);margin-bottom:8px">انتقال به کدام کانال:</div>'+
    vcs.map(c=>`<div class="ch-item" onclick="moveUser('${uid}','${c.id}','${c.name}')">🔊 ${c.name}</div>`).join('');
}
async function moveUser(uid,channelId,name){
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/move`,'POST',{channelId});
  if(d.ok){closeModal('userMenuModal');showToast(`📡 به ${name} منتقل شد`);}
  else showToast(d.msg||'آنلاین نیست');
}

// ─── SERVER SETTINGS ─────────────────────────────────────────────────────────
async function openServerSettings(){
  await loadServerRoles(currentServerId);
  const srv=myServers.find(s=>s.id===currentServerId);
  $('serverInviteLinkDisplay').textContent=`${location.origin}?join=${currentServerId}`;
  openModal('serverSettingsModal');switchStab(document.querySelector('.stab'),'roles');
}
function switchStab(btn,tabId){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.stab-content').forEach(c=>c.classList.add('hidden'));
  document.getElementById(`stab-${tabId}`)?.classList.remove('hidden');
  if(tabId==='manage'){
    const srv=myServers.find(s=>s.id===currentServerId);
    if(srv){
      const preview=$('srvIconPreview');
      if(preview){
        if(srv.iconUrl)preview.innerHTML=`<img src="${srv.iconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`;
        else preview.innerHTML=`<span style="font-size:24px">${srv.icon||'🌟'}</span>`;
      }
      setVal('editServerName',srv.name||'');
    }
  }
}
async function loadServerRoles(sid){
  try{const d=await api(`/api/servers/${sid}/roles`);if(d.ok){serverRoles[sid]=d.roles;renderRolesList(sid);}}catch(e){}
}
function renderRolesList(sid){
  const roles=serverRoles[sid]||[];
  const canEdit=['owner','admin'].includes(myServerRole);
  const rolesList=$('rolesList');
  if(!rolesList)return;
  rolesList.innerHTML=roles.length?roles.map(r=>{
    const permsCount=(r.permissions||[]).length;
    return `<div class="role-item">
      <div class="role-dot" style="background:${r.color}"></div>
      <div class="role-name">${r.name}</div>
      <div style="font-size:11px;color:${r.color};padding:2px 8px;border-radius:4px;background:${r.color}22">${permsCount} قانون</div>
      ${canEdit?`
        <button class="role-edit-btn" onclick="openRoleEdit('${r.id}')">✏️ ویرایش</button>
        <button class="danger-btn" style="padding:5px 10px;font-size:12px" onclick="deleteRole('${r.id}')">حذف</button>
      `:''}
    </div>`;
  }).join('')
  :'<div style="color:var(--muted);text-align:center;padding:20px">هنوز رولی نساختی</div>';
}

function openRoleEdit(roleId){
  const role=(serverRoles[currentServerId]||[]).find(r=>r.id===roleId);
  if(!role)return;
  $('roleEditId').value=roleId;
  $('roleEditName').value=role.name;
  $('roleEditColor').value=role.color;
  $('roleEditTitle').textContent=`✏️ ویرایش: ${role.name}`;
  // Set permissions
  document.querySelectorAll('.perms-list input[type="checkbox"]').forEach(cb=>{
    cb.checked=(role.permissions||[]).includes(cb.value);
  });
  $('roleEditPanel').classList.remove('hidden');
}

function closeRoleEdit(){
  $('roleEditPanel').classList.add('hidden');
}

async function saveRoleEdit(){
  const roleId=$('roleEditId').value;
  const name=$('roleEditName').value.trim();
  const color=$('roleEditColor').value;
  const permissions=Array.from(document.querySelectorAll('.perms-list input:checked')).map(cb=>cb.value);
  
  const d=await api(`/api/servers/${currentServerId}/roles/${roleId}`,'PATCH',{name,color,permissions});
  if(d.ok){
    serverRoles[currentServerId]=d.roles||serverRoles[currentServerId].map(r=>r.id===roleId?{...r,name,color,permissions}:r);
    await loadServerRoles(currentServerId);
    closeRoleEdit();
    showToast('رول آپدیت شد ✅');
  }else showToast(d.msg||'خطا');
}
async function createRole(){
  const name=$('newRoleName').value.trim(),color=$('newRoleColor').value;
  if(!name){showToast('اسم رول الزامیه');return;}
  try{
    const d=await api(`/api/servers/${currentServerId}/roles`,'POST',{name,color});
    if(d.ok){
      if(!serverRoles[currentServerId])serverRoles[currentServerId]=[];
      serverRoles[currentServerId].push(d.role);
      renderRolesList(currentServerId);
      $('newRoleName').value='';
      showToast(`رول ${name} ساخته شد ✅`);
    }else{
      showToast('خطا: '+(d.msg||'سرور اجازه نداد'));
    }
  }catch(e){
    showToast('خطا در اتصال');
  }
}
async function deleteRole(rid){
  if(!confirm('حذف بشه؟'))return;
  const d=await api(`/api/servers/${currentServerId}/roles/${rid}`,'DELETE');
  if(d.ok){serverRoles[currentServerId]=serverRoles[currentServerId].filter(r=>r.id!==rid);renderRolesList(currentServerId);showToast('حذف شد');}
}
function copyCurrentInvite(){
  navigator.clipboard.writeText(`${location.origin}?join=${currentServerId}`);showToast('لینک کپی شد ✅');
}
async function saveServerProfile(){
  try{
    const btn=document.querySelector('#stab-profile .auth-btn');
    if(btn){btn.textContent='در حال ذخیره...';btn.disabled=true;}
    const d=await api(`/api/servers/${currentServerId}/profile`,'POST',{
      nickname:$('serverNickname').value.trim(),
      avatarColor:$('serverAvatarColor').value
    });
    if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
    if(d.ok){
      showToast('پروفایل سرور ذخیره شد ✅');
      closeModal('serverSettingsModal');
    }else{
      showToast('خطا: '+(d.msg||'دوباره امتحان کن'));
    }
  }catch(e){
    showToast('خطا در اتصال به سرور');
  }
}

// ─── SERVER MANAGEMENT ───────────────────────────────────────────────────────
let newServerIconUrl = '';
let newServerIconEmoji = '🌟';

function selectServerEmoji(emoji){
  newServerIconEmoji = emoji;
  newServerIconUrl = '';
  const preview = $('newSrvIconPreview');
  if(preview) preview.innerHTML = `<span id="newSrvIconEmoji" style="font-size:32px">${emoji}</span>`;
  document.querySelectorAll('.icon-quick-grid span').forEach(s=>{
    s.classList.toggle('selected', s.textContent===emoji);
  });
}

function previewNewServerIcon(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    newServerIconUrl=ev.target.result;
    newServerIconEmoji='';
    const preview=$('newSrvIconPreview');
    if(preview)preview.innerHTML=`<img src="${newServerIconUrl}" style="width:100%;height:100%;object-fit:cover;">`;
  };
  reader.readAsDataURL(file);
}

async function createServer(){
  const name=$('newServerName').value.trim();
  if(!name){showToast('اسم الزامیه');return;}
  const icon=newServerIconEmoji||'🌟';
  const iconUrl=newServerIconUrl||null;
  const d=await api('/api/servers','POST',{name,icon,iconUrl});
  if(d.ok){
    myServers.push(d.server);
    renderServerBar();
    closeModal('createServerModal');
    selectServer(d.server.id);
    showToast('سرور ساخته شد 🎉');
    // reset
    newServerIconUrl='';newServerIconEmoji='🌟';
    const preview=$('newSrvIconPreview');
    if(preview)preview.innerHTML=`<span style="font-size:32px">🌟</span>`;
    $('newServerName').value='';
  }
}
async function joinServer(){
  const id=$('joinServerId').value.trim();if(!id)return;
  const d=await api(`/api/servers/${id}/join`,'POST');
  if(d.ok){if(!myServers.find(s=>s.id===d.server.id))myServers.push(d.server);renderServerBar();closeModal('joinServerModal');selectServer(d.server.id);showToast('پیوستی! 🎉');}
  else showToast(d.msg||'پیدا نشد');
}
async function addChannel(){
  const name=$('newChName').value.trim(),type=document.querySelector('input[name="chType"]:checked').value;
  if(!name){showToast('اسم الزامیه');return;}
  const d=await api(`/api/servers/${currentServerId}/channels`,'POST',{name,type});
  if(d.ok){closeModal('addChannelModal');$('newChName').value='';showToast('کانال ساخته شد');}
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
async function saveProfile(){
  try{
    const btn=document.querySelector('#profileModal .auth-btn');
    if(btn){btn.textContent='در حال ذخیره...';btn.disabled=true;}
    const d=await api('/api/users/me','PATCH',{
      bio:$('profileBio').value,
      status:$('profileStatus').value
    });
    if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
    if(d.ok){
      me={...me,...d.user};
      localStorage.setItem('mu',JSON.stringify(me));
      updateMyUI();
      closeModal('profileModal');
      showToast('پروفایل ذخیره شد ✅');
    }else{
      showToast('خطا: '+( d.msg||'دوباره امتحان کن'));
    }
  }catch(e){
    showToast('خطا در اتصال به سرور');
    console.error('saveProfile error:',e);
  }
}

// ─── MESSAGING ────────────────────────────────────────────────────────────────
function sendMessage(){
  const inp=$('msgInput'),text=inp.value.trim();if(!text||!socket)return;
  socket.emit('message',{channelId:currentChannelId,text});inp.value='';
}
function handleKey(e){if(e.key==='Enter')sendMessage();}
function handleTyping(){
  const now=Date.now();if(now-lastTyping>2000){lastTyping=now;socket?.emit('typing',{channelId:currentChannelId});}
}
function appendMessage(msg,noScroll=false){
  const a=$('messagesArea');
  const t=new Date(msg.time);const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const av=msg.avatarUrl?`<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span>${msg.avatar}</span>`;
  const div=document.createElement('div');div.className='msg-group';
  const roleTag=(() => {
    const srv=myServers.find(s=>s.id===currentServerId);
    if(!srv)return'';
    const member=serverMembers[currentServerId]?.find(m=>m.id===msg.userId);
    if(!member)return'';
    const roles=(serverRoles[currentServerId]||[]).filter(r=>member.roles?.includes(r.id));
    return roles.map(r=>`<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:${r.color}22;color:${r.color};border:1px solid ${r.color}44;margin-right:4px">${r.name}</span>`).join('');
  })();
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color},${msg.color}cc)">${av}</div>
    <div class="msg-body">
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color}">${msg.username}</span>
        ${roleTag}
        <span class="msg-time">${ts}</span>
      </div>
      <div class="msg-text">${esc(msg.text)}</div>
    </div>`;
  a.appendChild(div);if(!noScroll)a.scrollTop=a.scrollHeight;
}
let tt=null;
function showTyping(name){
  const b=$('typingBar');b.innerHTML=`${name} داره تایپ می‌کنه <span>•</span><span>•</span><span>•</span>`;
  clearTimeout(tt);tt=setTimeout(()=>b.innerHTML='',3000);
}

// ─── BOT ─────────────────────────────────────────────────────────────────────
function handleBotCmd(msg){
  if(msg.userId!==me?.id)return;const t=msg.text.trim();
  if(t.startsWith('!p ')||t.startsWith('p_')){
    const q=t.startsWith('!p ')?t.slice(3):t.slice(2);
    socket.emit('bot_search',{query:q.trim(),channelId:currentChannelId,username:me.username});
    appendBotMsg(`🔍 دنبال **${q.trim()}** میگردم...`);
  }else if(t.startsWith('!url ')){
    socket.emit('bot_play_url',{url:t.slice(5).trim(),channelId:currentChannelId,username:me.username});
  }else if(t==='!stop'){
    socket.emit('bot_command',{cmd:'stop',channelId:currentChannelId});
  }else if(t==='!help'){
    appendBotMsg('📋 **دستورات:**\n!p اسم آهنگ — جستجو\n!url لینک — پخش مستقیم\n!stop — توقف');
  }
}
function appendBotMsg(text,embed=null){
  const a=$('messagesArea');const t=new Date();
  const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const div=document.createElement('div');div.className='msg-group';
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,#7c6af7,#a855f7)">🎵</div>
    <div class="msg-body">
      <div class="msg-header"><span class="msg-uname" style="color:#7c6af7">بات موزیک</span><span class="msg-time">${ts}</span></div>
      <div class="msg-text">${text.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>')}</div>
      ${embed?`<div class="bot-embed"><div class="bot-embed-art">🎵</div>
        <div class="bot-embed-info"><div class="bot-embed-title">${esc(embed.title)}</div><div class="bot-embed-sub">در حال پخش</div></div>
        <button class="bot-embed-btn" onclick="botAudio?.paused?botAudio.play():botAudio.pause();this.textContent=botAudio?.paused?'▶':'⏸'">⏸</button>
      </div>`:''}
    </div>`;
  a.appendChild(div);a.scrollTop=a.scrollHeight;
}

// ─── MUSIC PLAYER ────────────────────────────────────────────────────────────
const bgAudio=new Audio();
bgAudio.addEventListener('ended',nextTrack);
bgAudio.addEventListener('timeupdate',()=>{
  if(!bgAudio.duration)return;
  $('musicProgress').style.width=(bgAudio.currentTime/bgAudio.duration*100)+'%';
  $('musicTime').textContent=`${fmt(bgAudio.currentTime)} / ${fmt(bgAudio.duration)}`;
});
function fmt(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
function addMusic(){
  const url=$('musicUrl').value.trim();if(!url)return;
  tracks.push({name:url.split('/').pop()||'آهنگ',url});$('musicUrl').value='';
  renderTracks();showToast('اضافه شد');if(tracks.length===1)playTrack(0);
}
function renderTracks(){
  const l=$('musicList');
  if(!tracks.length){l.innerHTML='<div style="color:var(--muted);text-align:center;padding:20px">لینک MP3 بذار یا !p توی چت بزن</div>';return;}
  l.innerHTML=tracks.map((t,i)=>`<div class="track-item${i===trackIdx?' playing':''}" onclick="playTrack(${i})">
    <div class="track-num">${i===trackIdx?'▶':(i+1)}</div>
    <div class="track-info"><div class="track-name">${t.name}</div></div>
    <span onclick="rmTrack(event,${i})" style="cursor:pointer;opacity:.4;padding:4px">✕</span>
  </div>`).join('');
}
function rmTrack(e,i){e.stopPropagation();tracks.splice(i,1);if(trackIdx>=tracks.length)trackIdx=0;renderTracks();}
function playTrack(i){trackIdx=i;bgAudio.src=tracks[i].url;bgAudio.play().then(()=>{isPlaying=true;updPlay();}).catch(()=>{});renderTracks();}
function togglePlay(){bgAudio.paused?bgAudio.play():bgAudio.pause();isPlaying=!bgAudio.paused;updPlay();}
function updPlay(){$('playPauseBtn').textContent=isPlaying?'⏸':'▶';}
function prevTrack(){trackIdx=(trackIdx-1+tracks.length)%tracks.length;playTrack(trackIdx);}
function nextTrack(){trackIdx=(trackIdx+1)%tracks.length;if(tracks.length)playTrack(trackIdx);}
function seekMusic(e){const r=e.currentTarget.querySelector('.progress-bar').getBoundingClientRect();bgAudio.currentTime=((e.clientX-r.left)/r.width)*bgAudio.duration;}

// ─── EMOJI ────────────────────────────────────────────────────────────────────
function buildEmojiPicker(){
  $('emojiPicker').innerHTML=EMOJIS.map(e=>`<div class="em" onclick="addEmoji('${e}')">${e}</div>`).join('');
}
function toggleEmoji(){emojiOpen=!emojiOpen;$('emojiPicker').classList.toggle('show',emojiOpen);}
function addEmoji(e){const i=$('msgInput');i.value+=e;i.focus();}
document.addEventListener('click',e=>{if(!e.target.closest('.input-area')){emojiOpen=false;$('emojiPicker')?.classList.remove('show');}});

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id){
  const el=$(id);
  if(!el){console.warn('Modal not found:',id);return;}
  el.classList.remove('hidden');
  // Per-modal init
  if(id==='musicModal') renderTracks();
  if(id==='profileModal'){ buildThemePicker(); buildBgSelector(); }
  if(id==='serverSettingsModal'){ 
    // handled by openServerSettings()
  }
  if(id==='audioSettingsModal'){ loadAudioDevices(); }
  if(id==='soundboardModal'){ renderSoundboard(); }
}
function closeModal(id){$(id).classList.add('hidden');}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.modal-overlay').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)closeModal(el.id);}));
});

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastT;
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2500);}

// ─── INVITE ───────────────────────────────────────────────────────────────────
const invId=new URLSearchParams(location.search).get('join');
if(invId){
  // Show invite banner on auth page
  const banner=document.getElementById('inviteBanner');
  if(banner){
    banner.textContent='🔗 دعوت به سرور — لاگین کن تا بپیوندی';
    banner.classList.remove('hidden');
  }
  // After login, auto-join
  window.addEventListener('load',()=>setTimeout(async()=>{
    if(!token)return;
    try{
      const d=await api(`/api/servers/${invId}/join`,'POST');
      if(d.ok){
        if(!myServers.find(s=>s.id===d.server.id))myServers.push(d.server);
        renderServerBar();
        selectServer(d.server.id);
        showToast('به سرور پیوستی! 🎉');
        history.replaceState({},'','/');
      }else{
        showToast(d.msg||'خطا در پیوستن');
      }
    }catch(e){}
  },2000));
}

// ─── MOBILE ───────────────────────────────────────────────────────────────────
function toggleChannelSidebar(){
  const sb=document.querySelector('.channel-sidebar');
  const ov=$('mobOverlay');
  const isOpen=sb.classList.contains('mob-open');
  closeMobileSidebars();
  if(!isOpen){
    sb.classList.add('mob-open');
    if(ov)ov.classList.add('show');
  }
}
function toggleMemberListMobile(){
  const ml=$('memberList');
  const ov=$('mobOverlay');
  const isOpen=ml.classList.contains('mob-open');
  closeMobileSidebars();
  if(!isOpen){
    ml.classList.remove('hidden');
    ml.classList.add('mob-open');
    if(ov)ov.classList.add('show');
    renderMemberList();
  }
}
function closeMobileSidebars(){
  document.querySelector('.channel-sidebar')?.classList.remove('mob-open');
  $('memberList')?.classList.remove('mob-open');
  $('mobOverlay')?.classList.remove('show');
}

// ─── AUDIO SETTINGS ───────────────────────────────────────────────────────────
let selectedMicId = localStorage.getItem('gaphub_mic') || '';
let selectedSpeakerId = localStorage.getItem('gaphub_speaker') || '';
let micTestStream = null, micTestInterval = null;

function saveAudioToggles(){
  localStorage.setItem('gaphub_nc', $('noiseCancelToggle')?.checked?'1':'0');
  localStorage.setItem('gaphub_ag', $('autoGainToggle')?.checked?'1':'0');
  localStorage.setItem('gaphub_ec', $('echoCancelToggle')?.checked?'1':'0');
  showToast('تنظیمات صدا ذخیره شد ✅');
  // اگه توی ویس هستیم اعمال کن
  if(localStream && currentVoiceId) restartVoiceWithNewDevice();
}

function loadAudioToggles(){
  const nc=$('noiseCancelToggle'), ag=$('autoGainToggle'), ec=$('echoCancelToggle');
  if(nc) nc.checked = localStorage.getItem('gaphub_nc')!=='0';
  if(ag) ag.checked = localStorage.getItem('gaphub_ag')!=='0';
  if(ec) ec.checked = localStorage.getItem('gaphub_ec')!=='0';
}

function getAudioConstraints(){
  const nc = localStorage.getItem('gaphub_nc')!=='0';
  const ag = localStorage.getItem('gaphub_ag')!=='0';
  const ec = localStorage.getItem('gaphub_ec')!=='0';
  const mic = localStorage.getItem('gaphub_mic')||'';
  const c = {
    noiseSuppression: nc,
    autoGainControl: ag,
    echoCancellation: ec,
  };
  if(mic) c.deviceId = {ideal: mic};
  return c;
}

async function loadAudioDevices() {
  try {
    // درخواست permission اول
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();

    const mics = devices.filter(d => d.kind === 'audioinput');
    const speakers = devices.filter(d => d.kind === 'audiooutput');

    const micSel = $('micSelect');
    const spkSel = $('speakerSelect');

    if (micSel) {
      micSel.innerHTML = mics.map(d =>
        `<option value="${d.deviceId}" ${d.deviceId === selectedMicId ? 'selected' : ''}>
          ${d.label || 'میکروفون ' + (mics.indexOf(d) + 1)}
        </option>`
      ).join('');
      if (!selectedMicId && mics.length) selectedMicId = mics[0].deviceId;
    }

    if (spkSel) {
      spkSel.innerHTML = `<option value="">پیش‌فرض سیستم</option>` +
        speakers.map(d =>
          `<option value="${d.deviceId}" ${d.deviceId === selectedSpeakerId ? 'selected' : ''}>
            ${d.label || 'بلندگو ' + (speakers.indexOf(d) + 1)}
          </option>`
        ).join('');
    }
    loadAudioToggles();
  } catch(e) {
    showToast('دسترسی به دستگاه‌های صوتی نبود');
    loadAudioToggles();
  }
}

function updateMicDevice() {
  selectedMicId = $('micSelect')?.value || '';
}

function updateSpeakerDevice() {
  selectedSpeakerId = $('speakerSelect')?.value || '';
}

function saveAudioSettings() {
  localStorage.setItem('gaphub_mic', selectedMicId);
  localStorage.setItem('gaphub_speaker', selectedSpeakerId);
  // اگه توی ویس هستیم stream رو آپدیت کن
  if (localStream && currentVoiceId) {
    restartVoiceWithNewDevice();
  }
  closeModal('audioSettingsModal');
  showToast('تنظیمات صدا ذخیره شد ✅');
}

async function restartVoiceWithNewDevice() {
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({audio: getAudioConstraints()});
    // جایگزین track قدیمی
    const newTrack = newStream.getAudioTracks()[0];
    Object.values(peerConnections).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
      if (sender) sender.replaceTrack(newTrack);
    });
    localStream.getAudioTracks().forEach(t => t.stop());
    localStream = newStream;
    if (isMuted) newTrack.enabled = false;
    showToast('میکروفون تغییر کرد ✅');
  } catch(e) {
    showToast('خطا در تغییر میکروفون');
  }
}

async function testMic() {
  const btn = $('micTestBtn');
  const meter = $('micMeter');
  const label = $('micTestLabel');

  if (micTestStream) {
    // توقف تست
    micTestStream.getTracks().forEach(t => t.stop());
    micTestStream = null;
    clearInterval(micTestInterval);
    if (meter) meter.style.width = '0%';
    if (btn) btn.textContent = '▶ شروع تست';
    if (label) label.textContent = 'میکروفون رو تست کن';
    return;
  }

  try {
    const constraints = {
      audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
    };
    micTestStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (btn) btn.textContent = '⏹ توقف تست';
    if (label) label.textContent = 'در حال تست...';

    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(micTestStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    micTestInterval = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const pct = Math.min(100, avg * 2);
      if (meter) meter.style.width = pct + '%';
      if (label) label.textContent = avg > 10 ? '✅ صدا دریافت شد!' : 'حرف بزن...';
    }, 50);
  } catch(e) {
    showToast('دسترسی به میکروفون نبود');
  }
}

async function testSpeaker() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
    showToast('🔊 صدای تست پخش شد');
  } catch(e) {
    showToast('خطا در پخش صدا');
  }
}

// Override joinVoice to use selected mic
// joinVoice uses selectedMicId from audio settings

// audio settings loaded via openModal below

// ─── SOUNDBOARD ───────────────────────────────────────────────────────────────
let sounds = JSON.parse(localStorage.getItem('gaphub_sounds') || '[]');
let playingSound = null;

function saveSounds() {
  // فقط url و name ذخیره کن (نه data url برای performance)
  const toSave = sounds.map(s => ({ name: s.name, url: s.url, dur: s.dur, emoji: s.emoji }));
  try { localStorage.setItem('gaphub_sounds', JSON.stringify(toSave)); } catch(e) {}
}

function addSoundFiles(e) {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target.result;
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        const name = file.name.replace(/\.[^.]+$/, '').slice(0, 20);
        sounds.push({ name, url, dur: Math.round(dur * 10) / 10, emoji: '🔊' });
        saveSounds();
        renderSoundboard();
        showToast(`${name} اضافه شد`);
      };
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function addSoundUrl() {
  const url = $('sbUrlInput').value.trim();
  const name = $('sbNameInput').value.trim() || url.split('/').pop().replace(/\.[^.]+$/, '').slice(0, 20) || 'صدا';
  if (!url) { showToast('لینک رو وارد کن'); return; }
  sounds.push({ name, url, dur: 0, emoji: '🔗' });
  saveSounds();
  renderSoundboard();
  $('sbUrlInput').value = '';
  $('sbNameInput').value = '';
  showToast(`${name} اضافه شد`);
}

function renderSoundboard() {
  const grid = $('soundboardGrid');
  if (!grid) return;
  if (!sounds.length) {
    grid.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px;grid-column:1/-1">هنوز صدایی نداری — فایل آپلود کن یا لینک بده</div>';
    return;
  }
  grid.innerHTML = sounds.map((s, i) => `
    <div class="sb-btn" id="sb-${i}" onclick="playSound(${i})">
      <button class="sb-del" onclick="deleteSound(event,${i})">✕</button>
      <div class="sb-btn-icon">${s.emoji || '🔊'}</div>
      <div class="sb-btn-name">${s.name}</div>
      ${s.dur ? `<div class="sb-btn-dur">${s.dur}s</div>` : ''}
      <div class="sb-progress" id="sbp-${i}"></div>
    </div>`).join('');
}

function playSound(idx) {
  const s = sounds[idx];
  if (!s) return;

  // توقف صدای قبلی
  if (playingSound) {
    playingSound.pause();
    playingSound = null;
    document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('playing'));
    document.querySelectorAll('.sb-progress').forEach(p => p.style.width = '0%');
  }

  const audio = new Audio(s.url);
  audio.crossOrigin = 'anonymous';
  playingSound = audio;

  const btn = document.getElementById(`sb-${idx}`);
  const prog = document.getElementById(`sbp-${idx}`);
  if (btn) btn.classList.add('playing');

  audio.play().then(() => {
    // اگه توی ویس هستیم صدا رو به ویس بفرست
    if (localStream && currentVoiceId) {
      playSoundInVoice(audio);
    }
    // progress bar
    const interval = setInterval(() => {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      if (prog) prog.style.width = pct + '%';
    }, 50);

    audio.onended = () => {
      clearInterval(interval);
      if (btn) btn.classList.remove('playing');
      if (prog) prog.style.width = '0%';
      playingSound = null;
    };
  }).catch(() => showToast('خطا در پخش صدا'));
}

function playSoundInVoice(audio) {
  try {
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    const dest = ctx.createMediaStreamDestination();
    src.connect(dest);
    src.connect(ctx.destination); // برای خودمون هم پخش بشه

    const soundStream = dest.stream;
    const soundTrack = soundStream.getAudioTracks()[0];

    // به همه peer connections اضافه کن
    Object.values(peerConnections).forEach(pc => {
      try { pc.addTrack(soundTrack, soundStream); } catch(e) {}
    });

    audio.onended = () => {
      soundTrack.stop();
    };
  } catch(e) {
    console.log('Voice sound error:', e);
  }
}

function deleteSound(e, idx) {
  e.stopPropagation();
  if (!confirm('حذف بشه؟')) return;
  sounds.splice(idx, 1);
  saveSounds();
  renderSoundboard();
}



// ─── SERVER MANAGEMENT ───────────────────────────────────────────────────────
async function deleteServer(){
  const srv=myServers.find(s=>s.id===currentServerId);
  if(!srv)return;
  if(!confirm(`سرور "${srv.name}" حذف بشه؟ این کار برگشت‌ناپذیره!`))return;
  const d=await api(`/api/servers/${currentServerId}`,'DELETE');
  if(d.ok){
    closeModal('serverSettingsModal');
    showToast('سرور حذف شد');
    myServers=myServers.filter(s=>s.id!==currentServerId);
    renderServerBar();
    selectServer('default');
  }else showToast(d.msg||'خطا');
}

async function uploadServerIcon(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    const iconUrl=ev.target.result;
    const preview=$('srvIconPreview');
    if(preview)preview.innerHTML=`<img src="${iconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`;
    const d=await api(`/api/servers/${currentServerId}`,'PATCH',{iconUrl});
    if(d.ok){
      const srv=myServers.find(s=>s.id===currentServerId);
      if(srv)srv.iconUrl=iconUrl;
      renderServerBar();
      showToast('آیکون سرور آپدیت شد ✅');
    }
  };
  reader.readAsDataURL(file);
}

async function saveServerInfo(){
  const name=$('editServerName').value.trim();
  if(!name)return;
  const d=await api(`/api/servers/${currentServerId}`,'PATCH',{name});
  if(d.ok){
    const srv=myServers.find(s=>s.id===currentServerId);
    if(srv){srv.name=name;setText('sidebarServerName',name);}
    renderServerBar();
    closeModal('serverSettingsModal');
    showToast('سرور آپدیت شد ✅');
  }
}

// ─── DISCONNECT FROM VOICE ───────────────────────────────────────────────────
async function disconnectFromVoice(){
  const uid=$('ctxUserId').value;
  const name=$('ctxUsername').textContent;
  if(!confirm(`${name} رو از ویس دیسکانکت کنی؟`))return;
  const d=await api(`/api/servers/${currentServerId}/members/${uid}/disconnect-voice`,'POST');
  if(d.ok){closeModal('userMenuModal');showToast(`${name} از ویس دیسکانکت شد`);}
  else showToast(d.msg||'خطا');
}



// renderServerBar updated inline below





// ─── VOICE DEBUG ──────────────────────────────────────────────────────────────
function checkVoiceDebug(){
  const lines=[];
  lines.push(`📡 Socket: ${socket?.connected?'✅ وصل':'❌ قطع'}`);
  lines.push(`🎤 میکروفون: ${localStream?`✅ ${localStream.getAudioTracks().length} track`:'❌ نداریم'}`);
  lines.push(`👥 Peer Connections: ${Object.keys(peerConnections).length}`);
  
  Object.entries(peerConnections).forEach(([sid,pc])=>{
    lines.push(`  📶 ${sid.slice(0,8)}: ${pc.connectionState} / ICE: ${pc.iceConnectionState}`);
  });
  
  lines.push(`🔊 Audio Elements: ${Object.keys(peerAudios).length}`);
  Object.entries(peerAudios).forEach(([sid,audio])=>{
    lines.push(`  🎧 ${sid.slice(0,8)}: paused=${audio.paused}, vol=${audio.volume}, muted=${audio.muted}`);
  });
  
  const msg=lines.join('\n');
  alert(msg);
  console.log('VOICE DEBUG:\n'+msg);
}

// ─── SERVER SETTINGS PANEL ────────────────────────────────────────────────────
async function openServerSettings(){
  const srv=myServers.find(s=>s.id===currentServerId);
  if(!srv)return;
  setText('srvSettingsName',srv.name);
  await loadServerRoles(currentServerId);
  // Load stats
  const members=serverMembers[currentServerId]||[];
  const online=members.filter(m=>!!onlineUsers[m.id]).length;
  const srv2=myServers.find(s=>s.id===currentServerId);
  const chCount=srv2?.channels?.length||0;
  $('srvStats').innerHTML=`
    <div class="srv-stat-card"><div class="srv-stat-num">${members.length}</div><div class="srv-stat-label">👥 عضو</div></div>
    <div class="srv-stat-card"><div class="srv-stat-num" style="color:#00ff88">${online}</div><div class="srv-stat-label">🟢 آنلاین</div></div>
    <div class="srv-stat-card"><div class="srv-stat-num">${chCount}</div><div class="srv-stat-label">📢 کانال</div></div>`;
  // Load invite link
  $('serverInviteLinkDisplay').textContent=`${location.origin}?join=${currentServerId}`;
  // Load channels list
  renderSettingsChannels();
  // Load members list
  renderSettingsMembers('');
  openModal('serverSettingsModal');
  switchStab(document.querySelector('#serverSettingsModal .stab'),'overview');
}

function renderSettingsMembers(filter){
  const members=(serverMembers[currentServerId]||[]).filter(m=>
    !filter||m.username?.toLowerCase().includes(filter.toLowerCase())
  );
  const list=$('srvMembersList');if(!list)return;
  const canMod=['owner','admin'].includes(myServerRole);
  list.innerHTML=members.map(m=>{
    const isOnline=!!onlineUsers[m.id];
    const ri=m.serverRole==='owner'?'👑':m.serverRole==='admin'?'🛡':m.serverRole==='mod'?'🔨':'👤';
    const customRoles=(serverRoles[currentServerId]||[]).filter(r=>m.roles?.includes(r.id));
    const av=m.avatarUrl?`<img src="${m.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span>${m.avatar||m.username?.[0]?.toUpperCase()}</span>`;
    return `<div class="srv-member-row">
      <div class="ml-avatar ${isOnline?'online':''}" style="background:${m.color}">${av}</div>
      <div class="member-info">
        <div class="member-name">${m.username} ${ri}</div>
        <div class="member-role">${customRoles.map(r=>`<span style="color:${r.color}">${r.name}</span>`).join(' • ')||m.serverRole}</div>
      </div>
      ${canMod&&m.id!==me?.id?`<button class="auth-btn sm" onclick="openUserMenu('${m.id}','${m.username}','${m.serverRole||'member'}','${m.color}')" style="font-size:12px">مدیریت</button>`:''}
    </div>`;
  }).join('')||'<div style="color:var(--muted);text-align:center;padding:20px">عضوی پیدا نشد</div>';
}

function filterMembers(val){ renderSettingsMembers(val); }

function renderSettingsChannels(){
  const srv=myServers.find(s=>s.id===currentServerId);
  const list=$('srvChannelsList');if(!list||!srv)return;
  list.innerHTML=srv.channels.map(ch=>`
    <div class="srv-ch-row">
      <span style="font-size:16px">${ch.type==='voice'?'🔊':'＃'}</span>
      <div style="flex:1;font-size:14px">${ch.name}</div>
      <span style="font-size:11px;color:var(--muted)">${ch.type==='voice'?'ویس':'متن'}</span>
      ${['owner','admin'].includes(myServerRole)?`<button class="danger-btn" style="padding:4px 10px;font-size:12px" onclick="deleteChannel('${ch.id}','${ch.name}')">حذف</button>`:''}
    </div>`).join('');
}

async function addChannelFromSettings(){
  const name=$('newChNameSrv').value.trim();
  const type=$('newChTypeSrv').value;
  if(!name){showToast('اسم کانال الزامیه');return;}
  const d=await api(`/api/servers/${currentServerId}/channels`,'POST',{name,type});
  if(d.ok){
    $('newChNameSrv').value='';
    showToast('کانال ساخته شد ✅');
    // Update local server data
    const srv=myServers.find(s=>s.id===currentServerId);
    if(srv&&d.channel)srv.channels.push(d.channel);
    renderSettingsChannels();
    renderChannels();
  }
}

async function deleteChannel(chId,chName){
  if(!confirm(`کانال "${chName}" حذف بشه؟`))return;
  const d=await api(`/api/servers/${currentServerId}/channels/${chId}`,'DELETE');
  if(d.ok){
    const srv=myServers.find(s=>s.id===currentServerId);
    if(srv)srv.channels=srv.channels.filter(c=>c.id!==chId);
    renderSettingsChannels();renderChannels();
    showToast('کانال حذف شد');
  }else showToast(d.msg||'خطا');
}

async function clearServerMessages(){
  if(!confirm('همه پیام‌های سرور پاک بشن؟'))return;
  const d=await api(`/api/servers/${currentServerId}/clear-messages`,'POST');
  if(d.ok){$('messagesArea').innerHTML='';showToast('پیام‌ها پاک شدن');}
}

function shareInvite(){
  const link=`${location.origin}?join=${currentServerId}`;
  if(navigator.share){
    navigator.share({title:'GapHub',text:'بیا توی سرور من!',url:link});
  }else{
    navigator.clipboard.writeText(link);
    showToast('لینک کپی شد ✅');
  }
}

// ─── PING DISPLAY ─────────────────────────────────────────────────────────────
function startPingMonitor() {
  setInterval(() => {
    if (!socket?.connected) return;
    const start = Date.now();
    // Use socket.io built-in ping measurement
    socket.volatile.emit('ping_check', start);
  }, 2000);
  
  socket.on('pong_check', (sentAt) => {
    const ping = Date.now() - sentAt;
    const el = $('pingValue');
    const wrap = $('pingDisplay');
    if (!el || !wrap) return;
    el.textContent = ping;
    wrap.classList.remove('lag','bad');
    if (ping > 200) wrap.classList.add('bad');
    else if (ping > 100) wrap.classList.add('lag');
  });
}

// Ping starts in startApp


// ─── SCREEN SHARE (WebRTC P2P) ────────────────────────────────────────────────
let screenStream = null;
let isSharing = false;
let screenPCs = {}; // { socketId: RTCPeerConnection }

async function toggleScreenShare() {
  isSharing ? stopScreenShare() : startScreenShare();
}

async function startScreenShare() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 15, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    isSharing = true;
    const btn = $('screenShareBtn');
    if (btn) { btn.textContent = '🔴🖥'; btn.style.background = 'rgba(239,68,68,.2)'; }
    
    screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
    socket.emit('screen_share_start', { channelId: currentVoiceId });
    $('voiceView')?.classList.add('has-share');
    $('vcScreenGrid')?.classList.remove('hidden');
    showToast('🖥 اشتراک صفحه شروع شد');
  } catch(e) {
    if (e.name !== 'NotAllowedError') showToast('خطا: ' + e.message);
  }
}

function stopScreenShare() {
  isSharing = false;
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
  Object.values(screenPCs).forEach(pc => pc.close());
  screenPCs = {};
  const btn = $('screenShareBtn');
  if (btn) { btn.textContent = '🖥'; btn.style.background = ''; }
  socket.emit('screen_share_stop', { channelId: currentVoiceId });
  showToast('🖥 اشتراک صفحه متوقف شد');
}

function stopWatchingScreen() {
  $('screenShareArea')?.classList.add('hidden');
  $('voiceView')?.classList.remove('has-share');
  const video = $('screenShareVideo');
  if (video) { video.srcObject = null; video.src = ''; }
}

async function createScreenPC(toSocketId, asOfferer) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  screenPCs[toSocketId] = pc;

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit('screen_ice', { to: toSocketId, candidate: e.candidate });
  };

  pc.ontrack = e => {
    const video = $('screenShareVideo');
    const area = $('screenShareArea');
    if (video && area) {
      video.srcObject = e.streams[0];
      area.classList.remove('hidden');
      video.play().catch(() => {});
    }
  };

  if (asOfferer && screenStream) {
    screenStream.getTracks().forEach(t => pc.addTrack(t, screenStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('screen_offer', { to: toSocketId, offer });
  }
  return pc;
}

// screen share events moved to connectSocket

// ─── CAMERA ───────────────────────────────────────────────────────────────────
let cameraStream = null;
async function toggleCamera() {
  const btn = $('cameraBtn');
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    if (btn) btn.classList.remove('active');
    showToast('📷 دوربین خاموش شد');
  } else {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (btn) btn.classList.add('active');
      showToast('📷 دوربین روشن شد');
    } catch(e) { showToast('دسترسی به دوربین نبود'); }
  }
}// ═══════════════════════════════════════════════════════════════════════
//  GapHub — APP PATCH  v1
//  این فایل رو در انتهای app.js اضافه کن
//  (قبل از آخرین }) بند io.on)
// ═══════════════════════════════════════════════════════════════════════

// ─── تم‌های جدید ──────────────────────────────────────────────────────
const EXTRA_THEMES = {
  light:    { label:'☀️ روشن',    vars:{ '--bg-deep':'#f0f2f5','--bg-side':'#e3e5e8','--bg-ch':'#ebedef','--bg-chat':'#ffffff','--bg-input':'#e3e5e8','--bg-card':'#ffffff','--bg-hover':'#d4d7dc','--accent':'#5865f2','--accent2':'#7289da','--accent-glow':'rgba(88,101,242,0.2)','--text':'#060607','--muted':'#72767d','--dim':'#4f5660','--border':'rgba(88,101,242,0.15)' }},
  amoled:   { label:'🌑 AMOLED',   vars:{ '--bg-deep':'#000000','--bg-side':'#000000','--bg-ch':'#0a0a0a','--bg-chat':'#050505','--bg-input':'#111111','--bg-card':'#0d0d0d','--bg-hover':'#151515','--accent':'#7c6af7','--accent2':'#a855f7','--accent-glow':'rgba(124,106,247,0.3)','--text':'#ffffff','--muted':'#555','--dim':'#333','--border':'rgba(124,106,247,0.2)' }},
  cyberpunk:{ label:'✨ Cyberpunk', vars:{ '--bg-deep':'#0a0014','--bg-side':'#0d001a','--bg-ch':'#0f0020','--bg-chat':'#0c001c','--bg-input':'#130026','--bg-card':'#160030','--bg-hover':'#1c0038','--accent':'#ff0099','--accent2':'#00ffff','--accent-glow':'rgba(255,0,153,0.3)','--text':'#f0e6ff','--muted':'#7c4dff','--dim':'#5a3d7a','--border':'rgba(255,0,153,0.2)' }},
  ocean:    { label:'🌊 Ocean',     vars:{ '--bg-deep':'#0a0e1a','--bg-side':'#0d1220','--bg-ch':'#0f1628','--bg-chat':'#0c1322','--bg-input':'#0d1420','--bg-card':'#111828','--bg-hover':'#162030','--accent':'#0ea5e9','--accent2':'#38bdf8','--accent-glow':'rgba(14,165,233,0.3)','--text':'#e0f2fe','--muted':'#7dd3fc','--dim':'#38bdf8','--border':'rgba(14,165,233,0.15)' }},
  forest:   { label:'🌲 Forest',    vars:{ '--bg-deep':'#0a100a','--bg-side':'#0d150d','--bg-ch':'#0f1a0f','--bg-chat':'#0c1612','--bg-input':'#0e1810','--bg-card':'#112014','--bg-hover':'#152618','--accent':'#22c55e','--accent2':'#4ade80','--accent-glow':'rgba(34,197,94,0.3)','--text':'#dcfce7','--muted':'#86efac','--dim':'#4ade80','--border':'rgba(34,197,94,0.15)' }},
  sunset:   { label:'🌅 Sunset',    vars:{ '--bg-deep':'#12080a','--bg-side':'#180a0d','--bg-ch':'#1c0c10','--bg-chat':'#160b0e','--bg-input':'#1a0c10','--bg-card':'#200e14','--bg-hover':'#281018','--accent':'#f97316','--accent2':'#fb923c','--accent-glow':'rgba(249,115,22,0.3)','--text':'#fff7ed','--muted':'#fdba74','--dim':'#fb923c','--border':'rgba(249,115,22,0.15)' }},
  frost:    { label:'❄️ Frost',     vars:{ '--bg-deep':'#0d1520','--bg-side':'#111c28','--bg-ch':'#142030','--bg-chat':'#0f1c2c','--bg-input':'#121e2a','--bg-card':'#162432','--bg-hover':'#1c2e40','--accent':'#7dd3fc','--accent2':'#bae6fd','--accent-glow':'rgba(125,211,252,0.25)','--text':'#f0f9ff','--muted':'#bae6fd','--dim':'#7dd3fc','--border':'rgba(125,211,252,0.12)' }},
  galaxy:   { label:'🌌 Galaxy',    vars:{ '--bg-deep':'#04001a','--bg-side':'#060020','--bg-ch':'#080025','--bg-chat':'#05001e','--bg-input':'#0a0028','--bg-card':'#0c002e','--bg-hover':'#100038','--accent':'#a855f7','--accent2':'#c084fc','--accent-glow':'rgba(168,85,247,0.35)','--text':'#f5f3ff','--muted':'#c4b5fd','--dim':'#a78bfa','--border':'rgba(168,85,247,0.2)' }},
  lava:     { label:'🔥 Lava',      vars:{ '--bg-deep':'#120400','--bg-side':'#180500','--bg-ch':'#1c0600','--bg-chat':'#150500','--bg-input':'#1a0600','--bg-card':'#200800','--bg-hover':'#280a00','--accent':'#ef4444','--accent2':'#f97316','--accent-glow':'rgba(239,68,68,0.35)','--text':'#fff7ed','--muted':'#fca5a5','--dim':'#f97316','--border':'rgba(239,68,68,0.2)' }},
  gold:     { label:'🏆 Gold',      vars:{ '--bg-deep':'#0f0900','--bg-side':'#140c00','--bg-ch':'#181000','--bg-chat':'#120b00','--bg-input':'#160e00','--bg-card':'#1c1200','--bg-hover':'#241600','--accent':'#f59e0b','--accent2':'#fbbf24','--accent-glow':'rgba(245,158,11,0.35)','--text':'#fffbeb','--muted':'#fde68a','--dim':'#fbbf24','--border':'rgba(245,158,11,0.2)' }},
};

// وضعیت ری‌پلای
let replyTo = null; // { id, username, text }
// وضعیت ویرایش
let editingMsgId = null;
// وضعیت voice effect
let currentVoiceEffect = 'none';
let voiceEffectNodes = {}; // Web Audio nodes for effect

// ─── تم‌های پیشرفته ───────────────────────────────────────────────────
function applyExtraTheme(name) {
  const theme = EXTRA_THEMES[name];
  if (!theme) return;
  const s = document.documentElement.style;
  Object.entries(theme.vars).forEach(([k, v]) => s.setProperty(k, v));
  // reset accent vars که THEMES اصلی ست کرده
  s.setProperty('--accent', theme.vars['--accent']);
  s.setProperty('--accent2', theme.vars['--accent2']);
  s.setProperty('--accent-glow', theme.vars['--accent-glow']);
  s.setProperty('--bg-deep', theme.vars['--bg-deep']);
  s.setProperty('--bg-chat', theme.vars['--bg-chat']);
  document.body.style.color = theme.vars['--text'];
  localStorage.setItem('mtheme_extra', name);
  localStorage.removeItem('mtheme'); // override تم اصلی
  showToast(theme.label + ' فعال شد ✅');
}

function buildFullThemePicker() {
  const container = document.getElementById('fullThemePicker');
  if (!container) return;
  // تم‌های داخلی
  const baseThemes = [
    {id:'purple',label:'🟣 بنفش'},
    {id:'blue',  label:'🔵 آبی'},
    {id:'green', label:'🟢 سبز'},
    {id:'red',   label:'🔴 قرمز'},
    {id:'pink',  label:'🩷 صورتی'},
    {id:'dark',  label:'⬛ تیره'},
  ];
  const extraList = Object.entries(EXTRA_THEMES).map(([id,t]) => `
    <div class="theme-card" onclick="applyExtraTheme('${id}')">${t.label}</div>
  `).join('');
  const baseList = baseThemes.map(t => `
    <div class="theme-card" onclick="setTheme('${t.id}')">${t.label}</div>
  `).join('');
  container.innerHTML = `
    <div class="theme-section-title">تم‌های پایه</div>
    <div class="theme-grid">${baseList}</div>
    <div class="theme-section-title" style="margin-top:16px">تم‌های ویژه</div>
    <div class="theme-grid">${extraList}</div>
  `;
}

// ─── Markdown renderer ────────────────────────────────────────────────
function renderMarkdown(raw) {
  if (!raw) return '';
  let t = raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // Code block ```lang\ncode```
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code) =>
      `<pre class="code-block"><code class="lang-${lang||'txt'}">${code.trim()}</code></pre>`)
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Bold **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Underline __text__
    .replace(/__(.+?)__/g, '<u>$1</u>')
    // Strikethrough ~~text~~
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    // Spoiler ||text||
    .replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>')
    // Quote > text
    .replace(/^&gt;\s(.+)$/gm, '<div class="quote-block">$1</div>')
    // Link preview
    .replace(/https?:\/\/[^\s<>"]+/g, url => {
      const isImg = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
      if (isImg) return `<a href="${url}" target="_blank" rel="noopener"><img class="msg-img" src="${url}" loading="lazy" onerror="this.style.display='none'"></a>`;
      return `<a href="${url}" target="_blank" rel="noopener" class="msg-link">${url}</a>`;
    })
    // Newline
    .replace(/\n/g, '<br>');
  return t;
}

// ─── Mention parser ───────────────────────────────────────────────────
function renderMentions(html) {
  return html.replace(/@(\w+)/g, (m, name) => {
    const isMe = me && name.toLowerCase() === me.username.toLowerCase();
    return `<span class="mention ${isMe ? 'mention-me' : ''}" onclick="openUserByName('${name}')">@${name}</span>`;
  });
}

// ─── پیام کامل render ─────────────────────────────────────────────────
function renderMsgContent(msg) {
  let html = renderMarkdown(msg.text || '');
  html = renderMentions(html);

  // فایل / تصویر پیوست
  if (msg.file) {
    const { data, name, type } = msg.file;
    if (type && type.startsWith('image/')) {
      html += `<br><img class="msg-img" src="${data}" alt="${esc(name)}" loading="lazy" style="max-width:360px;max-height:300px;border-radius:8px;margin-top:6px;cursor:pointer" onclick="openImgModal('${data}')">`;
    } else {
      html += `<div class="file-attach"><span class="file-icon">📎</span><a href="${data}" download="${esc(name)}" class="file-link">${esc(name)}</a></div>`;
    }
  }
  return html;
}

// ─── appendMessage پیشرفته (جایگزین نسخه قبلی) ───────────────────────
const _origAppendMessage = window.appendMessage;
window.appendMessage = function(msg, noScroll=false) {
  const a = $('messagesArea');
  const t = new Date(msg.time);
  const ts = `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const av = msg.avatarUrl
    ? `<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span>${msg.avatar||'?'}</span>`;

  const roleTag = (() => {
    const srv = myServers.find(s => s.id === currentServerId);
    if (!srv) return '';
    const member = serverMembers[currentServerId]?.find(m => m.id === msg.userId);
    if (!member) return '';
    const roles = (serverRoles[currentServerId]||[]).filter(r => member.roles?.includes(r.id));
    return roles.map(r => `<span class="role-tag" style="background:${r.color}22;color:${r.color};border-color:${r.color}44">${r.name}</span>`).join('');
  })();

  const replyBlock = msg.replyTo
    ? `<div class="reply-preview" onclick="scrollToMsg('${msg.replyTo.id}')">↩ <strong>${esc(msg.replyTo.username)}</strong>: ${esc((msg.replyTo.text||'').slice(0,60))}</div>`
    : '';

  const editedTag = msg.edited ? `<span class="edited-tag">(ویرایش شده)</span>` : '';

  const reactBar = buildReactBar(msg);

  const isMe = msg.userId === me?.id;
  const canDelete = isMe || ['owner','admin','mod'].includes(myServerRole);

  const div = document.createElement('div');
  div.className = 'msg-group';
  div.id = `msg-${msg.id}`;
  div.dataset.msgId = msg.id;
  div.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color},${msg.color}cc)" onclick="openUserProfile('${msg.userId}')">${av}</div>
    <div class="msg-body">
      ${replyBlock}
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color}" onclick="openUserProfile('${msg.userId}')">${esc(msg.username)}</span>
        ${roleTag}
        <span class="msg-time">${ts}</span>
        ${editedTag}
      </div>
      <div class="msg-text" id="msgtext-${msg.id}">${renderMsgContent(msg)}</div>
      ${reactBar}
    </div>
    <div class="msg-actions">
      <button class="msg-act-btn" title="ری‌اکشن" onclick="toggleReactPicker('${msg.id}')">😀</button>
      <button class="msg-act-btn" title="ریپلای" onclick="setReply('${msg.id}','${esc(msg.username)}','${esc((msg.text||'').slice(0,60))}')">↩</button>
      ${isMe ? `<button class="msg-act-btn" title="ویرایش" onclick="startEdit('${msg.id}')">✏️</button>` : ''}
      ${canDelete ? `<button class="msg-act-btn danger" title="حذف" onclick="deleteMsg('${msg.id}','${currentChannelId}')">🗑️</button>` : ''}
    </div>`;

  a.appendChild(div);
  if (!noScroll) a.scrollTop = a.scrollHeight;
};

function buildReactBar(msg) {
  if (!msg.reactions || !Object.keys(msg.reactions).length) return '<div class="react-bar" id="rbar-'+msg.id+'"></div>';
  const btns = Object.entries(msg.reactions).map(([emoji, users]) => {
    const isMine = users.includes(me?.id);
    return `<button class="react-btn ${isMine?'mine':''}" onclick="sendReact('${msg.id}','${emoji}')">${emoji} ${users.length}</button>`;
  }).join('');
  return `<div class="react-bar" id="rbar-${msg.id}">${btns}</div>`;
}

// ─── Socket events جدید ───────────────────────────────────────────────
function patchSocketEvents() {
  if (!socket) return setTimeout(patchSocketEvents, 500);

  socket.on('message_deleted', ({ channelId, msgId }) => {
    if (channelId !== currentChannelId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) { el.style.opacity='0'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }
  });

  socket.on('message_edited', ({ channelId, msgId, newText, edited }) => {
    if (channelId !== currentChannelId) return;
    const el = document.getElementById(`msgtext-${msgId}`);
    if (el) {
      el.innerHTML = renderMsgContent({ text: newText, edited });
      const header = el.closest('.msg-body')?.querySelector('.msg-header');
      if (header && edited && !header.querySelector('.edited-tag')) {
        header.insertAdjacentHTML('beforeend','<span class="edited-tag">(ویرایش شده)</span>');
      }
    }
  });

  socket.on('reaction_update', ({ channelId, msgId, reactions }) => {
    if (channelId !== currentChannelId) return;
    const bar = document.getElementById(`rbar-${msgId}`);
    if (!bar) return;
    if (!reactions || !Object.keys(reactions).length) { bar.innerHTML=''; return; }
    bar.innerHTML = Object.entries(reactions).map(([emoji,users]) => {
      const isMine = users.includes(me?.id);
      return `<button class="react-btn ${isMine?'mine':''}" onclick="sendReact('${msgId}','${emoji}')">${emoji} ${users.length}</button>`;
    }).join('');
  });

  socket.on('search_results', ({ query, results }) => {
    renderSearchResults(query, results);
  });
}

// ─── ری‌اکشن ──────────────────────────────────────────────────────────
const QUICK_REACTS = ['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀','💎','🚀'];
let reactPickerFor = null;

function toggleReactPicker(msgId) {
  const existing = document.getElementById('reactPickerPopup');
  if (existing && reactPickerFor === msgId) { existing.remove(); reactPickerFor = null; return; }
  if (existing) existing.remove();
  reactPickerFor = msgId;
  const msgEl = document.getElementById(`msg-${msgId}`);
  if (!msgEl) return;
  const popup = document.createElement('div');
  popup.id = 'reactPickerPopup';
  popup.className = 'react-picker-popup';
  popup.innerHTML = QUICK_REACTS.map(e =>
    `<button onclick="sendReact('${msgId}','${e}');closeReactPicker()">${e}</button>`
  ).join('');
  msgEl.appendChild(popup);
  setTimeout(() => { document.addEventListener('click', closeReactPickerOutside, {once:true}); }, 100);
}
function closeReactPicker() {
  document.getElementById('reactPickerPopup')?.remove();
  reactPickerFor = null;
}
function closeReactPickerOutside(e) {
  if (!e.target.closest('#reactPickerPopup')) closeReactPicker();
}
function sendReact(msgId, emoji) {
  socket?.emit('react', { channelId: currentChannelId, msgId, emoji });
}

// ─── Reply ────────────────────────────────────────────────────────────
function setReply(id, username, text) {
  replyTo = { id, username, text };
  const bar = document.getElementById('replyBar');
  if (bar) {
    bar.innerHTML = `<span>↩ ریپلای به <strong>${username}</strong>: ${text}</span><button onclick="clearReply()">✕</button>`;
    bar.classList.remove('hidden');
  }
  $('msgInput')?.focus();
}
function clearReply() {
  replyTo = null;
  const bar = document.getElementById('replyBar');
  if (bar) bar.classList.add('hidden');
}

// ─── Edit message ─────────────────────────────────────────────────────
function startEdit(msgId) {
  const textEl = document.getElementById(`msgtext-${msgId}`);
  if (!textEl) return;
  const original = textEl.dataset.original || textEl.innerText;
  editingMsgId = msgId;
  const inp = $('msgInput');
  if (inp) {
    inp.value = original;
    inp.dataset.editMode = '1';
    inp.focus();
    const bar = document.getElementById('replyBar');
    if (bar) {
      bar.innerHTML = `<span>✏️ در حال ویرایش پیام</span><button onclick="cancelEdit()">✕</button>`;
      bar.classList.remove('hidden');
    }
  }
}
function cancelEdit() {
  editingMsgId = null;
  const inp = $('msgInput');
  if (inp) { inp.value=''; delete inp.dataset.editMode; }
  clearReply();
}

// ─── جایگزینی sendMessage برای پشتیبانی reply + edit ─────────────────
const _origSendMessage = window.sendMessage;
window.sendMessage = function() {
  const inp = $('msgInput');
  const text = inp?.value.trim();
  if (!text || !socket) return;

  if (inp.dataset.editMode && editingMsgId) {
    socket.emit('edit_message', { channelId: currentChannelId, msgId: editingMsgId, newText: text });
    cancelEdit();
    return;
  }

  const payload = { channelId: currentChannelId, text };
  if (replyTo) { payload.replyTo = replyTo; }
  socket.emit('message', payload);
  inp.value = '';
  clearReply();
};

// ─── حذف پیام ────────────────────────────────────────────────────────
function deleteMsg(msgId, channelId) {
  socket?.emit('delete_message', { channelId, msgId });
}

// ─── آپلود فایل در چت ────────────────────────────────────────────────
function initFileDrop() {
  const chatView = document.getElementById('chatView');
  if (!chatView) return;

  chatView.addEventListener('dragover', e => { e.preventDefault(); chatView.classList.add('drag-over'); });
  chatView.addEventListener('dragleave', () => chatView.classList.remove('drag-over'));
  chatView.addEventListener('drop', e => {
    e.preventDefault();
    chatView.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files?.length) processFileUpload(files[0]);
  });

  // دکمه آپلود
  const btn = document.getElementById('fileUploadBtn');
  const input = document.getElementById('chatFileInput');
  if (btn && input) {
    btn.onclick = () => input.click();
    input.onchange = e => { if (e.target.files[0]) processFileUpload(e.target.files[0]); };
  }
}

function processFileUpload(file) {
  if (file.size > 5_000_000) { showToast('⚠️ فایل بیشتر از 5MB نمی‌تونی بفرستی'); return; }
  showToast('📤 در حال آپلود...');
  const reader = new FileReader();
  reader.onload = ev => {
    socket?.emit('file_message', {
      channelId: currentChannelId,
      fileData: ev.target.result,
      fileName: file.name,
      fileType: file.type,
      text: ''
    });
  };
  reader.readAsDataURL(file);
}

// ─── باز کردن تصویر در مدال ──────────────────────────────────────────
function openImgModal(src) {
  let modal = document.getElementById('imgViewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imgViewModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000c;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 0 60px #000">`;
  document.body.appendChild(modal);
}

// ─── جستجوی پیام‌ها ──────────────────────────────────────────────────
let searchOpen = false;
function toggleSearch() {
  searchOpen = !searchOpen;
  const panel = document.getElementById('searchPanel');
  if (!panel) { injectSearchPanel(); return; }
  panel.classList.toggle('hidden', !searchOpen);
  if (searchOpen) document.getElementById('searchInput')?.focus();
}
function injectSearchPanel() {
  const panel = document.createElement('div');
  panel.id = 'searchPanel';
  panel.className = 'search-panel';
  panel.innerHTML = `
    <div class="search-header">
      <input id="searchInput" class="search-input" placeholder="🔍 جستجو در پیام‌ها..." onkeydown="if(event.key==='Enter')doSearch()">
      <button class="msg-act-btn" onclick="doSearch()">جستجو</button>
      <button class="msg-act-btn" onclick="toggleSearch()">✕</button>
    </div>
    <div id="searchResults" class="search-results"></div>`;
  const chatView = document.getElementById('chatView');
  if (chatView) chatView.insertBefore(panel, chatView.firstChild);
}
function doSearch() {
  const q = document.getElementById('searchInput')?.value.trim();
  if (!q) return;
  socket?.emit('search_messages', { channelId: currentChannelId, query: q });
}
function renderSearchResults(query, results) {
  const el = document.getElementById('searchResults');
  if (!el) return;
  if (!results.length) { el.innerHTML = `<div class="search-empty">نتیجه‌ای پیدا نشد برای «${esc(query)}»</div>`; return; }
  el.innerHTML = results.map(m => {
    const t = new Date(m.time);
    const ts = `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')} ${t.toLocaleDateString('fa')}`;
    const highlighted = (m.text||'').replace(new RegExp(esc(query),'gi'), s => `<mark>${s}</mark>`);
    return `<div class="search-item" onclick="scrollToMsg('${m.id}')">
      <span class="search-user" style="color:${m.color}">${esc(m.username)}</span>
      <span class="search-time">${ts}</span>
      <div class="search-text">${highlighted}</div>
    </div>`;
  }).join('');
}
function scrollToMsg(msgId) {
  const el = document.getElementById(`msg-${msgId}`);
  if (el) { el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('highlight'); setTimeout(()=>el.classList.remove('highlight'),2000); }
}

// ─── Voice Effect با Web Audio API ───────────────────────────────────
// افکت‌ها کاملاً روی audio stream اعمال میشن
const VOICE_EFFECTS = {
  none:     { label: '🎤 معمولی' },
  robot:    { label: '🤖 ربات' },
  deep:     { label: '🎙 بم' },
  high:     { label: '🐭 زیر (موش)' },
  cave:     { label: '🏔 غار' },
  friend:   { label: '👥 مثل دوستت' },
  radio:    { label: '📻 رادیو' },
};

let effectAudioCtx = null;
let effectSourceNode = null;
let effectDestStream = null;

async function applyVoiceEffect(effectName) {
  currentVoiceEffect = effectName;
  localStorage.setItem('gaphub_voice_effect', effectName);
  socket?.emit('voice_effect', { channelId: currentVoiceId, effect: effectName });

  if (!localStream) { showToast('ابتدا وارد ویس شو'); return; }

  // بستن context قبلی
  if (effectAudioCtx) { try { effectAudioCtx.close(); } catch(e){} effectAudioCtx = null; effectSourceNode = null; }

  if (effectName === 'none') {
    // برگشت به stream اصلی
    applyStreamToPeers(localStream);
    showToast('🎤 بدون افکت');
    return;
  }

  try {
    effectAudioCtx = new AudioContext({ sampleRate: 44100 });
    effectSourceNode = effectAudioCtx.createMediaStreamSource(localStream);

    let lastNode = effectSourceNode;

    if (effectName === 'deep' || effectName === 'friend') {
      // Pitch shift پایین‌تر = صدای بم‌تر
      // از bitcrusher + بایاس برای صدای بم شبیه‌سازی می‌کنیم
      const gainNode = effectAudioCtx.createGain();
      gainNode.gain.value = effectName === 'deep' ? 1.4 : 1.1;
      const biquad = effectAudioCtx.createBiquadFilter();
      biquad.type = 'lowshelf';
      biquad.frequency.value = effectName === 'deep' ? 200 : 300;
      biquad.gain.value = effectName === 'deep' ? 12 : 6;
      lastNode.connect(biquad);
      biquad.connect(gainNode);
      lastNode = gainNode;
    }

    if (effectName === 'high') {
      const biquad = effectAudioCtx.createBiquadFilter();
      biquad.type = 'highshelf';
      biquad.frequency.value = 2000;
      biquad.gain.value = 15;
      lastNode.connect(biquad);
      lastNode = biquad;
    }

    if (effectName === 'robot') {
      // Distortion + ring modulator effect
      const dist = effectAudioCtx.createWaveShaper();
      const curve = new Float32Array(256);
      for(let i=0;i<256;i++) { const x=i*2/256-1; curve[i]=x<0?-1:1; }
      dist.curve = curve;
      dist.oversample = '4x';
      const gain = effectAudioCtx.createGain();
      gain.gain.value = 0.3;
      lastNode.connect(dist);
      dist.connect(gain);
      lastNode = gain;
    }

    if (effectName === 'cave') {
      // Reverb effect با convolver
      const convolver = effectAudioCtx.createConvolver();
      const bufLen = effectAudioCtx.sampleRate * 2;
      const buf = effectAudioCtx.createBuffer(2, bufLen, effectAudioCtx.sampleRate);
      for(let c=0;c<2;c++) {
        const d = buf.getChannelData(c);
        for(let i=0;i<bufLen;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/bufLen, 2);
      }
      convolver.buffer = buf;
      const wetGain = effectAudioCtx.createGain(); wetGain.gain.value = 0.6;
      const dryGain = effectAudioCtx.createGain(); dryGain.gain.value = 0.7;
      lastNode.connect(convolver);
      convolver.connect(wetGain);
      lastNode.connect(dryGain);
      const merger = effectAudioCtx.createGain();
      wetGain.connect(merger);
      dryGain.connect(merger);
      lastNode = merger;
    }

    if (effectName === 'radio') {
      // Band-pass filter برای صدای رادیویی
      const bp = effectAudioCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 0.7;
      const dist = effectAudioCtx.createWaveShaper();
      const c = new Float32Array(256);
      for(let i=0;i<256;i++){const x=i*2/256-1;c[i]=Math.tanh(x*3);}
      dist.curve = c;
      lastNode.connect(bp);
      bp.connect(dist);
      lastNode = dist;
    }

    // خروجی به stream
    const dest = effectAudioCtx.createMediaStreamDestination();
    lastNode.connect(dest);
    effectDestStream = dest.stream;

    // stream جدید رو به peer connections بده
    applyStreamToPeers(effectDestStream);
    showToast(VOICE_EFFECTS[effectName]?.label + ' فعال شد');
  } catch(e) {
    console.error('Voice effect error:', e);
    showToast('⚠️ خطا در اعمال افکت');
  }
}

function applyStreamToPeers(stream) {
  // track های جدید رو جایگزین track های قبلی توی peer connections می‌کنیم
  Object.values(peerConnections).forEach(pc => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
    if (sender) sender.replaceTrack(audioTrack).catch(()=>{});
  });
}

function buildVoiceEffectSelector() {
  const container = document.getElementById('voiceEffectSelector');
  if (!container) return;
  const cur = localStorage.getItem('gaphub_voice_effect') || 'none';
  container.innerHTML = Object.entries(VOICE_EFFECTS).map(([id, v]) =>
    `<button class="voice-effect-btn ${cur===id?'active':''}" onclick="applyVoiceEffect('${id}');updateVoiceEffectUI('${id}')">${v.label}</button>`
  ).join('');
}
function updateVoiceEffectUI(effectName) {
  document.querySelectorAll('.voice-effect-btn').forEach((b,i) => {
    b.classList.toggle('active', Object.keys(VOICE_EFFECTS)[i] === effectName);
  });
}

// ─── inject HTML elements جدید ───────────────────────────────────────
function injectPatchedHTML() {
  // Reply bar بالای input
  const inputArea = document.querySelector('.input-area');
  if (inputArea && !document.getElementById('replyBar')) {
    const bar = document.createElement('div');
    bar.id = 'replyBar';
    bar.className = 'reply-bar hidden';
    inputArea.insertBefore(bar, inputArea.firstChild);
  }

  // دکمه‌های جدید در input area
  if (inputArea && !document.getElementById('fileUploadBtn')) {
    const fileBtn = document.createElement('button');
    fileBtn.id = 'fileUploadBtn';
    fileBtn.className = 'icon-btn';
    fileBtn.title = 'آپلود فایل';
    fileBtn.textContent = '📎';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'chatFileInput';
    fileInput.accept = 'image/*,video/*,audio/*,.pdf,.zip,.txt,.doc,.docx';
    fileInput.style.display = 'none';
    inputArea.insertBefore(fileBtn, inputArea.querySelector('.msg-input'));
    inputArea.appendChild(fileInput);

    // دکمه جستجو
    const searchBtn = document.createElement('button');
    searchBtn.className = 'icon-btn';
    searchBtn.title = 'جستجو';
    searchBtn.textContent = '🔍';
    searchBtn.onclick = toggleSearch;
    inputArea.insertBefore(searchBtn, inputArea.querySelector('.send-btn'));
  }

  // Voice effect selector در ویس ویو
  const vcPanel = document.getElementById('vcPanel') || document.querySelector('.vc-bottom-bar');
  if (vcPanel && !document.getElementById('voiceEffectSelector')) {
    const sel = document.createElement('div');
    sel.id = 'voiceEffectSelector';
    sel.className = 'voice-effect-row';
    vcPanel.insertBefore(sel, vcPanel.firstChild);
    buildVoiceEffectSelector();
  }

  // Theme picker modal
  if (!document.getElementById('fullThemeModal')) {
    const modal = document.createElement('div');
    modal.id = 'fullThemeModal';
    modal.className = 'modal-overlay hidden';
    modal.dir = 'rtl';
    modal.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="m-title">🎨 انتخاب تم</div>
        <div id="fullThemePicker"></div>
        <button class="auth-btn" onclick="closeModal('fullThemeModal')" style="margin-top:16px">بستن</button>
      </div>`;
    document.body.appendChild(modal);
    buildFullThemePicker();
  }
}

// ─── scroll to msg ────────────────────────────────────────────────────
function openUserByName(username) {
  const user = Object.values(serverMembers[currentServerId]||{}).flat().find(m => m.username?.toLowerCase() === username.toLowerCase());
  if (user) openUserProfile(user.id);
}

// ─── Init همه چیز ─────────────────────────────────────────────────────
function initPatch() {
  injectPatchedHTML();
  initFileDrop();
  patchSocketEvents();
  buildVoiceEffectSelector();

  // بارگذاری تم ذخیره‌شده
  const savedExtra = localStorage.getItem('mtheme_extra');
  if (savedExtra) applyExtraTheme(savedExtra);

  // بارگذاری voice effect ذخیره‌شده
  currentVoiceEffect = localStorage.getItem('gaphub_voice_effect') || 'none';
}

// ─── اضافه کردن دکمه باز کردن تم modal به settings ───────────────────
function openThemeModal() {
  buildFullThemePicker();
  openModal('fullThemeModal');
}

// شروع بعد از load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initPatch, 800));
} else {
  setTimeout(initPatch, 800);
}
