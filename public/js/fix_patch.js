// GapHub Fix Patch — v2
(function() {
'use strict';

// ── جلوگیری از دو بار اجرا ──────────────────────────────────────
if (window.__gaphubPatchLoaded) return;
window.__gaphubPatchLoaded = true;

// ── selectChType ─────────────────────────────────────────────────
window.selectChType = function(type) {
  document.getElementById('chTypeText')?.classList.toggle('active', type==='text');
  document.getElementById('chTypeVoice')?.classList.toggle('active', type==='voice');
  const s = document.getElementById('newChType');
  if (s) s.value = type;
};

// ── compress image to max 300KB ──────────────────────────────────
function compressImage(dataUrl, maxW, maxH, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w=img.width, h=img.height;
      if (w>maxW||h>maxH) { const r=Math.min(maxW/w,maxH/h); w=Math.round(w*r); h=Math.round(h*r); }
      const c=document.createElement('canvas');
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg', quality||0.7));
    };
    img.src = dataUrl;
  });
}

// ── override uploadAvatar با compress ────────────────────────────
const _origUploadAvatar = window.uploadAvatar;
window.uploadAvatar = function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const compressed = await compressImage(ev.target.result, 256, 256, 0.7);
    window.me.avatarUrl = compressed;
    window.updateMyUI?.();
    const d = await window.api('/api/users/me','PATCH',{avatarUrl: compressed});
    if (d.ok) { window.me={...window.me,...d.user}; localStorage.setItem('mu',JSON.stringify(window.me)); window.showToast?.('عکس پروفایل آپلود شد ✅'); }
  };
  reader.readAsDataURL(file);
};

// ── override uploadServerIcon با compress ────────────────────────
window.uploadServerIcon = async function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const compressed = await compressImage(ev.target.result, 256, 256, 0.75);
    window.newServerIconUrl = compressed;
    // preview
    const prev = document.getElementById('srvIconPreview') || document.getElementById('newSrvIconPreview');
    if (prev) prev.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    window.showToast?.('آیکون آماده شد ✅');
  };
  reader.readAsDataURL(file);
};

// ── override previewNewServerIcon ────────────────────────────────
window.previewNewServerIcon = async function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const compressed = await compressImage(ev.target.result, 256, 256, 0.75);
    window.newServerIconUrl = compressed;
    const prev = document.getElementById('newSrvIconPreview');
    if (prev) prev.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  };
  reader.readAsDataURL(file);
};

