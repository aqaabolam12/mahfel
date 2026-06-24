// GapHub Patch v5 — Final Fix
(function(){
'use strict';
if(window.__ghp5)return;
window.__ghp5=true;

// ── CSS کامل ──────────────────────────────────────────────────
const st=document.createElement('style');
st.id='_ghp5css';
st.textContent=`
  /* server-icon bridge */
  .server-icon{width:48px;height:48px;border-radius:50%;background:var(--bg-2,#2b2d31);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;overflow:hidden;flex-shrink:0;margin:3px 0;position:relative;}
  .server-icon:hover,.server-icon.active{border-radius:16px;}
  .server-icon.active{background:var(--accent,#5865f2);}

  /* نام کاربری در vc - کوچکتر */
  .vc-name{font-size:12px!important;font-weight:500!important;color:var(--text-2,#b5bac1)!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;text-align:center;}
  .vc-card{background:var(--bg-4,#383a40);border-radius:8px;padding:16px 10px;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:130px;max-width:160px;}
  .vc-avatar{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;overflow:hidden;border:3px solid transparent;transition:.15s;flex-shrink:0;}
  .vc-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
  .vc-avatar.speaking{border-color:var(--green,#23a55a);box-shadow:0 0 0 3px rgba(35,165,90,.3);}
  .vc-participants{display:flex;flex-wrap:wrap;gap:12px;padding:8px;align-items:flex-start;}

  /* member list — draggable right panel */
  #memberList{
    position:fixed!important;top:0!important;right:0!important;bottom:0!important;
    width:var(--ml-w,240px)!important;min-width:unset!important;
    background:var(--bg-2,#2b2d31)!important;z-index:55!important;
    overflow-y:auto!important;padding:16px 8px!important;
    box-shadow:-2px 0 16px rgba(0,0,0,.4)!important;
    border-left:1px solid rgba(255,255,255,.06)!important;
    transition:transform .2s!important;
    user-select:none;
  }
  #memberList.hidden{transform:translateX(100%)!important;visibility:hidden!important;pointer-events:none!important;}
  #memberList:not(.hidden){transform:translateX(0)!important;visibility:visible!important;}
  #_mlResizer{position:absolute;top:0;left:0;bottom:0;width:5px;cursor:col-resize;background:transparent;z-index:10;transition:.1s;}
  #_mlResizer:hover,#_mlResizer.dragging{background:var(--accent,#5865f2);}

  /* sidebar resize handle */
  #_sbResizer{position:absolute;top:0;left:0;bottom:0;width:5px;cursor:col-resize;background:transparent;z-index:10;transition:.1s;}
  #_sbResizer:hover,#_sbResizer.dragging{background:var(--accent,#5865f2);}

  /* ml items */
  .ml-user{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:4px;cursor:pointer;transition:.1s;}
  .ml-user:hover{background:var(--bg-4,#383a40);}
  .ml-uname{font-size:14px;font-weight:600;}
  .ml-section-title{font-size:11px;font-weight:700;color:var(--text-3,#80848e);text-transform:uppercase;letter-spacing:.6px;padding:12px 8px 4px;}
  .ml-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;overflow:hidden;flex-shrink:0;position:relative;}
  .ml-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
  .ml-avatar.online::after{content:'';position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;background:var(--green,#23a55a);border-radius:50%;border:2px solid var(--bg-2,#2b2d31);}

  /* reply bar */
  .reply-bar{display:flex!important;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-4,#383a40);font-size:13px;color:var(--text-2,#b5bac1);border-radius:8px 8px 0 0;}
  .reply-bar.hidden{display:none!important;}
  .reply-bar button{background:none;border:none;cursor:pointer;color:var(--text-3);font-size:16px;margin-right:auto;}

  /* msg actions */
  .msg-group{position:relative;display:flex;gap:16px;padding:2px 16px;transition:background .05s;}
  .msg-group:hover{background:rgba(0,0,0,.06);}
  .msg-actions{position:absolute;top:-18px;left:8px;display:none;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:4px;gap:2px;box-shadow:0 4px 16px rgba(0,0,0,.5);z-index:10;}
  .msg-group:hover .msg-actions{display:flex;}
  .msg-act{background:none;border:none;cursor:pointer;color:var(--text-3,#80848e);font-size:15px;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:.1s;}
  .msg-act:hover{background:var(--bg-4,#383a40);color:var(--text-1,#f2f3f5);}
  .msg-act.danger:hover{background:rgba(242,63,66,.15);color:#f87171;}

  /* react */
  .react-bar{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
  .react-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:2px 8px;font-size:13px;cursor:pointer;color:var(--text-2,#b5bac1);transition:.1s;}
  .react-btn:hover,.react-btn.mine{background:rgba(88,101,242,.2);border-color:var(--accent,#5865f2);}

  /* screen share overlay */
  #_ssOv{position:fixed;inset:0;background:#000e;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;}
  #_ssOv video{max-width:94vw;max-height:82vh;border-radius:8px;background:#000;}
  #_ssOv .ss-bar{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.8);padding:10px 20px;border-radius:12px;}
  #_ssOv .ss-btn{padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;}

  @keyframes _hl{0%{background:rgba(88,101,242,.25)}100%{background:transparent}}
  .msg-group.highlight{animation:_hl 2s ease;}
  .spoiler{background:var(--bg-5,#404249);color:transparent;border-radius:3px;padding:0 3px;cursor:pointer;}
  .spoiler.r{color:inherit;background:var(--bg-4,#383a40);}
  .file-attach{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.06);border-radius:4px;margin-top:6px;max-width:340px;}

  /* voice effect */
  .voice-effect-row{display:flex;flex-wrap:wrap;gap:4px;padding:6px 12px;background:rgba(0,0,0,.2);}
  .voice-effect-btn{padding:4px 10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:var(--text-3,#80848e);cursor:pointer;font-size:12px;font-family:inherit;transition:.1s;}
  .voice-effect-btn:hover,.voice-effect-btn.active{border-color:var(--accent,#5865f2);color:var(--accent,#5865f2);background:rgba(88,101,242,.1);}
`;
document.head.appendChild(st);

// ── Helpers ───────────────────────────────────────────────────
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function esc2(s){return String(s||'').replace(/'/g,"\\'");}
function compressImg(dataUrl,size,q){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');
      let w=img.width,h=img.height;
      if(w>size||h>size){const s=size/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',q||.75));
    };
    img.src=dataUrl;
  });
}

// ── Save Profile ──────────────────────────────────────────────
function patchProfile(){
  window.saveProfile=async function(){
    const btn=document.querySelector('#profileModal .auth-btn:not(.sm):not(.danger-btn)');
    if(btn){btn.textContent='در حال ذخیره...';btn.disabled=true;}
    try{
      const bigAv=document.getElementById('profileAvatarBig');
      const img=bigAv?.querySelector('img');
      const avatarUrl=img?.src?.startsWith('data:')?img.src:(window.me?.avatarUrl||null);
      const d=await(await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},body:JSON.stringify({bio:document.getElementById('profileBio')?.value||'',status:document.getElementById('profileStatus')?.value||'online',avatarUrl})})).json();
      if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
      if(d.ok){
        window.me={...window.me,...d.user};
        if(avatarUrl)window.me.avatarUrl=avatarUrl;
        localStorage.setItem('mu',JSON.stringify(window.me));
        window.updateMyUI?.();window.closeModal?.('profileModal');window.showToast?.('✅ پروفایل ذخیره شد');
      }else window.showToast?.('❌ '+(d.msg||'خطا'));
    }catch(e){if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}window.showToast?.('❌ خطا در اتصال');}
  };

  window.uploadAvatar=function(e){
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=async ev=>{
      const c=await compressImg(ev.target.result,256,.75);
      const big=document.getElementById('profileAvatarBig');
      if(big){big.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;big.style.background='none';}
      const d=await(await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},body:JSON.stringify({avatarUrl:c})})).json();
      if(d.ok){window.me={...window.me,...d.user,avatarUrl:c};localStorage.setItem('mu',JSON.stringify(window.me));window.updateMyUI?.();window.showToast?.('✅ عکس آپلود شد');}
    };
    r.readAsDataURL(file);
  };

  window.uploadServerIcon=function(e){
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=async ev=>{
      const c=await compressImg(ev.target.result,256,.8);
      window.newServerIconUrl=c;
      const prev=document.getElementById('srvIconPreview');
      if(prev)prev.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
      window.showToast?.('✅ آیکون آماده');
    };r.readAsDataURL(file);
  };

  window.previewNewServerIcon=function(e){
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();
    r.onload=async ev=>{
      const c=await compressImg(ev.target.result,256,.8);
      window.newServerIconUrl=c;
      const prev=document.getElementById('newSrvIconPreview');
      if(prev)prev.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    };r.readAsDataURL(file);
  };
}

