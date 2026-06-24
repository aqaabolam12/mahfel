// GapHub Patch Final — runs after app.js fully loaded
(function waitForApp(){
  // صبر کن تا startApp اجرا بشه
  const _orig = window.startApp;
  window.startApp = function(){
    _orig?.();
    // اجرا بعد از 1.5 ثانیه تا همه چیز لود بشه
    setTimeout(applyPatches, 1500);
  };
  // اگه قبلاً startApp اجرا شده
  if(window.socket || window.me) setTimeout(applyPatches, 500);
})();

function applyPatches(){
  injectCSS();
  patchSaveProfile();
  patchUploadAvatar();
  patchServerIcon();
  patchScreenShare();
  patchSendMessage();
  patchAppendMessage();
  hookSocketEvents();
  initMemberList();
  initResizableSidebar();
  injectReplyBar();
  initFileDrop();
  loadServerTheme();
  // re-run هر بار که selectServer صدا زده میشه
  const _oSS = window.selectServer;
  window.selectServer = async function(id){
    await _oSS?.(id);
    setTimeout(loadServerTheme, 600);
  };
  console.log('✅ GapHub patches applied');
}

// ══════════════════════════════════════════════════════
// CSS INJECT
// ══════════════════════════════════════════════════════
function injectCSS(){
  if(document.getElementById('_ghCSS')) return;
  const s = document.createElement('style');
  s.id = '_ghCSS';
  s.textContent = `
    /* server-icon bridge */
    .server-icon{width:48px;height:48px;border-radius:50%;background:var(--bg-2,#2b2d31);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;overflow:hidden;position:relative;flex-shrink:0;margin:3px 0;}
    .server-icon:hover,.server-icon.active{border-radius:16px;}
    .server-icon.active{background:var(--accent,#5865f2);}

    /* member list — right side of screen */
    #memberList{
      position:fixed!important;top:0!important;right:0!important;bottom:0!important;
      width:240px!important;min-width:unset!important;
      background:var(--bg-2,#2b2d31)!important;
      z-index:55!important;overflow-y:auto!important;padding:16px 8px!important;
      box-shadow:-2px 0 16px rgba(0,0,0,.4)!important;
      border-left:1px solid rgba(255,255,255,.06)!important;
      transition:transform .2s!important;
    }
    #memberList.hidden{transform:translateX(100%)!important;display:flex!important;visibility:hidden!important;pointer-events:none!important;}
    #memberList:not(.hidden){transform:translateX(0)!important;visibility:visible!important;}

    /* member list items */
    .ml-user{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:4px;cursor:pointer;transition:.1s;}
    .ml-user:hover{background:var(--bg-4,#383a40);}
    .ml-uname{font-size:14px;font-weight:600;}
    .ml-section-title{font-size:11px;font-weight:700;color:var(--text-3,#80848e);text-transform:uppercase;letter-spacing:.6px;padding:12px 8px 4px;}
    .ml-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;overflow:hidden;flex-shrink:0;position:relative;}
    .ml-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
    .ml-avatar.online::after{content:'';position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;background:var(--green,#23a55a);border-radius:50%;border:2px solid var(--bg-2,#2b2d31);}

    /* resizable handle */
    ._rh{position:absolute;top:0;left:0;bottom:0;width:4px;cursor:col-resize;z-index:20;transition:.1s;background:transparent;}
    ._rh:hover,._rh:active{background:var(--accent,#5865f2);}

    /* reply bar */
    .reply-bar{display:flex!important;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-4,#383a40);font-size:13px;color:var(--text-2,#b5bac1);border-radius:8px 8px 0 0;}
    .reply-bar.hidden{display:none!important;}
    .reply-bar button{background:none;border:none;cursor:pointer;color:var(--text-3);font-size:16px;margin-right:auto;}

    /* msg actions */
    .msg-group{position:relative;}
    .msg-actions{position:absolute;top:-18px;right:4px;display:none;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:4px;gap:2px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:10;}
    .msg-group:hover .msg-actions{display:flex;}
    .msg-act{background:none;border:none;cursor:pointer;color:var(--text-3,#80848e);font-size:15px;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:.1s;}
    .msg-act:hover{background:var(--bg-4,#383a40);color:var(--text-1,#f2f3f5);}
    .msg-act.danger:hover{background:rgba(242,63,66,.15);color:#f87171;}

    /* react */
    .react-bar{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
    .react-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:2px 8px;font-size:13px;cursor:pointer;color:var(--text-2,#b5bac1);transition:.1s;}
    .react-btn:hover,.react-btn.mine{background:rgba(88,101,242,.2);border-color:var(--accent,#5865f2);}

    /* screen share overlay */
    #_ssOverlay{position:fixed;inset:0;background:#000;z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;}
    #_ssOverlay video{max-width:90vw;max-height:80vh;border-radius:8px;}
    #_ssOverlay .ss-bar{position:fixed;bottom:20px;display:flex;gap:8px;background:rgba(0,0,0,.8);padding:10px 20px;border-radius:12px;}
    #_ssOverlay .ss-btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;}

    /* voice effect */
    .voice-effect-row{display:flex;flex-wrap:wrap;gap:4px;padding:6px 12px;background:rgba(0,0,0,.2);}
    .voice-effect-btn{padding:4px 10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:var(--text-3,#80848e);cursor:pointer;font-size:12px;font-family:inherit;transition:.1s;}
    .voice-effect-btn:hover,.voice-effect-btn.active{border-color:var(--accent,#5865f2);color:var(--accent,#5865f2);}

    /* highlight */
    @keyframes _hl{0%{background:rgba(88,101,242,.25)}100%{background:transparent}}
    .msg-group.highlight{animation:_hl 2s ease;}
    .spoiler{background:var(--bg-5,#404249);color:transparent;border-radius:3px;padding:0 3px;cursor:pointer;}
    .spoiler.r{color:inherit;background:var(--bg-4,#383a40);}
    .file-attach{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.06);border-radius:4px;margin-top:6px;max-width:340px;}
  `;
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════
// SAVE PROFILE
// ══════════════════════════════════════════════════════
function patchSaveProfile(){
  window.saveProfile = async function(){
    const btn = document.querySelector('#profileModal .auth-btn:not(.sm):not(.danger-btn)');
    if(btn){btn.textContent='در حال ذخیره...';btn.disabled=true;}
    try{
      const bigAv = document.getElementById('profileAvatarBig');
      const img = bigAv?.querySelector('img');
      const avatarUrl = img?.src?.startsWith('data:') ? img.src : (window.me?.avatarUrl||null);
      const payload = {
        bio: document.getElementById('profileBio')?.value || '',
        status: document.getElementById('profileStatus')?.value || 'online',
        avatarUrl
      };
      const r = await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},body:JSON.stringify(payload)});
      const d = await r.json();
      if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
      if(d.ok){
        window.me = {...window.me,...d.user};
        if(avatarUrl)window.me.avatarUrl = avatarUrl;
        localStorage.setItem('mu',JSON.stringify(window.me));
        window.updateMyUI?.();
        window.closeModal?.('profileModal');
        window.showToast?.('✅ پروفایل ذخیره شد');
      } else {
        window.showToast?.('❌ خطا: '+(d.msg||''));
      }
    }catch(e){
      if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
      window.showToast?.('❌ خطا در اتصال');
      console.error('saveProfile:', e);
    }
  };
}