// ── appendMessage پیشرفته ────────────────────────────────────────
window.appendMessage = function(msg, noScroll=false) {
  const a = document.getElementById('messagesArea');
  if (!a) return;
  const t = new Date(msg.time);
  const ts = `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const av = msg.avatarUrl
    ? `<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span>${msg.avatar||'?'}</span>`;

  const getRoleTag = () => {
    const member = (window.serverMembers?.[window.currentServerId]||[]).find(m=>m.id===msg.userId);
    if (!member) return '';
    return (window.serverRoles?.[window.currentServerId]||[])
      .filter(r=>member.roles?.includes(r.id))
      .map(r=>`<span class="role-badge" style="background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');
  };

  const replyBlock = msg.replyTo
    ? `<div class="reply-preview" onclick="scrollToMsg('${msg.replyTo.id}')">↩ <b>${esc2(msg.replyTo.username)}</b>: ${esc2((msg.replyTo.text||'').slice(0,60))}</div>`
    : '';

  const txt = renderMd(msg.text||'') + buildFileBlock(msg);
  const isMe = msg.userId === window.me?.id;
  const canDel = isMe || ['owner','admin','mod'].includes(window.myServerRole||'');

  const div = document.createElement('div');
  div.className = 'msg-group';
  div.id = `msg-${msg.id}`;
  div.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color||'#5865f2'},${msg.color||'#5865f2'}99)"
      onclick="openUserProfile('${msg.userId}')">${av}</div>
    <div class="msg-body">
      ${replyBlock}
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color||'#5865f2'}">${esc2(msg.username)}</span>
        ${getRoleTag()}
        <span class="msg-time">${ts}</span>
        ${msg.edited?'<span style="font-size:10px;color:var(--text-4)">(ویرایش)</span>':''}
      </div>
      <div class="msg-text" id="msgtxt-${msg.id}">${txt}</div>
      <div class="react-bar" id="rbar-${msg.id}"></div>
    </div>
    <div class="msg-actions">
      <button class="msg-act" onclick="toggleReactPicker('${msg.id}')">😀</button>
      <button class="msg-act" onclick="setReplyMsg('${msg.id}','${esc2(msg.username)}','${esc2((msg.text||'').slice(0,50))}')">↩</button>
      ${isMe?`<button class="msg-act" onclick="startEditMsg('${msg.id}')">✏️</button>`:''}
      ${canDel?`<button class="msg-act danger" onclick="deleteMsgById('${msg.id}')">🗑</button>`:''}
    </div>`;
  a.appendChild(div);
  if (!noScroll) a.scrollTop = a.scrollHeight;
};

function esc2(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function renderMd(raw) {
  if (!raw) return '';
  let t = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, (_,c)=>`<pre><code>${c.trim()}</code></pre>`);
  t = t.replace(/`([^`]+)`/g,'<code>$1</code>');
  t = t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g,'<em>$1</em>');
  t = t.replace(/~~(.+?)~~/g,'<s>$1</s>');
  t = t.replace(/\|\|(.+?)\|\|/g,'<span class="spoiler" onclick="this.classList.toggle(\'r\')">$1</span>');
  t = t.replace(/https?:\/\/[^\s<>"]+/g, url => {
    if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url))
      return `<br><img src="${url}" loading="lazy" onclick="openImgFull('${url}')" onerror="this.style.display='none'">`;
    return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
  });
  t = t.replace(/@(\w+)/g, (_,n) =>
    `<span style="color:var(--accent);background:rgba(88,101,242,.15);border-radius:3px;padding:0 3px;cursor:pointer">@${n}</span>`);
  return t.replace(/\n/g,'<br>');
}

function buildFileBlock(msg) {
  if (!msg.file) return '';
  const {data,name,type} = msg.file;
  if (type?.startsWith('image/'))
    return `<br><img src="${data}" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer" onclick="openImgFull('${data}')">`;
  return `<div class="file-attach">📎 <a href="${data}" download="${esc2(name)}" style="color:var(--accent)">${esc2(name)}</a></div>`;
}

window.openImgFull = function(src) {
  let m = document.getElementById('_imgFull');
  if (!m) {
    m = document.createElement('div');
    m.id = '_imgFull';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000c;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    m.onclick = ()=>m.style.display='none';
    document.body.appendChild(m);
  }
  m.innerHTML = `<img src="${src}" style="max-width:92vw;max-height:92vh;border-radius:8px;box-shadow:0 0 60px #000">`;
  m.style.display = 'flex';
};

// ── Socket events ────────────────────────────────────────────────
function hookSocket() {
  if (!window.socket || window.__socketHooked) return;
  window.__socketHooked = true;

  socket.on('message_deleted', ({channelId, msgId}) => {
    if (channelId !== window.currentChannelId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) { el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),300); }
  });
  socket.on('message_edited', ({channelId, msgId, newText}) => {
    if (channelId !== window.currentChannelId) return;
    const el = document.getElementById(`msgtxt-${msgId}`);
    if (el) el.innerHTML = renderMd(newText);
  });
  socket.on('reaction_update', ({channelId, msgId, reactions}) => {
    if (channelId !== window.currentChannelId) return;
    const bar = document.getElementById(`rbar-${msgId}`);
    if (!bar) return;
    bar.innerHTML = Object.entries(reactions||{}).map(([e,u])=>
      `<button class="react-btn ${u.includes(window.me?.id)?'mine':''}" onclick="sendReact('${msgId}','${e}')">${e} ${u.length}</button>`
    ).join('');
  });
}
setInterval(hookSocket, 1000);

// ── sendMessage override ─────────────────────────────────────────
let _replyTo = null, _editId = null;

