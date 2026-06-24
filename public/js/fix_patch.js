// ── FIX PATCH - جایگزین app_patch.js ──────────────────────────

// selectChType
function selectChType(type) {
  document.getElementById('chTypeText')?.classList.toggle('active', type === 'text');
  document.getElementById('chTypeVoice')?.classList.toggle('active', type === 'voice');
  const sel = document.getElementById('newChType');
  if (sel) sel.value = type;
}

// fix injectPatchedHTML - نسخه ساده‌تر بدون insertBefore
function injectPatchedHTML() {
  // Reply bar
  if (!document.getElementById('replyBar')) {
    const bar = document.createElement('div');
    bar.id = 'replyBar';
    bar.className = 'reply-bar hidden';
    const inputArea = document.querySelector('.input-area');
    if (inputArea) inputArea.insertAdjacentElement('afterbegin', bar);
  }
  // File upload input
  if (!document.getElementById('chatFileInput')) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.id = 'chatFileInput';
    inp.accept = 'image/*,video/*,audio/*,.pdf,.zip,.txt';
    inp.style.display = 'none';
    inp.onchange = e => { if (e.target.files[0]) processFileUpload(e.target.files[0]); };
    document.body.appendChild(inp);
  }
  // کلیک دکمه 📎
  const fileBtn = document.querySelector('.input-icon-btn[onclick*="chatFileInput"]');
  if (fileBtn) {
    fileBtn.onclick = () => document.getElementById('chatFileInput').click();
  }
  // Voice effect در vc bottom
  if (!document.getElementById('voiceEffectSelector')) {
    const vcBottom = document.querySelector('.vc-bottom');
    if (vcBottom) {
      const sel = document.createElement('div');
      sel.id = 'voiceEffectSelector';
      sel.className = 'voice-effect-row';
      vcBottom.insertAdjacentElement('beforebegin', sel);
      buildVoiceEffectSelector();
    }
  }
}

// پیام کامل با markdown
const _origAppendMessage = window.appendMessage;
window.appendMessage = function(msg, noScroll=false) {
  const a = document.getElementById('messagesArea');
  if (!a) return _origAppendMessage && _origAppendMessage(msg, noScroll);
  
  const t = new Date(msg.time);
  const ts = `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;

  const av = msg.avatarUrl
    ? `<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<span>${msg.avatar||'?'}</span>`;

  const getRoleTag = () => {
    const srv = (window.myServers||[]).find(s => s.id === (window.currentServerId||'default'));
    if (!srv) return '';
    const member = (window.serverMembers?.[window.currentServerId]||[]).find(m => m.id === msg.userId);
    if (!member) return '';
    const roles = (window.serverRoles?.[window.currentServerId]||[]).filter(r => member.roles?.includes(r.id));
    return roles.map(r => `<span class="role-badge" style="background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');
  };

  const replyBlock = msg.replyTo
    ? `<div class="reply-preview">↩ <strong>${(msg.replyTo.username||'').replace(/</g,'&lt;')}</strong>: ${(msg.replyTo.text||'').slice(0,60).replace(/</g,'&lt;')}</div>`
    : '';

  const editedTag = msg.edited ? `<span style="font-size:10px;color:var(--text-4);margin-right:4px">(ویرایش)</span>` : '';

  const renderedText = renderMdText(msg.text || '');
  const fileBlock = buildFileBlock(msg);
  const reactBar = `<div class="react-bar" id="rbar-${msg.id}"></div>`;

  const isMe = msg.userId === (window.me||{}).id;
  const canDel = isMe || ['owner','admin','mod'].includes(window.myServerRole||'');

  const div = document.createElement('div');
  div.className = 'msg-group';
  div.id = `msg-${msg.id}`;
  div.innerHTML = `
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color||'#5865f2'},${msg.color||'#5865f2'}cc)"
      onclick="openUserProfile('${msg.userId}')">${av}</div>
    <div class="msg-body">
      ${replyBlock}
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color||'#5865f2'}"
          onclick="openUserProfile('${msg.userId}')">${(msg.username||'').replace(/</g,'&lt;')}</span>
        ${getRoleTag()}
        <span class="msg-time">${ts}</span>
        ${editedTag}
      </div>
      <div class="msg-text" id="msgtxt-${msg.id}">${renderedText}${fileBlock}</div>
      ${reactBar}
    </div>
    <div class="msg-actions">
      <button class="msg-act" title="ری‌اکشن" onclick="toggleReactPicker('${msg.id}')">😀</button>
      <button class="msg-act" title="ریپلای" onclick="setReply('${msg.id}','${(msg.username||'').replace(/'/g,"\\'")}','${(msg.text||'').slice(0,50).replace(/'/g,"\\'")}')">↩</button>
      ${isMe ? `<button class="msg-act" title="ویرایش" onclick="startEdit('${msg.id}')">✏️</button>` : ''}
      ${canDel ? `<button class="msg-act danger" title="حذف" onclick="deleteMsg('${msg.id}','${window.currentChannelId||''}')">🗑</button>` : ''}
    </div>`;
  a.appendChild(div);
  if (!noScroll) a.scrollTop = a.scrollHeight;
};