// ══════════════════════════════════════════════════════
// UPLOAD AVATAR
// ══════════════════════════════════════════════════════
function compressImg(dataUrl, size, q){
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w=img.width, h=img.height;
      if(w>size||h>size){const s=size/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg', q||.75));
    };
    img.src = dataUrl;
  });
}
function patchUploadAvatar(){
  window.uploadAvatar = function(e){
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = async ev => {
      const c = await compressImg(ev.target.result, 256, .75);
      const big = document.getElementById('profileAvatarBig');
      if(big){big.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;big.style.background='none';}
      const res = await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},body:JSON.stringify({avatarUrl:c})});
      const d = await res.json();
      if(d.ok){window.me={...window.me,...d.user,avatarUrl:c};localStorage.setItem('mu',JSON.stringify(window.me));window.updateMyUI?.();window.showToast?.('✅ عکس آپلود شد');}
    };
    r.readAsDataURL(file);
  };
}

// ══════════════════════════════════════════════════════
// SERVER ICON UPLOAD
// ══════════════════════════════════════════════════════
function patchServerIcon(){
  window.uploadServerIcon = function(e){
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = async ev => {
      const c = await compressImg(ev.target.result, 256, .8);
      window.newServerIconUrl = c;
      const prev = document.getElementById('srvIconPreview');
      if(prev) prev.innerHTML = `<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
      window.showToast?.('✅ آیکون آماده');
    };
    r.readAsDataURL(file);
  };
  window.previewNewServerIcon = function(e){
    const file = e.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = async ev => {
      const c = await compressImg(ev.target.result, 256, .8);
      window.newServerIconUrl = c;
      const prev = document.getElementById('newSrvIconPreview');
      if(prev) prev.innerHTML = `<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    };
    r.readAsDataURL(file);
  };
}