window.setReplyMsg = function(id, username, text) {
  _replyTo = {id, username, text};
  const bar = document.getElementById('replyBar');
  if (bar) { bar.innerHTML=`<span>↩ <b>${username}</b>: ${text}</span><button onclick="clearReplyMsg()">✕</button>`;bar.classList.remove('hidden'); }
  document.getElementById('msgInput')?.focus();
};
window.clearReplyMsg = function() {
  _replyTo=null;
  document.getElementById('replyBar')?.classList.add('hidden');
};
window.startEditMsg = function(msgId) {
  const el = document.getElementById(`msgtxt-${msgId}`);
  const inp = document.getElementById('msgInput');
  if (!el||!inp) return;
  _editId = msgId;
  inp.value = el.innerText;
  inp.dataset.edit = '1';
  const bar = document.getElementById('replyBar');
  if (bar) { bar.innerHTML=`<span>✏️ ویرایش پیام</span><button onclick="cancelEditMsg()">✕</button>`;bar.classList.remove('hidden'); }
  inp.focus();
};
window.cancelEditMsg = function() {
  _editId=null;
  const inp=document.getElementById('msgInput');
  if(inp){inp.value='';delete inp.dataset.edit;}
  window.clearReplyMsg();
};
window.deleteMsgById = function(msgId) {
  window.socket?.emit('delete_message',{channelId:window.currentChannelId,msgId});
};

const _origSend = window.sendMessage;
window.sendMessage = function() {
  const inp = document.getElementById('msgInput');
  const text = inp?.value.trim();
  if (!text||!window.socket) return;
  if (inp.dataset.edit && _editId) {
    socket.emit('edit_message',{channelId:window.currentChannelId,msgId:_editId,newText:text});
    window.cancelEditMsg(); return;
  }
  const p = {channelId:window.currentChannelId, text};
  if (_replyTo) p.replyTo = _replyTo;
  socket.emit('message', p);
  inp.value='';
  window.clearReplyMsg();
};

// ── React picker ─────────────────────────────────────────────────
const REACTS = ['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀','🎵','💎'];
let _rpFor = null;
window.toggleReactPicker = function(msgId) {
  const ex = document.getElementById('_rp');
  if (ex && _rpFor===msgId) { ex.remove(); _rpFor=null; return; }
  ex?.remove();
  _rpFor = msgId;
  const msg = document.getElementById(`msg-${msgId}`);
  if (!msg) return;
  const pop = document.createElement('div');
  pop.id = '_rp';
  pop.style.cssText = 'position:absolute;z-index:300;bottom:calc(100% + 4px);right:0;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;box-shadow:0 8px 32px #0008;max-width:260px;';
  pop.innerHTML = REACTS.map(e=>`<button style="font-size:20px;background:none;border:none;cursor:pointer;padding:4px;border-radius:4px" onmouseenter="this.style.background='var(--bg-4)'" onmouseleave="this.style.background='none'" onclick="sendReact('${msgId}','${e}');closeRP()">${e}</button>`).join('');
  msg.style.position='relative';
  msg.appendChild(pop);
  setTimeout(()=>document.addEventListener('click',closeRPOut,{once:true}),50);
};
window.closeRP = function(){document.getElementById('_rp')?.remove();_rpFor=null;};
function closeRPOut(e){if(!e.target.closest('#_rp'))window.closeRP();}
window.sendReact = function(msgId,emoji){window.socket?.emit('react',{channelId:window.currentChannelId,msgId,emoji});};

// ── File upload ──────────────────────────────────────────────────
window.processFileUpload = function(file) {
  if (file.size>5e6){window.showToast?.('⚠️ حداکثر 5MB');return;}
  window.showToast?.('📤 آپلود...');
  const r=new FileReader();
  r.onload=ev=>window.socket?.emit('file_message',{channelId:window.currentChannelId,fileData:ev.target.result,fileName:file.name,fileType:file.type,text:''});
  r.readAsDataURL(file);
};