function renderMdText(raw) {
  if (!raw) return '';
  let t = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_,l,c) => `<pre><code>${c.trim()}</code></pre>`);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/~~(.+?)~~/g, '<s>$1</s>');
  t = t.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'r\')">$1</span>');
  t = t.replace(/https?:\/\/[^\s<>"]+/g, url => {
    if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url))
      return `<br><img src="${url}" loading="lazy" onerror="this.style.display=\'none\'" onclick="openImgModal(\'${url}\')">`;
    return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
  });
  t = t.replace(/@(\w+)/g, (m, n) => {
    const isMe = window.me && n.toLowerCase() === (window.me.username||'').toLowerCase();
    return `<span style="color:var(--accent);font-weight:600;background:rgba(88,101,242,.12);border-radius:3px;padding:0 3px;cursor:pointer" onclick="openUserByName('${n}')">@${n}</span>`;
  });
  return t.replace(/\n/g,'<br>');
}

function buildFileBlock(msg) {
  if (!msg.file) return '';
  const {data, name, type} = msg.file;
  if (type && type.startsWith('image/'))
    return `<br><img src="${data}" style="max-width:360px;max-height:300px;border-radius:4px;margin-top:6px;cursor:pointer;display:block" onclick="openImgModal('${data}')">`;
  return `<div class="file-attach">📎 <a href="${data}" download="${name}" style="color:var(--accent)">${name}</a></div>`;
}

// Socket events
let _patchSocketDone = false;
function patchSocketEvents() {
  if (_patchSocketDone || !window.socket) return;
  _patchSocketDone = true;

  socket.on('message_deleted', ({channelId, msgId}) => {
    if (channelId !== window.currentChannelId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) { el.style.opacity='0'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }
  });

  socket.on('message_edited', ({channelId, msgId, newText}) => {
    if (channelId !== window.currentChannelId) return;
    const el = document.getElementById(`msgtxt-${msgId}`);
    if (el) el.innerHTML = renderMdText(newText);
  });

  socket.on('reaction_update', ({channelId, msgId, reactions}) => {
    if (channelId !== window.currentChannelId) return;
    const bar = document.getElementById(`rbar-${msgId}`);
    if (!bar || !reactions) return;
    bar.innerHTML = Object.entries(reactions).map(([e,u]) =>
      `<button class="react-btn ${u.includes(window.me?.id)?'mine':''}" onclick="sendReact('${msgId}','${e}')">${e} ${u.length}</button>`
    ).join('');
  });
}

// Reply
let replyTo = null;
function setReply(id, username, text) {
  replyTo = {id, username, text};
  const bar = document.getElementById('replyBar');
  if (bar) {
    bar.innerHTML = `<span>↩ <strong>${username}</strong>: ${text}</span><button onclick="clearReply()">✕</button>`;
    bar.classList.remove('hidden');
  }
  document.getElementById('msgInput')?.focus();
}
function clearReply() {
  replyTo = null;
  const bar = document.getElementById('replyBar');
  if (bar) bar.classList.add('hidden');
}