// ══════════════════════════════════════════════════════
// SCREEN SHARE — overlay approach
// ══════════════════════════════════════════════════════
function patchScreenShare(){
  // override startScreenShare
  window.startScreenShare = async function(){
    try{
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video:{frameRate:15,width:{ideal:1280},height:{ideal:720}},
        audio:false
      });
      window.screenStream = stream;
      window.isSharing = true;
      // نمایش در overlay
      showSSOverlay(stream, true);
      stream.getVideoTracks()[0].onended = () => window.stopScreenShare?.();
      window.socket?.emit('screen_share_start',{channelId:window.currentVoiceId});
      window.showToast?.('🖥 اشتراک صفحه شروع شد');
      const btn = document.getElementById('screenShareBtn');
      if(btn){btn.innerHTML='🔴 🖥';btn.style.color='#f23f42';}
    }catch(e){
      if(e.name !== 'NotAllowedError') window.showToast?.('خطا: '+e.message);
    }
  };

  // override stopScreenShare
  const _origStop = window.stopScreenShare;
  window.stopScreenShare = function(){
    window.isSharing = false;
    document.getElementById('_ssOverlay')?.remove();
    if(window.screenStream){window.screenStream.getTracks().forEach(t=>t.stop());window.screenStream=null;}
    Object.values(window.screenPCs||{}).forEach(pc=>pc.close());
    window.screenPCs = {};
    window.socket?.emit('screen_share_stop',{channelId:window.currentVoiceId});
    window.showToast?.('🖥 اشتراک صفحه متوقف شد');
    const btn = document.getElementById('screenShareBtn');
    if(btn){btn.innerHTML='🖥';btn.style.color='';}
  };

  // override createScreenPC
  window.createScreenPC = async function(toSocketId, asOfferer){
    const pc = new RTCPeerConnection({
      iceServers:[
        {urls:'stun:stun.l.google.com:19302'},
        {urls:'stun:stun1.l.google.com:19302'},
      ]
    });
    window.screenPCs = window.screenPCs||{};
    window.screenPCs[toSocketId] = pc;
    pc.onicecandidate = e => {
      if(e.candidate) window.socket?.emit('screen_ice',{to:toSocketId,candidate:e.candidate});
    };
    pc.ontrack = e => {
      const stream = e.streams[0]; if(!stream) return;
      showSSOverlay(stream, false);
    };
    if(asOfferer && window.screenStream){
      window.screenStream.getTracks().forEach(t=>pc.addTrack(t,window.screenStream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      window.socket?.emit('screen_offer',{to:toSocketId,offer});
    }
    return pc;
  };
}

function showSSOverlay(stream, isOwner){
  document.getElementById('_ssOverlay')?.remove();
  const ov = document.createElement('div');
  ov.id = '_ssOverlay';
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = isOwner;
  video.style.cssText = 'max-width:95vw;max-height:85vh;border-radius:8px;background:#000;';
  const bar = document.createElement('div');
  bar.className = 'ss-bar';
  bar.innerHTML = isOwner
    ? `<span style="color:#fff;font-size:14px">🖥 در حال اشتراک صفحه</span><button class="ss-btn" style="background:#f23f42;color:#fff" onclick="window.stopScreenShare?.();document.getElementById('_ssOverlay')?.remove()">⏹ توقف</button>`
    : `<span style="color:#fff;font-size:14px">👁 در حال تماشای صفحه</span><button class="ss-btn" style="background:var(--bg-4,#383a40);color:#fff" onclick="document.getElementById('_ssOverlay')?.remove()">✕ بستن</button>`;
  ov.appendChild(video);
  ov.appendChild(bar);
  document.body.appendChild(ov);
  video.play().catch(()=>{});
}

// ══════════════════════════════════════════════════════
// APPEND MESSAGE
// ══════════════════════════════════════════════════════
function patchAppendMessage(){
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function esc2(s){return String(s||'').replace(/'/g,"\\'");}
  function renderMd(raw){
    if(!raw)return'';
    let t=esc(raw);
    t=t.replace(/```[\w]*\n?([\s\S]*?)```/g,(_,c)=>`<pre style="background:var(--bg-1,#1e1f22);border-radius:4px;padding:10px;overflow-x:auto;margin:6px 0"><code>${c.trim()}</code></pre>`);
    t=t.replace(/`([^`]+)`/g,'<code style="background:rgba(0,0,0,.2);border-radius:3px;padding:0 4px;font-family:monospace">$1</code>');
    t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    t=t.replace(/\*(.+?)\*/g,'<em>$1</em>');
    t=t.replace(/~~(.+?)~~/g,'<s>$1</s>');
    t=t.replace(/\|\|(.+?)\|\|/g,'<span class="spoiler" onclick="this.classList.toggle(\'r\')">$1</span>');
    t=t.replace(/https?:\/\/[^\s<>"&]+/g,url=>{
      if(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url))
        return`<br><img src="${url}" loading="lazy" onclick="ghImgFull('${url}')" onerror="this.style.display='none'" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer">`;
      return`<a href="${url}" target="_blank" rel="noopener" style="color:#00aff4">${url}</a>`;
    });
    t=t.replace(/@(\w+)/g,(_,n)=>`<span style="color:var(--accent,#5865f2);background:rgba(88,101,242,.15);border-radius:3px;padding:0 3px">@${n}</span>`);
    return t.replace(/\n/g,'<br>');
  }
  function fileBlk(msg){
    if(!msg.file)return'';
    const{data,name,type}=msg.file;
    if(type?.startsWith('image/'))
      return`<br><img src="${data}" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer" onclick="ghImgFull('${data}')">`;
    return`<div class="file-attach">📎 <a href="${data}" download="${esc(name)}" style="color:var(--accent,#5865f2)">${esc(name)}</a></div>`;
  }
  window.ghImgFull = function(src){
    let m=document.getElementById('_im');
    if(!m){m=document.createElement('div');m.id='_im';m.style.cssText='position:fixed;inset:0;z-index:9999;background:#000d;display:flex;align-items:center;justify-content:center;cursor:zoom-out';m.onclick=()=>m.style.display='none';document.body.appendChild(m);}
    m.innerHTML=`<img src="${src}" style="max-width:92vw;max-height:92vh;border-radius:8px">`;
    m.style.display='flex';
  };
  window.appendMessage = function(msg, noScroll=false){
    const a=document.getElementById('messagesArea'); if(!a) return;
    const t=new Date(msg.time);
    const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
    const av=msg.avatarUrl
      ?`<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      :`<span>${esc(msg.avatar||msg.username?.[0]?.toUpperCase()||'?')}</span>`;
    const roleTag=(()=>{
      const m=(window.serverMembers?.[window.currentServerId]||[]).find(x=>x.id===msg.userId);
      if(!m)return'';
      return(window.serverRoles?.[window.currentServerId]||[]).filter(r=>m.roles?.includes(r.id))
        .map(r=>`<span style="font-size:11px;padding:1px 6px;border-radius:3px;background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');
    })();
    const replyBlk=msg.replyTo?`<div style="font-size:12px;color:var(--text-3,#80848e);padding:3px 8px;background:rgba(255,255,255,.04);border-radius:4px;border-right:2px solid var(--text-3,#80848e);margin-bottom:4px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="scrollToMsg('${msg.replyTo.id}')">↩ <b>${esc(msg.replyTo.username)}</b>: ${esc((msg.replyTo.text||'').slice(0,60))}</div>`:'';
    const isMe=msg.userId===window.me?.id;
    const canDel=isMe||['owner','admin','mod'].includes(window.myServerRole||'');
    const div=document.createElement('div');
    div.className='msg-group'; div.id=`msg-${msg.id}`;
    div.innerHTML=`
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${msg.color||'#5865f2'},${msg.color||'#5865f2'}99);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;overflow:hidden;margin-top:2px;cursor:pointer"
        onclick="window.openUserProfile?.('${msg.userId}')">${av}</div>
      <div style="flex:1;min-width:0">
        ${replyBlk}
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px;flex-wrap:wrap">
          <span style="color:${msg.color||'#5865f2'};font-size:15px;font-weight:600;cursor:pointer" onclick="window.openUserProfile?.('${msg.userId}')">${esc(msg.username)}</span>
          ${roleTag}
          <span style="font-size:11px;color:var(--text-4,#4e5058)">${ts}</span>
          ${msg.edited?'<span style="font-size:10px;color:var(--text-4,#4e5058)">(ویرایش)</span>':''}
        </div>
        <div id="msgtxt-${msg.id}" style="font-size:15px;color:var(--text-2,#b5bac1);line-height:1.6;word-break:break-word">${renderMd(msg.text||'')}${fileBlk(msg)}</div>
        <div class="react-bar" id="rbar-${msg.id}"></div>
      </div>
      <div class="msg-actions">
        <button class="msg-act" onclick="ghReact('${msg.id}')">😀</button>
        <button class="msg-act" onclick="ghReply('${msg.id}','${esc2(msg.username)}','${esc2((msg.text||'').slice(0,50))}')">↩</button>
        ${isMe?`<button class="msg-act" onclick="ghEdit('${msg.id}')">✏️</button>`:''}
        ${canDel?`<button class="msg-act danger" onclick="ghDel('${msg.id}')">🗑</button>`:''}
      </div>`;
    a.appendChild(div);
    if(!noScroll) a.scrollTop=a.scrollHeight;
  };
}