// ── Drag & drop ──────────────────────────────────────────────────
function initDrop() {
  const cv = document.getElementById('chatView');
  if (!cv || cv._dropInit) return;
  cv._dropInit = true;
  cv.addEventListener('dragover',e=>{e.preventDefault();cv.classList.add('drag-over');});
  cv.addEventListener('dragleave',()=>cv.classList.remove('drag-over'));
  cv.addEventListener('drop',e=>{e.preventDefault();cv.classList.remove('drag-over');const f=e.dataTransfer?.files[0];if(f)window.processFileUpload(f);});
}

// ── Reply bar inject ─────────────────────────────────────────────
function injectReplyBar() {
  if (document.getElementById('replyBar')) return;
  const bar = document.createElement('div');
  bar.id='replyBar'; bar.className='reply-bar hidden';
  const ia = document.querySelector('.input-area');
  if (ia) ia.insertAdjacentElement('afterbegin', bar);
}

// ── Resizable sidebar ─────────────────────────────────────────────
function initResizeSidebar() {
  const sidebar = document.querySelector('.ch-sidebar');
  if (!sidebar || sidebar._resizable) return;
  sidebar._resizable = true;

  const handle = document.createElement('div');
  handle.style.cssText = 'position:absolute;top:0;left:0;width:4px;height:100%;cursor:col-resize;z-index:10;';
  handle.title = 'برای تغییر عرض بکش';
  sidebar.style.position = 'relative';
  sidebar.appendChild(handle);

  let startX, startW;
  handle.addEventListener('mousedown', e => {
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, {once:true});
    e.preventDefault();
  });
  function onMove(e) {
    const delta = startX - e.clientX; // RTL: کشیدن به چپ = بزرگ‌تر
    const newW = Math.min(400, Math.max(150, startW + delta));
    sidebar.style.width = newW + 'px';
    sidebar.style.minWidth = newW + 'px';
    localStorage.setItem('gaphub_sw', newW);
  }
  function onUp() { document.removeEventListener('mousemove', onMove); }

  // بارگذاری عرض ذخیره‌شده
  const saved = localStorage.getItem('gaphub_sw');
  if (saved) { sidebar.style.width=saved+'px'; sidebar.style.minWidth=saved+'px'; }
}

// ── Member list position fix ──────────────────────────────────────
function fixMemberList() {
  const ml = document.getElementById('memberList');
  if (!ml) return;
  // اطمینان از اینکه داخل body هست نه داخل main-content
  if (ml.parentElement !== document.body && ml.parentElement?.className !== 'app') {
    document.querySelector('.app')?.appendChild(ml);
  }
}

// ── scrollToMsg ──────────────────────────────────────────────────
window.scrollToMsg = function(id) {
  const el=document.getElementById(`msg-${id}`);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}
};