// Edit
let editingMsgId = null;
function startEdit(msgId) {
  const el = document.getElementById(`msgtxt-${msgId}`);
  const inp = document.getElementById('msgInput');
  if (!el || !inp) return;
  editingMsgId = msgId;
  inp.value = el.innerText;
  inp.dataset.editMode = '1';
  const bar = document.getElementById('replyBar');
  if (bar) {
    bar.innerHTML = `<span>✏️ ویرایش پیام</span><button onclick="cancelEdit()">✕</button>`;
    bar.classList.remove('hidden');
  }
  inp.focus();
}
function cancelEdit() {
  editingMsgId = null;
  const inp = document.getElementById('msgInput');
  if (inp) { inp.value=''; delete inp.dataset.editMode; }
  clearReply();
}
function deleteMsg(msgId, channelId) {
  window.socket?.emit('delete_message', {channelId, msgId});
}

// Override sendMessage
const __origSend = window.sendMessage;
window.sendMessage = function() {
  const inp = document.getElementById('msgInput');
  const text = inp?.value.trim();
  if (!text || !window.socket) return;
  if (inp.dataset.editMode && editingMsgId) {
    socket.emit('edit_message', {channelId: window.currentChannelId, msgId: editingMsgId, newText: text});
    cancelEdit(); return;
  }
  const payload = {channelId: window.currentChannelId, text};
  if (replyTo) payload.replyTo = replyTo;
  socket.emit('message', payload);
  inp.value = '';
  clearReply();
};

// React
const QUICK_R = ['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀'];
let reactFor = null;
function toggleReactPicker(msgId) {
  const ex = document.getElementById('_rp');
  if (ex && reactFor === msgId) { ex.remove(); reactFor=null; return; }
  if (ex) ex.remove();
  reactFor = msgId;
  const msgEl = document.getElementById(`msg-${msgId}`);
  if (!msgEl) return;
  const pop = document.createElement('div');
  pop.id = '_rp';
  pop.className = 'react-picker';
  pop.style.cssText = 'position:absolute;z-index:200;bottom:100%;right:0';
  pop.innerHTML = QUICK_R.map(e=>`<button onclick="sendReact('${msgId}','${e}');closeReactPicker()">${e}</button>`).join('');
  msgEl.style.position='relative';
  msgEl.appendChild(pop);
  setTimeout(()=>document.addEventListener('click',closeRPOut,{once:true}),100);
}
function closeReactPicker(){document.getElementById('_rp')?.remove();reactFor=null;}
function closeRPOut(e){if(!e.target.closest('#_rp'))closeReactPicker();}
function sendReact(msgId,emoji){window.socket?.emit('react',{channelId:window.currentChannelId,msgId,emoji});}

// File upload
function processFileUpload(file) {
  if (file.size > 5_000_000) { window.showToast?.('⚠️ فایل بیشتر از 5MB'); return; }
  window.showToast?.('📤 در حال آپلود...');
  const r = new FileReader();
  r.onload = ev => socket?.emit('file_message',{channelId:window.currentChannelId,fileData:ev.target.result,fileName:file.name,fileType:file.type,text:''});
  r.readAsDataURL(file);
}

// Image modal
function openImgModal(src) {
  let m = document.getElementById('_imgM');
  if (!m) {
    m = document.createElement('div');
    m.id = '_imgM';
    m.style.cssText='position:fixed;inset:0;z-index:9999;background:#000c;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    m.onclick = ()=>m.remove();
    document.body.appendChild(m);
  }
  m.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px">`;
}

// Drag & drop
function initDragDrop() {
  const cv = document.getElementById('chatView');
  if (!cv) return;
  cv.addEventListener('dragover', e=>{e.preventDefault();cv.classList.add('drag-over');});
  cv.addEventListener('dragleave', ()=>cv.classList.remove('drag-over'));
  cv.addEventListener('drop', e=>{
    e.preventDefault();cv.classList.remove('drag-over');
    const f = e.dataTransfer?.files[0];
    if (f) processFileUpload(f);
  });
}