// ══════════════════════════════════════════════════════
// SEND MESSAGE PATCH
// ══════════════════════════════════════════════════════
let _rto=null, _eid=null;
const REACTS=['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀','🎵','💎'];

function patchSendMessage(){
  window.sendMessage = function(){
    const inp=document.getElementById('msgInput');
    const text=inp?.value.trim(); if(!text||!window.socket)return;
    if(inp.dataset.ghedit&&_eid){
      socket.emit('edit_message',{channelId:window.currentChannelId,msgId:_eid,newText:text});
      ghCancelEdit(); return;
    }
    const p={channelId:window.currentChannelId,text};
    if(_rto) p.replyTo=_rto;
    socket.emit('message',p); inp.value=''; ghClearReply();
  };
  window.ghReact=function(msgId){
    const ex=document.getElementById('_rp');
    if(ex&&ex.dataset.f===msgId){ex.remove();return;}
    ex?.remove();
    const msgEl=document.getElementById(`msg-${msgId}`); if(!msgEl)return;
    const pop=document.createElement('div'); pop.id='_rp'; pop.dataset.f=msgId;
    const rect=msgEl.getBoundingClientRect();
    pop.style.cssText=`position:fixed;z-index:500;top:${rect.top-56}px;right:${window.innerWidth-rect.right}px;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-width:280px;`;
    pop.innerHTML=REACTS.map(e=>`<button style="font-size:20px;background:none;border:none;cursor:pointer;padding:5px;border-radius:4px;transition:.1s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'" onclick="ghSendReact('${msgId}','${e}');document.getElementById('_rp')?.remove()">${e}</button>`).join('');
    document.body.appendChild(pop);
    setTimeout(()=>document.addEventListener('click',ev=>{if(!ev.target.closest('#_rp'))document.getElementById('_rp')?.remove();},{once:true}),80);
  };
  window.ghSendReact=function(id,e){window.socket?.emit('react',{channelId:window.currentChannelId,msgId:id,emoji:e});};
  window.ghReply=function(id,u,t){
    _rto={id,username:u,text:t};
    const bar=document.getElementById('replyBar');
    if(bar){bar.innerHTML=`<span>↩ <b>${u}</b>: ${t}</span><button onclick="ghClearReply()">✕</button>`;bar.classList.remove('hidden');}
    document.getElementById('msgInput')?.focus();
  };
  window.ghClearReply=function(){_rto=null;document.getElementById('replyBar')?.classList.add('hidden');};
  function ghCancelEdit(){_eid=null;const inp=document.getElementById('msgInput');if(inp){inp.value='';delete inp.dataset.ghedit;}window.ghClearReply();}
  window.ghEdit=function(id){
    const el=document.getElementById(`msgtxt-${id}`);
    const inp=document.getElementById('msgInput'); if(!el||!inp)return;
    _eid=id; inp.value=el.innerText; inp.dataset.ghedit='1';
    const bar=document.getElementById('replyBar');
    if(bar){bar.innerHTML=`<span>✏️ ویرایش</span><button onclick="ghCancelEdit()">✕</button>`;bar.classList.remove('hidden');}
    inp.focus();
  };
  window.ghDel=function(id){window.socket?.emit('delete_message',{channelId:window.currentChannelId,msgId:id});};
  window.scrollToMsg=function(id){const el=document.getElementById(`msg-${id}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}};
  window.ghImgFull=window.ghImgFull||function(src){let m=document.getElementById('_im');if(!m){m=document.createElement('div');m.id='_im';m.style.cssText='position:fixed;inset:0;z-index:9999;background:#000d;display:flex;align-items:center;justify-content:center;cursor:zoom-out';m.onclick=()=>m.style.display='none';document.body.appendChild(m);}m.innerHTML=`<img src="${src}" style="max-width:92vw;max-height:92vh;border-radius:8px">`;m.style.display='flex';};
}

// ══════════════════════════════════════════════════════
// SOCKET EVENTS
// ══════════════════════════════════════════════════════
function hookSocketEvents(){
  if(!window.socket||window.__pf_hooked)return;
  window.__pf_hooked=true;
  socket.on('message_deleted',({channelId,msgId})=>{
    if(channelId!==window.currentChannelId)return;
    const el=document.getElementById(`msg-${msgId}`);
    if(el){el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),300);}
  });
  socket.on('message_edited',({channelId,msgId,newText})=>{
    if(channelId!==window.currentChannelId)return;
    const el=document.getElementById(`msgtxt-${msgId}`);
    if(el&&window.appendMessage){
      // re-render با markdown
      const tmpMsg={text:newText};
      el.innerHTML=newText; // simple fallback
    }
  });
  socket.on('reaction_update',({channelId,msgId,reactions})=>{
    if(channelId!==window.currentChannelId)return;
    const bar=document.getElementById(`rbar-${msgId}`); if(!bar)return;
    bar.innerHTML=Object.entries(reactions||{}).map(([e,u])=>
      `<button class="react-btn${u.includes(window.me?.id)?' mine':''}" onclick="ghSendReact('${msgId}','${e}')">${e} ${u.length}</button>`).join('');
  });
  socket.on('server_updated',({serverId,theme})=>{if(serverId===window.currentServerId&&theme)applyTheme_(theme);});
  socket.on('sysicons_updated',({icons})=>{window.__sysIcons=icons;});
  // screen share signaling (اگه قبلاً hook نشده)
  if(!window.__ssHooked){
    window.__ssHooked=true;
    socket.on('screen_share_started',async({userId,username,socketId})=>{
      window.showToast?.(`🖥 ${username} داره صفحه‌ش رو نشون میده`);
      const pc=await window.createScreenPC(socketId,false);
      socket.emit('screen_request',{to:socketId});
    });
    socket.on('screen_share_stopped',()=>{
      document.getElementById('_ssOverlay')?.remove();
      window.showToast?.('🖥 اشتراک صفحه تموم شد');
    });
    socket.on('screen_request',async({from})=>{
      if(!window.isSharing||!window.screenStream)return;
      const pc=await window.createScreenPC(from,true);
    });
    socket.on('screen_offer',async({from,offer})=>{
      const pc=window.screenPCs?.[from];if(!pc)return;
      await pc.setRemoteDescription(offer);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('screen_answer',{to:from,answer});
    });
    socket.on('screen_answer',async({from,answer})=>{
      const pc=window.screenPCs?.[from];if(!pc)return;
      await pc.setRemoteDescription(answer);
    });
    socket.on('screen_ice',async({from,candidate})=>{
      const pc=window.screenPCs?.[from];if(!pc)return;
      try{await pc.addIceCandidate(candidate);}catch(e){}
    });
  }
}

// ══════════════════════════════════════════════════════
// MEMBER LIST
// ══════════════════════════════════════════════════════
function initMemberList(){
  const ml=document.getElementById('memberList');
  if(!ml)return;
  // مطمئن بشه داخل body هست نه داخل app
  if(ml.parentElement!==document.body){
    document.body.appendChild(ml);
  }
  // fix toggleMemberList که main content رو resize کنه
  const _orig=window.toggleMemberList;
  window.toggleMemberList=function(){
    const open=!ml.classList.contains('hidden');
    if(open){ml.classList.add('hidden');}
    else{ml.classList.remove('hidden');window.renderMemberList?.();}
    window.memberListOpen=!open;
  };
}

// ══════════════════════════════════════════════════════
// RESIZABLE SIDEBAR
// ══════════════════════════════════════════════════════
function initResizableSidebar(){
  const sb=document.querySelector('.ch-sidebar');
  if(!sb||sb._rz)return; sb._rz=true;
  sb.style.position='relative';
  const h=document.createElement('div');h.className='_rh';sb.appendChild(h);
  let sx,sw;
  h.addEventListener('mousedown',e=>{
    sx=e.clientX; sw=sb.offsetWidth; e.preventDefault();
    document.body.style.cursor='col-resize'; document.body.style.userSelect='none';
    const mm=ev=>{
      // RTL: کشیدن به چپ = بزرگتر
      const delta=sx-ev.clientX;
      const w=Math.min(400,Math.max(150,sw+delta));
      sb.style.width=w+'px'; sb.style.minWidth=w+'px';
      localStorage.setItem('_sbw',w);
    };
    const mu=()=>{
      document.removeEventListener('mousemove',mm);
      document.removeEventListener('mouseup',mu);
      document.body.style.cursor=''; document.body.style.userSelect='';
    };
    document.addEventListener('mousemove',mm);
    document.addEventListener('mouseup',mu);
  });
  const saved=localStorage.getItem('_sbw');
  if(saved){sb.style.width=saved+'px';sb.style.minWidth=saved+'px';}
}

// ══════════════════════════════════════════════════════
// REPLY BAR
// ══════════════════════════════════════════════════════
function injectReplyBar(){
  if(document.getElementById('replyBar'))return;
  const bar=document.createElement('div');
  bar.id='replyBar'; bar.className='reply-bar hidden';
  const ia=document.querySelector('.input-area');
  if(ia) ia.insertAdjacentElement('afterbegin',bar);
}

// ══════════════════════════════════════════════════════
// FILE DRAG & DROP
// ══════════════════════════════════════════════════════
function initFileDrop(){
  const cv=document.getElementById('chatView');
  if(!cv||cv._fd)return; cv._fd=true;
  cv.addEventListener('dragover',e=>{e.preventDefault();cv.style.outline='2px dashed var(--accent,#5865f2)';cv.style.outlineOffset='-8px';});
  cv.addEventListener('dragleave',()=>{cv.style.outline='';cv.style.outlineOffset='';});
  cv.addEventListener('drop',e=>{e.preventDefault();cv.style.outline='';cv.style.outlineOffset='';const f=e.dataTransfer?.files[0];if(f)pfUpload(f);});
  const fi=document.getElementById('chatFileInput');
  if(fi) fi.onchange=e=>{if(e.target.files[0])pfUpload(e.target.files[0]);};
}
function pfUpload(file){
  if(file.size>5e6){window.showToast?.('⚠️ حداکثر 5MB');return;}
  window.showToast?.('📤 آپلود...');
  const r=new FileReader();
  r.onload=ev=>window.socket?.emit('file_message',{channelId:window.currentChannelId,fileData:ev.target.result,fileName:file.name,fileType:file.type,text:''});
  r.readAsDataURL(file);
}
window.processFileUpload=pfUpload;

// ══════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════
function applyTheme_(t){
  if(!t)return;
  const map={'--bg-srv':'--bg-1','--bg-ch':'--bg-2','--bg-chat':'--bg-3','--bg-input':'--bg-4','--acc':'--accent','--accent':'--accent','--t1':'--text-1','--t2':'--text-2','--t3':'--text-3','--green':'--green','--red':'--red'};
  const s=document.documentElement.style;
  Object.entries(t).forEach(([k,v])=>s.setProperty(map[k]||k,v));
}
async function loadServerTheme(){
  try{
    const r=await fetch(`/api/servers/${window.currentServerId||'default'}/theme`);
    const d=await r.json();
    if(d.ok&&d.theme)applyTheme_(d.theme);
  }catch(e){}
}

// ══════════════════════════════════════════════════════
// MISC
// ══════════════════════════════════════════════════════
window.selectChType=function(t){
  document.getElementById('chTypeText')?.classList.toggle('active',t==='text');
  document.getElementById('chTypeVoice')?.classList.toggle('active',t==='voice');
  const s=document.getElementById('newChType');if(s)s.value=t;
};