// ── Screen Share — Overlay ────────────────────────────────────
function patchScreenShare(){
  window.startScreenShare=async function(){
    try{
      const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:15,width:{ideal:1280},height:{ideal:720}},audio:false});
      window.screenStream=stream;window.isSharing=true;
      showSSOverlay(stream,true);
      stream.getVideoTracks()[0].onended=()=>window.stopScreenShare?.();
      window.socket?.emit('screen_share_start',{channelId:window.currentVoiceId});
      window.showToast?.('🖥 اشتراک صفحه شروع شد');
      const btn=document.getElementById('screenShareBtn');
      if(btn){btn.innerHTML='🔴🖥';btn.style.color='#f23f42';}
    }catch(e){if(e.name!=='NotAllowedError')window.showToast?.('خطا: '+e.message);}
  };

  window.stopScreenShare=function(){
    window.isSharing=false;
    document.getElementById('_ssOv')?.remove();
    window.screenStream?.getTracks().forEach(t=>t.stop());window.screenStream=null;
    Object.values(window.screenPCs||{}).forEach(pc=>pc.close());window.screenPCs={};
    window.socket?.emit('screen_share_stop',{channelId:window.currentVoiceId});
    window.showToast?.('🖥 اشتراک صفحه متوقف شد');
    const btn=document.getElementById('screenShareBtn');
    if(btn){btn.innerHTML='🖥';btn.style.color='';}
  };

  window.createScreenPC=async function(toSocketId,asOfferer){
    // ICE servers از سرور بگیر (با TURN برای شبکه‌های پیچیده)
    const iceServers = await getIceServers();
    const pc=new RTCPeerConnection({iceServers, bundlePolicy:'max-bundle'});
    window.screenPCs=window.screenPCs||{};
    window.screenPCs[toSocketId]=pc;
    pc.onicecandidate=e=>{if(e.candidate)window.socket?.emit('screen_ice',{to:toSocketId,candidate:e.candidate});};
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='disconnected'){delete window.screenPCs[toSocketId];}};
    pc.ontrack=e=>{const s=e.streams[0];if(s)showSSOverlay(s,false);};
    if(asOfferer&&window.screenStream){
      window.screenStream.getTracks().forEach(t=>pc.addTrack(t,window.screenStream));
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      window.socket?.emit('screen_offer',{to:toSocketId,offer});
    }
    return pc;
  };

  function getIceServers(){
    return new Promise(resolve=>{
      const fallback=[
        {urls:'stun:stun.l.google.com:19302'},
        {urls:'stun:stun1.l.google.com:19302'},
        {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
        {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
        {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
      ];
      const t=setTimeout(()=>resolve(fallback),3000);
      window.socket?.emit('get_ice_servers');
      window.socket?.once('ice_servers',({iceServers})=>{clearTimeout(t);resolve(iceServers);});
    });
  }
  window.__getIceServers=getIceServers;
}

function showSSOverlay(stream,isOwner){
  document.getElementById('_ssOv')?.remove();
  document.getElementById('_ssMini')?.remove();

  let isMini=false;
  const ov=document.createElement('div');ov.id='_ssOv';
  ov.style.cssText='position:fixed;inset:0;background:#000e;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;';

  const vid=document.createElement('video');
  vid.srcObject=stream;vid.autoplay=true;vid.playsInline=true;vid.muted=isOwner;
  vid.style.cssText='max-width:94vw;max-height:82vh;border-radius:8px;background:#000;';

  // viewers counter
  window.__ssViewers=window.__ssViewers||new Set();
  if(!isOwner) window.__ssViewers.add('me');

  const bar=document.createElement('div');
  bar.style.cssText='display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.8);padding:10px 20px;border-radius:12px;flex-wrap:wrap;justify-content:center;';

  const viewerSpan=document.createElement('span');
  viewerSpan.id='_ssViewSpan';
  viewerSpan.style.cssText='color:#aaa;font-size:13px;';
  viewerSpan.textContent=isOwner?`👁 ${window.__ssViewers.size} بیننده`:'';

  // mini toggle
  const toggleBtn=document.createElement('button');
  toggleBtn.textContent='⛶ کوچک/بزرگ';
  toggleBtn.style.cssText='padding:8px 16px;border:none;border-radius:6px;cursor:pointer;background:#383a40;color:#fff;font-size:14px;font-family:inherit;';
  toggleBtn.onclick=()=>{
    isMini=!isMini;
    if(isMini){
      ov.style.cssText='position:fixed;bottom:20px;right:20px;width:300px;height:180px;z-index:9999;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px #000;';
      vid.style.cssText='width:100%;height:100%;object-fit:cover;';
      bar.style.display='none';
    } else {
      ov.style.cssText='position:fixed;inset:0;background:#000e;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;';
      vid.style.cssText='max-width:94vw;max-height:82vh;border-radius:8px;background:#000;';
      bar.style.display='flex';
    }
  };
  // double click to toggle
  vid.ondblclick=()=>toggleBtn.onclick();

  if(isOwner){
    const stopBtn=document.createElement('button');
    stopBtn.textContent='⏹ توقف';
    stopBtn.style.cssText='padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;background:#f23f42;color:#fff;';
    stopBtn.onclick=()=>window.stopScreenShare?.();
    bar.appendChild(document.createElement('span')).textContent='🖥 در حال اشتراک صفحه';
    bar.lastChild.style.cssText='color:#fff;font-size:14px;';
    bar.appendChild(viewerSpan);
    bar.appendChild(toggleBtn);
    bar.appendChild(stopBtn);
  } else {
    const closeBtn=document.createElement('button');
    closeBtn.textContent='✕ بستن';
    closeBtn.style.cssText='padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;background:#383a40;color:#fff;';
    closeBtn.onclick=()=>{ov.remove();};
    const lbl=document.createElement('span');
    lbl.textContent='👁 در حال تماشا';lbl.style.cssText='color:#fff;font-size:14px;';
    bar.appendChild(lbl);
    bar.appendChild(toggleBtn);
    bar.appendChild(closeBtn);
  }

  ov.appendChild(vid);ov.appendChild(bar);
  document.body.appendChild(ov);
  vid.play().catch(()=>{});

  // update viewer count برای owner
  if(!isOwner){
    socket?.emit?.('ss_viewer_join',{});
  }
}

// ── appendMessage ─────────────────────────────────────────────
function patchMessages(){
  function renderMd(raw){
    if(!raw)return'';
    let t=esc(raw);
    t=t.replace(/```[\w]*\n?([\s\S]*?)```/g,(_,c)=>`<pre style="background:var(--bg-1,#1e1f22);border-radius:4px;padding:10px;overflow-x:auto;margin:6px 0;direction:ltr"><code>${c.trim()}</code></pre>`);
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
    if(type?.startsWith('image/'))return`<br><img src="${data}" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer" onclick="ghImgFull('${data}')">`;
    return`<div class="file-attach">📎 <a href="${data}" download="${esc(name)}" style="color:var(--accent,#5865f2)">${esc(name)}</a></div>`;
  }
  window.ghImgFull=function(src){
    let m=document.getElementById('_im');
    if(!m){m=document.createElement('div');m.id='_im';m.style.cssText='position:fixed;inset:0;z-index:9999;background:#000d;display:flex;align-items:center;justify-content:center;cursor:zoom-out';m.onclick=()=>m.style.display='none';document.body.appendChild(m);}
    m.innerHTML=`<img src="${src}" style="max-width:92vw;max-height:92vh;border-radius:8px">`;m.style.display='flex';
  };
  window.appendMessage=function(msg,noScroll=false){
    const a=document.getElementById('messagesArea');if(!a)return;
    const t=new Date(msg.time);
    const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
    const av=msg.avatarUrl?`<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span>${esc(msg.avatar||msg.username?.[0]?.toUpperCase()||'?')}</span>`;
    const roleTag=(()=>{const m=(window.serverMembers?.[window.currentServerId]||[]).find(x=>x.id===msg.userId);if(!m)return'';return(window.serverRoles?.[window.currentServerId]||[]).filter(r=>m.roles?.includes(r.id)).map(r=>`<span style="font-size:11px;padding:1px 6px;border-radius:3px;background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');})();
    const replyBlk=msg.replyTo?`<div style="font-size:12px;color:var(--text-3,#80848e);padding:3px 8px;background:rgba(255,255,255,.04);border-radius:4px;border-right:2px solid var(--text-3,#80848e);margin-bottom:4px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="scrollToMsg('${msg.replyTo.id}')">↩ <b>${esc(msg.replyTo.username)}</b>: ${esc((msg.replyTo.text||'').slice(0,60))}</div>`:'';
    const isMe=msg.userId===window.me?.id;
    const canDel=isMe||['owner','admin','mod'].includes(window.myServerRole||'');
    const div=document.createElement('div');div.className='msg-group';div.id=`msg-${msg.id}`;
    div.innerHTML=`
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${msg.color||'#5865f2'},${msg.color||'#5865f2'}99);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;overflow:hidden;margin-top:2px;cursor:pointer" onclick="window.openUserProfile?.('${msg.userId}')">${av}</div>
      <div style="flex:1;min-width:0">
        ${replyBlk}
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px;flex-wrap:wrap">
          <span style="color:${msg.color||'#5865f2'};font-size:15px;font-weight:600;cursor:pointer" onclick="window.openUserProfile?.('${msg.userId}')">${esc(msg.username)}</span>
          ${roleTag}<span style="font-size:11px;color:var(--text-4,#4e5058)">${ts}</span>
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
    if(!noScroll)a.scrollTop=a.scrollHeight;
  };
}

// ── Actions ───────────────────────────────────────────────────
let _rto=null,_eid=null;
const REACTS=['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀','🎵','💎'];
function patchActions(){
  window.sendMessage=function(){
    const inp=document.getElementById('msgInput');const text=inp?.value.trim();if(!text||!window.socket)return;
    if(inp.dataset.ghedit&&_eid){socket.emit('edit_message',{channelId:window.currentChannelId,msgId:_eid,newText:text});ghCancelEdit();return;}
    const p={channelId:window.currentChannelId,text};if(_rto)p.replyTo=_rto;
    socket.emit('message',p);inp.value='';ghClearReply();
  };
  window.ghReact=function(msgId){
    const ex=document.getElementById('_rp');if(ex&&ex.dataset.f===msgId){ex.remove();return;}ex?.remove();
    const msgEl=document.getElementById(`msg-${msgId}`);if(!msgEl)return;
    const pop=document.createElement('div');pop.id='_rp';pop.dataset.f=msgId;
    const rect=msgEl.getBoundingClientRect();
    pop.style.cssText=`position:fixed;z-index:600;top:${Math.max(4,rect.top-56)}px;left:${Math.min(rect.left,window.innerWidth-300)}px;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-width:280px;`;
    pop.innerHTML=REACTS.map(e=>`<button style="font-size:20px;background:none;border:none;cursor:pointer;padding:5px;border-radius:4px" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'" onclick="ghSendReact('${msgId}','${e}');document.getElementById('_rp')?.remove()">${e}</button>`).join('');
    document.body.appendChild(pop);
    setTimeout(()=>document.addEventListener('click',ev=>{if(!ev.target.closest('#_rp'))document.getElementById('_rp')?.remove();},{once:true}),80);
  };
  window.ghSendReact=function(id,e){window.socket?.emit('react',{channelId:window.currentChannelId,msgId:id,emoji:e});};
  window.ghReply=function(id,u,t){_rto={id,username:u,text:t};const bar=document.getElementById('replyBar');if(bar){bar.innerHTML=`<span>↩ <b>${u}</b>: ${t}</span><button onclick="ghClearReply()">✕</button>`;bar.classList.remove('hidden');}document.getElementById('msgInput')?.focus();};
  window.ghClearReply=function(){_rto=null;document.getElementById('replyBar')?.classList.add('hidden');};
  function ghCancelEdit(){_eid=null;const inp=document.getElementById('msgInput');if(inp){inp.value='';delete inp.dataset.ghedit;}window.ghClearReply();}
  window.ghEdit=function(id){const el=document.getElementById(`msgtxt-${id}`);const inp=document.getElementById('msgInput');if(!el||!inp)return;_eid=id;inp.value=el.innerText;inp.dataset.ghedit='1';const bar=document.getElementById('replyBar');if(bar){bar.innerHTML=`<span>✏️ ویرایش</span><button onclick="ghCancelEdit()">✕</button>`;bar.classList.remove('hidden');}inp.focus();};
  window.ghDel=function(id){window.socket?.emit('delete_message',{channelId:window.currentChannelId,msgId:id});};
  window.scrollToMsg=function(id){const el=document.getElementById(`msg-${id}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}};
  window.selectChType=function(t){document.getElementById('chTypeText')?.classList.toggle('active',t==='text');document.getElementById('chTypeVoice')?.classList.toggle('active',t==='voice');const s=document.getElementById('newChType');if(s)s.value=t;};
}

// ── Socket Events ─────────────────────────────────────────────
function hookSocket(){
  if(!window.socket||window.__ghS5)return;window.__ghS5=true;
  socket.on('message_deleted',({channelId,msgId})=>{if(channelId!==window.currentChannelId)return;const el=document.getElementById(`msg-${msgId}`);if(el){el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),300);}});
  socket.on('message_edited',({channelId,msgId,newText})=>{if(channelId!==window.currentChannelId)return;const el=document.getElementById(`msgtxt-${msgId}`);if(el)el.innerHTML=newText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');});
  socket.on('reaction_update',({channelId,msgId,reactions})=>{if(channelId!==window.currentChannelId)return;const bar=document.getElementById(`rbar-${msgId}`);if(!bar)return;bar.innerHTML=Object.entries(reactions||{}).map(([e,u])=>`<button class="react-btn${u.includes(window.me?.id)?' mine':''}" onclick="ghSendReact('${msgId}','${e}')">${e} ${u.length}</button>`).join('');});
  socket.on('server_updated',({serverId,theme})=>{if(serverId===window.currentServerId&&theme)applyTheme(theme);});
  if(!window.__ssHk){window.__ssHk=true;
    // وقتی کسی شیر میکنه → به viewer نشون بده (با دکمه، نه خودکار)
    socket.on('screen_share_started',async({userId,username,socketId})=>{
      if(userId===window.me?.id)return; // خودمیم، نیازی نیست
      // toast با دکمه برای دیدن
      const t=document.createElement('div');
      t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#5865f2;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;z-index:999;font-family:inherit;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.5);white-space:nowrap';
      t.textContent=`🖥 ${username} داره صفحه‌ش رو نشون میده — کلیک کن ببینی`;
      t.onclick=async()=>{
        t.remove();
        window._pendingScreen=socketId;
        const pc=await window.createScreenPC(socketId,false);
        socket.emit('screen_request',{to:socketId});
      };
      document.body.appendChild(t);
      setTimeout(()=>t.remove(),15000);
      window.showToast?.(`🖥 ${username} داره صفحه‌ش رو نشون میده`);
    });
    socket.on('screen_share_stopped',()=>{document.getElementById('_ssOv')?.remove();window._pendingScreen=null;window.showToast?.('🖥 اشتراک صفحه تموم شد');});
    // sharer: viewer درخواست داد → offer بفرست
    socket.on('screen_request',async({from})=>{if(!window.isSharing||!window.screenStream)return;await window.createScreenPC(from,true);});
    socket.on('screen_offer',async({from,offer})=>{
      let pc=window.screenPCs?.[from];
      if(!pc)pc=await window.createScreenPC(from,false); // اگه PC نبود بساز
      if(pc.signalingState!=='stable'){
        await pc.setRemoteDescription(offer);
        const ans=await pc.createAnswer();
        await pc.setLocalDescription(ans);
        socket.emit('screen_answer',{to:from,answer:ans});
      }
    });
    socket.on('screen_answer',async({from,answer})=>{const pc=window.screenPCs?.[from];if(!pc)return;if(pc.signalingState==='have-local-offer')await pc.setRemoteDescription(answer);});
    socket.on('screen_ice',async({from,candidate})=>{const pc=window.screenPCs?.[from];if(!pc)return;try{await pc.addIceCandidate(candidate);}catch(e){}});
  }
}

// ── Draggable Member List ─────────────────────────────────────
function initMemberList(){
  const ml=document.getElementById('memberList');if(!ml)return;
  if(ml.parentElement!==document.body)document.body.appendChild(ml);
  // resizer handle
  if(!document.getElementById('_mlResizer')){
    const h=document.createElement('div');h.id='_mlResizer';ml.appendChild(h);
    let sx,sw;
    h.addEventListener('mousedown',e=>{
      sx=e.clientX;sw=ml.offsetWidth;h.classList.add('dragging');
      document.body.style.cursor='col-resize';document.body.style.userSelect='none';
      const mm=ev=>{
        const delta=sx-ev.clientX;
        const w=Math.min(500,Math.max(180,sw+delta));
        ml.style.setProperty('--ml-w',w+'px');
        ml.style.width=w+'px';
        localStorage.setItem('_mlw',w);
      };
      const mu=()=>{h.classList.remove('dragging');document.body.style.cursor='';document.body.style.userSelect='';document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
      document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
      e.preventDefault();
    });
  }
  const saved=localStorage.getItem('_mlw');
  if(saved){ml.style.width=saved+'px';ml.style.setProperty('--ml-w',saved+'px');}
  // fix toggle
  window.toggleMemberList=function(){
    const open=!ml.classList.contains('hidden');
    ml.classList.toggle('hidden',open);
    window.memberListOpen=!open;
    if(!open)window.renderMemberList?.();
  };
}

// ── Draggable Sidebar ─────────────────────────────────────────
function initSidebar(){
  const sb=document.querySelector('.ch-sidebar');if(!sb||sb._rz)return;sb._rz=true;
  sb.style.position='relative';
  const h=document.createElement('div');h.id='_sbResizer';sb.appendChild(h);
  let sx,sw;
  h.addEventListener('mousedown',e=>{
    sx=e.clientX;sw=sb.offsetWidth;h.classList.add('dragging');
    document.body.style.cursor='col-resize';document.body.style.userSelect='none';
    const mm=ev=>{const d=sx-ev.clientX;const w=Math.min(400,Math.max(150,sw+d));sb.style.width=w+'px';sb.style.minWidth=w+'px';localStorage.setItem('_sbw',w);};
    const mu=()=>{h.classList.remove('dragging');document.body.style.cursor='';document.body.style.userSelect='';document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};
    document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);
    e.preventDefault();
  });
  const saved=localStorage.getItem('_sbw');if(saved){sb.style.width=saved+'px';sb.style.minWidth=saved+'px';}
}

// ── Reply Bar ─────────────────────────────────────────────────
function injectReplyBar(){
  if(document.getElementById('replyBar'))return;
  const bar=document.createElement('div');bar.id='replyBar';bar.className='reply-bar hidden';
  const ia=document.querySelector('.input-area');if(ia)ia.insertAdjacentElement('afterbegin',bar);
}

// ── File Drop ─────────────────────────────────────────────────
function initFileDrop(){
  const cv=document.getElementById('chatView');if(!cv||cv._fd)return;cv._fd=true;
  cv.addEventListener('dragover',e=>{e.preventDefault();cv.style.outline='2px dashed var(--accent,#5865f2)';cv.style.outlineOffset='-8px';});
  cv.addEventListener('dragleave',()=>{cv.style.outline='';cv.style.outlineOffset='';});
  cv.addEventListener('drop',e=>{e.preventDefault();cv.style.outline='';cv.style.outlineOffset='';const f=e.dataTransfer?.files[0];if(f)pfUp(f);});
  const fi=document.getElementById('chatFileInput');if(fi)fi.onchange=e=>{if(e.target.files[0])pfUp(e.target.files[0]);};
}
function pfUp(file){
  if(file.size>5e6){window.showToast?.('⚠️ حداکثر 5MB');return;}
  window.showToast?.('📤 آپلود...');
  const r=new FileReader();r.onload=ev=>window.socket?.emit('file_message',{channelId:window.currentChannelId,fileData:ev.target.result,fileName:file.name,fileType:file.type,text:''});r.readAsDataURL(file);
}
window.processFileUpload=pfUp;

// ── Theme ─────────────────────────────────────────────────────
function applyTheme(t){if(!t)return;const map={'--bg-srv':'--bg-1','--bg-ch':'--bg-2','--bg-chat':'--bg-3','--bg-input':'--bg-4','--acc':'--accent','--accent':'--accent','--t1':'--text-1','--t2':'--text-2','--t3':'--text-3','--green':'--green','--red':'--red'};const s=document.documentElement.style;Object.entries(t).forEach(([k,v])=>s.setProperty(map[k]||k,v));}
async function loadTheme(){try{const r=await fetch(`/api/servers/${window.currentServerId||'default'}/theme`);const d=await r.json();if(d.ok&&d.theme)applyTheme(d.theme);}catch(e){}}

// ── Voice Quality Fix (TURN + audio constraints) ──────────────
function patchVoiceQuality(){
  // override joinVoice برای گرفتن میکروفون با کیفیت بهتر
  const _origJV=window.joinVoice;
  window.joinVoice=async function(channelId){
    // سعی کن getUserMedia با تنظیمات بهتر صدا
    try{
      const constraints={
        audio:{
          echoCancellation:true,
          noiseSuppression:true,
          autoGainControl:true,
          channelCount:1,
          sampleRate:48000,
          sampleSize:16,
        }
      };
      // ذخیره stream جدید
      if(!window.localStream||window.localStream.getTracks().every(t=>t.readyState==='ended')){
        window.localStream=await navigator.mediaDevices.getUserMedia(constraints);
      }
    }catch(e){console.warn('voice getUserMedia:',e);}
    return _origJV?.(channelId);
  };

  // override createPeerConnection (اگه وجود داشت) برای TURN
  const _origCPC=window.createPeerConnection||window.__createPeerConnection;
  window.createPeerConnection=async function(toSocketId, asOfferer){
    const iceServers=await window.__getIceServers?.() || [
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
      {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
      {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
    ];
    // اگه تابع اصلی داشت و PC ساخت، return کن
    if(_origCPC) return _origCPC(toSocketId, asOfferer);
    // وگرنه خودمون بسازیم
    const pc=new RTCPeerConnection({iceServers, bundlePolicy:'max-bundle'});
    pc.onicecandidate=e=>{if(e.candidate)window.socket?.emit('rtc_candidate',{to:toSocketId,candidate:e.candidate});};
    pc.ontrack=e=>{
      const stream=e.streams[0];if(!stream)return;
      // صدا رو پخش کن
      let audio=document.getElementById(`audio-${toSocketId}`);
      if(!audio){audio=document.createElement('audio');audio.id=`audio-${toSocketId}`;audio.autoplay=true;audio.style.display='none';document.body.appendChild(audio);}
      audio.srcObject=stream;
    };
    return pc;
  };
}

// ── Create Server Channel Fix ──────────────────────────────────
function patchAddChannel(){
  window.addChannel=async function(){
    const name=document.getElementById('newChName')?.value?.trim();
    const type=document.getElementById('newChType')?.value||'text';
    if(!name){window.showToast?.('❌ اسم کانال رو بنویس');return;}
    const serverId=window.currentServerId;
    if(!serverId){window.showToast?.('❌ سرور انتخاب نشده');return;}
    const r=await fetch(`/api/servers/${serverId}/channels`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},
      body:JSON.stringify({name,type})
    });
    const d=await r.json();
    if(d.ok){
      window.showToast?.('✅ کانال ساخته شد');
      window.closeModal?.('addChannelModal');
      const inp=document.getElementById('newChName');if(inp)inp.value='';
      // اگه channel_created از socket نیومد، خودمون اضافه کن
      setTimeout(()=>{
        const srv=window.servers?.find(s=>s.id===serverId);
        if(srv&&d.channel&&!srv.channels?.find(c=>c.id===d.channel.id)){
          if(!srv.channels)srv.channels=[];
          srv.channels.push(d.channel);
          window.renderChannels?.(srv);
        }
      },500);
    }else{
      window.showToast?.('❌ '+(d.msg||'خطا در ساخت کانال'));
    }
  };
}

// ── Error message from server ──────────────────────────────────
function hookErrorMsg(){
  if(!window.socket||window.__errHooked)return;
  window.__errHooked=true;
  socket.on('error_msg',({text})=>window.showToast?.(text));
}

// ── Init ──────────────────────────────────────────────────────
function run(){
  patchProfile();patchScreenShare();patchMessages();patchActions();
  injectReplyBar();initFileDrop();initMemberList();initSidebar();
  hookSocket();loadTheme();
  // fix‌های جدید
  patchVoiceQuality();
  patchAddChannel();
  hookErrorMsg();
}

// صبر تا app.js کامل لود بشه
const _oApp=window.startApp;
window.startApp=function(){
  _oApp?.();
  setTimeout(run,1500);
};
const _oSS=window.selectServer;
window.selectServer=async function(id){await _oSS?.(id);setTimeout(loadTheme,600);};

// اگه قبلاً login شده
if(window.me||window.socket)setTimeout(run,500);
// fallback
setTimeout(run,3000);
setInterval(hookSocket,2000);

})();