// ── Voice Effects ────────────────────────────────────────────────
const VFX = {none:'🎤 معمولی',robot:'🤖 ربات',deep:'🎙 بم',high:'🐭 زیر',cave:'🏔 غار',radio:'📻 رادیو'};
let _fxCtx=null;
window.buildVoiceEffectSelector = function() {
  const c=document.getElementById('voiceEffectSelector');if(!c)return;
  const cur=localStorage.getItem('gaphub_vfx')||'none';
  c.innerHTML=Object.entries(VFX).map(([id,l])=>`<button class="voice-effect-btn${cur===id?' active':''}" onclick="applyVoiceEffect('${id}')">${l}</button>`).join('');
};
window.applyVoiceEffect = async function(fx) {
  localStorage.setItem('gaphub_vfx',fx);
  document.querySelectorAll('.voice-effect-btn').forEach((b,i)=>b.classList.toggle('active',Object.keys(VFX)[i]===fx));
  if(!window.localStream){window.showToast?.('ابتدا وارد ویس شو');return;}
  if(_fxCtx){try{_fxCtx.close();}catch(e){}}_fxCtx=null;
  if(fx==='none'){applyToPeers(window.localStream);window.showToast?.('🎤 معمولی');return;}
  try{
    _fxCtx=new AudioContext();
    let n=_fxCtx.createMediaStreamSource(window.localStream);
    if(fx==='deep'){const g=_fxCtx.createGain();g.gain.value=1.3;const b=_fxCtx.createBiquadFilter();b.type='lowshelf';b.frequency.value=200;b.gain.value=10;n.connect(b);b.connect(g);n=g;}
    if(fx==='high'){const b=_fxCtx.createBiquadFilter();b.type='highshelf';b.frequency.value=2000;b.gain.value=14;n.connect(b);n=b;}
    if(fx==='robot'){const w=_fxCtx.createWaveShaper();const c=new Float32Array(256);for(let i=0;i<256;i++){const x=i*2/256-1;c[i]=x<0?-1:1;}w.curve=c;w.oversample='4x';const g=_fxCtx.createGain();g.gain.value=.3;n.connect(w);w.connect(g);n=g;}
    if(fx==='cave'){const cv=_fxCtx.createConvolver();const bl=_fxCtx.sampleRate*2;const buf=_fxCtx.createBuffer(2,bl,_fxCtx.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<bl;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/bl,2);}cv.buffer=buf;const wg=_fxCtx.createGain();wg.gain.value=.5;n.connect(cv);cv.connect(wg);n=wg;}
    if(fx==='radio'){const b=_fxCtx.createBiquadFilter();b.type='bandpass';b.frequency.value=1800;b.Q.value=.7;n.connect(b);n=b;}
    const d=_fxCtx.createMediaStreamDestination();n.connect(d);applyToPeers(d.stream);
    window.showToast?.(VFX[fx]+' فعال شد');
  }catch(e){window.showToast?.('⚠️ خطا در افکت صدا');}
};
function applyToPeers(s){
  Object.values(window.peerConnections||{}).forEach(pc=>{
    const t=s.getAudioTracks()[0];if(!t)return;
    pc.getSenders().find(s=>s.track?.kind==='audio')?.replaceTrack(t).catch(()=>{});
  });
}

// ── Main init ────────────────────────────────────────────────────
function init() {
  injectReplyBar();
  initDrop();
  initResizeSidebar();
  fixMemberList();
}

// اجرا بعد از لود کامل
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ()=>setTimeout(init,800));
} else {
  setTimeout(init, 800);
}

// re-run بعد از login
const _os = window.startApp;
window.startApp = function() {
  _os?.();
  setTimeout(()=>{init();hookSocket();},2000);
};

})();

// ── Server Theme & SysIcons ──────────────────────────────────────
function applyServerTheme(theme) {
  if (!theme) return;
  const s = document.documentElement.style;
  // map از کلیدهای admin به CSS vars موجود
  const map = {
    '--bg-srv': '--bg-1',
    '--bg-ch':  '--bg-2',
    '--bg-chat':'--bg-3',
    '--bg-input':'--bg-4',
    '--accent': '--accent',
    '--green':  '--green',
    '--red':    '--red',
    '--t1':     '--text-1',
    '--t2':     '--text-2',
    '--t3':     '--text-3',
  };
  Object.entries(theme).forEach(([k,v]) => {
    const cssVar = map[k] || k;
    s.setProperty(cssVar, v);
  });
}

function applySysIcons(icons) {
  if (!icons) return;
  window.__sysIcons = icons;
  // می‌تونیم بعداً در render توابع استفاده کنیم
}

// Hook socket برای دریافت theme و icons
function hookThemeEvents() {
  if (!window.socket || window.__themeHooked) return;
  window.__themeHooked = true;

  socket.on('sysicons_updated', ({icons}) => {
    applySysIcons(icons);
  });

  socket.on('server_updated', ({serverId, theme, sysIcons}) => {
    if (serverId === window.currentServerId && theme) {
      applyServerTheme(theme);
    }
  });

  // بارگذاری theme سرور فعلی
  loadCurrentServerTheme();
}

async function loadCurrentServerTheme() {
  try {
    const r = await fetch(`/api/servers/${window.currentServerId||'default'}/theme`);
    const d = await r.json();
    if (d.ok && d.theme) applyServerTheme(d.theme);
  } catch(e) {}
}

// re-hook وقتی سرور عوض میشه
const _origSelectServer = window.selectServer;
window.selectServer = async function(id) {
  await _origSelectServer?.(id);
  setTimeout(loadCurrentServerTheme, 500);
};

setInterval(hookThemeEvents, 1500);