function openUserByName(n){
  const u=Object.values(window.serverMembers||{}).flat().find(m=>m.username?.toLowerCase()===n.toLowerCase());
  if(u) window.openUserProfile?.(u.id);
}

function scrollToMsg(id){
  const el=document.getElementById(`msg-${id}`);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}
}

// Voice effects
const V_FX = {none:'🎤 معمولی',robot:'🤖 ربات',deep:'🎙 بم',high:'🐭 زیر',cave:'🏔 غار',radio:'📻 رادیو'};
let curFX='none', fxCtx=null;
function buildVoiceEffectSelector(){
  const c=document.getElementById('voiceEffectSelector');if(!c)return;
  const cur=localStorage.getItem('gaphub_vfx')||'none';
  c.innerHTML=Object.entries(V_FX).map(([id,l])=>`<button class="voice-effect-btn ${cur===id?'active':''}" onclick="applyVoiceEffect('${id}')">${l}</button>`).join('');
}
async function applyVoiceEffect(fx){
  curFX=fx;localStorage.setItem('gaphub_vfx',fx);
  document.querySelectorAll('.voice-effect-btn').forEach((b,i)=>b.classList.toggle('active',Object.keys(V_FX)[i]===fx));
  if(!window.localStream){window.showToast?.('ابتدا وارد ویس شو');return;}
  if(fxCtx){try{fxCtx.close();}catch(e){}fxCtx=null;}
  if(fx==='none'){applyStreamToPeers(window.localStream);window.showToast?.('🎤 بدون افکت');return;}
  try{
    fxCtx=new AudioContext({sampleRate:44100});
    let node=fxCtx.createMediaStreamSource(window.localStream);
    if(fx==='deep'||fx==='robot'){
      const g=fxCtx.createGain();g.gain.value=fx==='robot'?.3:1.3;
      const b=fxCtx.createBiquadFilter();b.type='lowshelf';b.frequency.value=200;b.gain.value=10;
      node.connect(b);b.connect(g);node=g;
    }
    if(fx==='high'){const b=fxCtx.createBiquadFilter();b.type='highshelf';b.frequency.value=2000;b.gain.value=14;node.connect(b);node=b;}
    if(fx==='cave'){
      const cv=fxCtx.createConvolver();const bl=fxCtx.sampleRate*2;
      const buf=fxCtx.createBuffer(2,bl,fxCtx.sampleRate);
      for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<bl;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/bl,2);}
      cv.buffer=buf;const wg=fxCtx.createGain();wg.gain.value=.5;const dg=fxCtx.createGain();dg.gain.value=.7;
      node.connect(cv);cv.connect(wg);node.connect(dg);const mg=fxCtx.createGain();wg.connect(mg);dg.connect(mg);node=mg;
    }
    if(fx==='radio'){const b=fxCtx.createBiquadFilter();b.type='bandpass';b.frequency.value=1800;b.Q.value=.7;node.connect(b);node=b;}
    const dest=fxCtx.createMediaStreamDestination();node.connect(dest);
    applyStreamToPeers(dest.stream);window.showToast?.(V_FX[fx]+' فعال شد');
  }catch(e){window.showToast?.('⚠️ خطا در افکت');}
}
function applyStreamToPeers(s){
  Object.values(window.peerConnections||{}).forEach(pc=>{
    const t=s.getAudioTracks()[0];if(!t)return;
    const sd=pc.getSenders().find(s=>s.track?.kind==='audio');
    if(sd)sd.replaceTrack(t).catch(()=>{});
  });
}

// init
function runPatch(){
  injectPatchedHTML();
  initDragDrop();
  patchSocketEvents();
  buildVoiceEffectSelector();
  // re-check socket every 500ms
  if(!window.socket) setTimeout(()=>{patchSocketEvents();},1000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(runPatch,1000));
else setTimeout(runPatch,1000);

// re-patch socket after login
const __origStart=window.startApp;
window.startApp=function(){
  __origStart?.();
  setTimeout(()=>{patchSocketEvents();runPatch();},2000);
};
