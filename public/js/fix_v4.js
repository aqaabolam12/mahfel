// GapHub Fix v4 — Complete All Bugs
(function(){
'use strict';
if(window.__ghv4)return;
window.__ghv4=true;

// ══════════════════════════════════════════════════════
// 1. CSS CLASS BRIDGE: server-icon ↔ srv-icon
// ══════════════════════════════════════════════════════
const bridgeStyle=document.createElement('style');
bridgeStyle.textContent=`
  /* Bridge old server-icon class to new srv-icon */
  .server-icon{
    width:48px;height:48px;border-radius:50%;
    background:var(--bg-2,#2b2d31);
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;transition:all .15s;overflow:hidden;
    position:relative;flex-shrink:0;margin:3px 0;
  }
  .server-icon:hover,.server-icon.active{border-radius:16px;}
  .server-icon.active{background:var(--accent,#5865f2);}

  /* member list fix — right side */
  #memberList{
    position:fixed!important;
    top:0!important;right:0!important;bottom:0!important;
    width:240px!important;min-width:unset!important;
    background:var(--bg-2,#2b2d31)!important;
    z-index:60!important;
    overflow-y:auto!important;
    padding:16px 8px!important;
    box-shadow:-2px 0 12px rgba(0,0,0,.3)!important;
    border-left:1px solid rgba(255,255,255,.06)!important;
    transition:transform .2s!important;
  }
  #memberList.hidden{
    transform:translateX(100%)!important;
    display:flex!important;
    visibility:hidden!important;
    pointer-events:none!important;
  }
  #memberList:not(.hidden){
    transform:translateX(0)!important;
    visibility:visible!important;
  }

  /* chat area باید از عرض member list حساب کنه */
  .main-content{
    transition:padding-left .2s;
  }

  /* voice view screen share */
  #vcScreenGrid{
    width:100%;margin-bottom:12px;
  }
  #vcScreenGrid video{
    width:100%;border-radius:8px;background:#000;
    max-height:400px;object-fit:contain;
  }

  /* vc view full area */
  .voice-view{
    flex:1;display:flex;flex-direction:column;
    background:var(--bg-3,#313338);overflow:hidden;
  }
  .vc-top{
    flex:1;padding:16px;overflow-y:auto;
  }

  /* اصلاح member list برای عدم overlap با main content */
  .app:has(#memberList:not(.hidden)) .main-content{
    padding-left:240px;
  }

  /* ml-uname and ml-user classes */
  .ml-user{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:4px;transition:.1s;cursor:pointer;}
  .ml-user:hover{background:var(--bg-4,#383a40);}
  .ml-uname{font-size:14px;font-weight:600;color:var(--text-1,#f2f3f5);}
  .ml-section-title{font-size:11px;font-weight:700;color:var(--text-3,#80848e);text-transform:uppercase;letter-spacing:.6px;padding:12px 8px 4px;}
  .ml-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;overflow:hidden;flex-shrink:0;position:relative;}
  .ml-avatar.online::after{content:'';position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;background:var(--green,#23a55a);border-radius:50%;border:2px solid var(--bg-2,#2b2d31);}
  .ml-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;}

  /* resizable handle */
  .ch-sidebar .resize-handle{position:absolute;top:0;left:0;bottom:0;width:4px;cursor:col-resize;z-index:20;transition:.1s;}
  .ch-sidebar .resize-handle:hover{background:var(--accent,#5865f2);}

  /* reply bar */
  .reply-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-4,#383a40);font-size:13px;color:var(--text-2,#b5bac1);border-radius:8px 8px 0 0;margin-bottom:0;}
  .reply-bar button{background:none;border:none;cursor:pointer;color:var(--text-3,#80848e);font-size:16px;margin-right:auto;transition:.1s;}
  .reply-bar button:hover{color:var(--text-1,#f2f3f5);}

  /* voice effect buttons */
  .voice-effect-row{display:flex;flex-wrap:wrap;gap:4px;padding:6px 12px;background:rgba(0,0,0,.2);}
  .voice-effect-btn{padding:4px 10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.05);color:var(--text-3,#80848e);cursor:pointer;font-size:12px;font-family:inherit;transition:.1s;}
  .voice-effect-btn:hover{border-color:var(--accent,#5865f2);color:var(--text-1,#f2f3f5);}
  .voice-effect-btn.active{background:rgba(88,101,242,.2);border-color:var(--accent,#5865f2);color:var(--accent,#5865f2);}

  /* msg actions */
  .msg-actions{position:absolute;top:-18px;left:4px;display:none;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.06);border-radius:6px;padding:4px;gap:2px;box-shadow:0 4px 16px rgba(0,0,0,.4);z-index:10;}
  .msg-group:hover .msg-actions{display:flex;}
  .msg-act{background:none;border:none;cursor:pointer;color:var(--text-3,#80848e);font-size:15px;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:.1s;}
  .msg-act:hover{background:var(--bg-4,#383a40);color:var(--text-1,#f2f3f5);}
  .msg-act.danger:hover{background:rgba(242,63,66,.15);color:#f87171;}

  /* react bar */
  .react-bar{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;min-height:4px;}
  .react-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:2px 8px;font-size:13px;cursor:pointer;color:var(--text-2,#b5bac1);transition:.1s;display:flex;align-items:center;gap:4px;}
  .react-btn:hover,.react-btn.mine{background:rgba(88,101,242,.2);border-color:var(--accent,#5865f2);}

  /* highlight animation */
  @keyframes msgHL{0%{background:rgba(88,101,242,.2)}100%{background:transparent}}
  .msg-group.highlight{animation:msgHL 2s ease;}

  /* spoiler */
  .spoiler{background:var(--bg-5,#404249);color:transparent;border-radius:3px;padding:0 3px;cursor:pointer;transition:.2s;}
  .spoiler.r{color:inherit;background:var(--bg-4,#383a40);}

  /* file attach */
  .file-attach{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.06);border-radius:4px;margin-top:6px;max-width:340px;}
`;
document.head.appendChild(bridgeStyle);

// ══════════════════════════════════════════════════════
// 2. SCREEN SHARE FIX — کامل
// ══════════════════════════════════════════════════════
// Override startScreenShare برای نمایش video به خود کاربر
const _origStart=window.startScreenShare;
window.startScreenShare=async function(){
  try{
    const stream=await navigator.mediaDevices.getDisplayMedia({
      video:{frameRate:15,width:{ideal:1280},height:{ideal:720}},
      audio:true
    });
    window.screenStream=stream;
    window.isSharing=true;

    // نمایش فوری به خود کاربر
    let videoEl=document.getElementById('screenShareVideo');
    if(!videoEl){
      // بساز اگه نیست
      videoEl=document.createElement('video');
      videoEl.id='screenShareVideo';
      videoEl.autoplay=true;videoEl.playsInline=true;
      videoEl.style.cssText='width:100%;border-radius:8px;background:#000;max-height:400px;object-fit:contain;';
    }
    videoEl.srcObject=stream;
    videoEl.play().catch(()=>{});

    // نمایش grid
    const grid=document.getElementById('vcScreenGrid');
    if(grid){
      grid.classList.remove('hidden');
      if(!grid.contains(videoEl))grid.appendChild(videoEl);
    }

    const btn=document.getElementById('screenShareBtn');
    if(btn){btn.innerHTML='🔴🖥';btn.style.background='rgba(239,68,68,.2)';}

    stream.getVideoTracks()[0].onended=()=>window.stopScreenShare?.();
    window.socket?.emit('screen_share_start',{channelId:window.currentVoiceId});
    window.showToast?.('🖥 اشتراک صفحه شروع شد');
  }catch(e){
    if(e.name!=='NotAllowedError')window.showToast?.('خطا در اشتراک صفحه: '+e.message);
  }
};

// Override createScreenPC برای گیرنده
const _origCreatePC=window.createScreenPC;
window.createScreenPC=async function(toSocketId,asOfferer){
  const pc=new RTCPeerConnection({
    iceServers:[
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'},
    ]
  });
  window.screenPCs=window.screenPCs||{};
  window.screenPCs[toSocketId]=pc;

  pc.onicecandidate=e=>{
    if(e.candidate)window.socket?.emit('screen_ice',{to:toSocketId,candidate:e.candidate});
  };

  pc.ontrack=e=>{
    const stream=e.streams[0];if(!stream)return;
    let videoEl=document.getElementById('screenShareVideo');
    if(!videoEl){
      videoEl=document.createElement('video');
      videoEl.id='screenShareVideo';
      videoEl.autoplay=true;videoEl.playsInline=true;
      videoEl.style.cssText='width:100%;border-radius:8px;background:#000;max-height:400px;object-fit:contain;';
      const grid=document.getElementById('vcScreenGrid');
      if(grid)grid.appendChild(videoEl);
    }
    videoEl.srcObject=stream;
    videoEl.play().catch(()=>{});
    // نمایش grid
    const grid=document.getElementById('vcScreenGrid');
    if(grid)grid.classList.remove('hidden');
    // اگه voice view hidden هست، باز کن
    const vv=document.getElementById('voiceView');
    const cv=document.getElementById('chatView');
    if(vv&&vv.classList.contains('hidden')){
      vv.classList.remove('hidden');cv?.classList.add('hidden');
    }
    window.showToast?.('🖥 اشتراک صفحه دریافت شد');
  };

  if(asOfferer&&window.screenStream){
    window.screenStream.getTracks().forEach(t=>pc.addTrack(t,window.screenStream));
    const offer=await pc.createOffer();
    await pc.setLocalDescription(offer);
    window.socket?.emit('screen_offer',{to:toSocketId,offer});
  }
  return pc;
};

// ══════════════════════════════════════════════════════
// 3. SAVE PROFILE — کامل
// ══════════════════════════════════════════════════════
window.saveProfile=async function(){
  try{
    const btn=document.querySelector('#profileModal .auth-btn[onclick*="saveProfile"]')||document.querySelector('#profileModal .btn-acc');
    if(btn){btn.textContent='در حال ذخیره...';btn.disabled=true;}
    // avatar
    const bigAv=document.getElementById('profileAvatarBig');
    const img=bigAv?.querySelector('img');
    const avatarUrl=img?.src||window.me?.avatarUrl||null;
    const payload={
      bio:document.getElementById('profileBio')?.value||'',
      status:document.getElementById('profileStatus')?.value||'online',
      avatarUrl:avatarUrl
    };
    const r=await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},body:JSON.stringify(payload)});
    const d=await r.json();
    if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
    if(d.ok){
      window.me={...window.me,...d.user};
      localStorage.setItem('mu',JSON.stringify(window.me));
      window.updateMyUI?.();
      window.closeModal?.('profileModal');
      window.showToast?.('پروفایل ذخیره شد ✅');
    }else window.showToast?.('خطا: '+(d.msg||''));
  }catch(e){window.showToast?.('خطا در اتصال');console.error(e);}
};

// ══════════════════════════════════════════════════════
// 4. UPLOAD AVATAR با compress
// ══════════════════════════════════════════════════════
function compress(dataUrl,size,q){return new Promise(res=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');let w=img.width,h=img.height;if(w>size||h>size){const s=size/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',q||.75));};img.src=dataUrl;});}

window.uploadAvatar=function(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=async ev=>{
    const c=await compress(ev.target.result,256,.75);
    const big=document.getElementById('profileAvatarBig');
    if(big){big.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;big.style.background='transparent';}
    const fRes=await fetch('/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},body:JSON.stringify({avatarUrl:c})});
    const d=await fRes.json();
    if(d.ok){window.me={...window.me,...d.user,avatarUrl:c};localStorage.setItem('mu',JSON.stringify(window.me));window.updateMyUI?.();window.showToast?.('عکس آپلود شد ✅');}
  };r.readAsDataURL(file);
};
window.uploadServerIcon=function(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=async ev=>{
    const c=await compress(ev.target.result,256,.8);
    window.newServerIconUrl=c;
    const prev=document.getElementById('srvIconPreview');
    if(prev)prev.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    window.showToast?.('آیکون آماده ✅');
  };r.readAsDataURL(file);
};
window.previewNewServerIcon=function(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=async ev=>{
    const c=await compress(ev.target.result,256,.8);
    window.newServerIconUrl=c;
    const prev=document.getElementById('newSrvIconPreview');
    if(prev)prev.innerHTML=`<img src="${c}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  };r.readAsDataURL(file);
};

// ══════════════════════════════════════════════════════
// 5. appendMessage کامل
// ══════════════════════════════════════════════════════
function e_(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function e2_(s){return String(s||'').replace(/'/g,"\\'").replace(/\\/g,'\\\\');}

function renderMd(raw){
  if(!raw)return'';
  let t=raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/```[\w]*\n?([\s\S]*?)```/g,(_,c)=>`<pre><code>${c.trim()}</code></pre>`);
  t=t.replace(/`([^`]+)`/g,'<code>$1</code>');
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/\*(.+?)\*/g,'<em>$1</em>');
  t=t.replace(/~~(.+?)~~/g,'<s>$1</s>');
  t=t.replace(/\|\|(.+?)\|\|/g,'<span class="spoiler" onclick="this.classList.toggle(\'r\')">$1</span>');
  t=t.replace(/https?:\/\/[^\s<>"]+/g,url=>{
    if(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url))
      return`<br><img src="${url}" loading="lazy" onclick="ghImgFull('${url}')" onerror="this.style.display='none'" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer">`;
    return`<a href="${url}" target="_blank" rel="noopener" style="color:#00aff4;word-break:break-all">${url}</a>`;
  });
  t=t.replace(/@(\w+)/g,(_,n)=>`<span style="color:var(--accent,#5865f2);background:rgba(88,101,242,.15);border-radius:3px;padding:0 3px;cursor:pointer">@${n}</span>`);
  return t.replace(/\n/g,'<br>');
}
function fileBlock(msg){
  if(!msg.file)return'';
  const{data,name,type}=msg.file;
  if(type?.startsWith('image/'))return`<br><img src="${data}" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer" onclick="ghImgFull('${data}')">`;
  return`<div class="file-attach">📎 <a href="${data}" download="${e_(name)}" style="color:var(--accent,#5865f2)">${e_(name)}</a></div>`;
}
window.ghImgFull=function(src){
  let m=document.getElementById('_im');
  if(!m){m=document.createElement('div');m.id='_im';m.style.cssText='position:fixed;inset:0;z-index:9999;background:#000d;display:flex;align-items:center;justify-content:center;cursor:zoom-out';m.onclick=()=>m.style.display='none';document.body.appendChild(m);}
  m.innerHTML=`<img src="${src}" style="max-width:92vw;max-height:92vh;border-radius:8px;box-shadow:0 0 60px #000">`;
  m.style.display='flex';
};

window.appendMessage=function(msg,noScroll=false){
  const a=document.getElementById('messagesArea');if(!a)return;
  const t=new Date(msg.time);
  const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const av=msg.avatarUrl
    ?`<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    :`<span>${e_(msg.avatar||msg.username?.[0]?.toUpperCase()||'?')}</span>`;
  const roleTag=(()=>{
    const m=(window.serverMembers?.[window.currentServerId]||[]).find(m=>m.id===msg.userId);
    if(!m)return'';
    return(window.serverRoles?.[window.currentServerId]||[]).filter(r=>m.roles?.includes(r.id))
      .map(r=>`<span style="font-size:11px;padding:1px 6px;border-radius:3px;background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');
  })();
  const replyBlock=msg.replyTo?`<div class="reply-preview" style="font-size:12px;color:var(--text-3,#80848e);padding:3px 8px;background:rgba(255,255,255,.04);border-radius:4px;border-right:2px solid var(--text-3,#80848e);margin-bottom:4px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="scrollToMsg('${msg.replyTo.id}')">↩ <b>${e_(msg.replyTo.username)}</b>: ${e_((msg.replyTo.text||'').slice(0,60))}</div>`:'';
  const isMe=msg.userId===window.me?.id;
  const canDel=isMe||['owner','admin','mod'].includes(window.myServerRole||'');
  const div=document.createElement('div');
  div.className='msg-group';div.id=`msg-${msg.id}`;div.style.position='relative';
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color||'#5865f2'},${msg.color||'#5865f2'}99);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;overflow:hidden;margin-top:2px;cursor:pointer"
      onclick="window.openUserProfile?.('${msg.userId}')">${av}</div>
    <div class="msg-body" style="flex:1;min-width:0">
      ${replyBlock}
      <div class="msg-header" style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px;flex-wrap:wrap">
        <span class="msg-uname" style="color:${msg.color||'#5865f2'};font-size:15px;font-weight:600;cursor:pointer" onclick="window.openUserProfile?.('${msg.userId}')">${e_(msg.username)}</span>
        ${roleTag}
        <span style="font-size:11px;color:var(--text-4,#4e5058)">${ts}</span>
        ${msg.edited?'<span style="font-size:10px;color:var(--text-4,#4e5058)">(ویرایش)</span>':''}
      </div>
      <div class="msg-text" id="msgtxt-${msg.id}" style="font-size:15px;color:var(--text-2,#b5bac1);line-height:1.6;word-break:break-word">${renderMd(msg.text||'')}${fileBlock(msg)}</div>
      <div class="react-bar" id="rbar-${msg.id}"></div>
    </div>
    <div class="msg-actions">
      <button class="msg-act" title="ری‌اکشن" onclick="ghReact('${msg.id}')">😀</button>
      <button class="msg-act" title="ریپلای" onclick="ghReply('${msg.id}','${e2_(msg.username)}','${e2_((msg.text||'').slice(0,50))}')">↩</button>
      ${isMe?`<button class="msg-act" title="ویرایش" onclick="ghEdit('${msg.id}')">✏️</button>`:''}
      ${canDel?`<button class="msg-act danger" title="حذف" onclick="ghDel('${msg.id}')">🗑</button>`:''}
    </div>`;
  a.appendChild(div);
  if(!noScroll)a.scrollTop=a.scrollHeight;
};

// ══════════════════════════════════════════════════════
// 6. ACTIONS
// ══════════════════════════════════════════════════════
let _rto=null,_eid=null;
const REACTS=['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀','🎵','💎'];

window.ghReact=function(msgId){
  const ex=document.getElementById('_rp');
  if(ex&&ex.dataset.f===msgId){ex.remove();return;}
  ex?.remove();
  const msg=document.getElementById(`msg-${msgId}`);if(!msg)return;
  const pop=document.createElement('div');pop.id='_rp';pop.dataset.f=msgId;
  pop.style.cssText='position:fixed;z-index:400;background:var(--bg-2,#2b2d31);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;box-shadow:0 8px 32px #0009;max-width:260px;';
  const rect=msg.getBoundingClientRect();
  pop.style.top=(rect.top-52)+'px';pop.style.right=(window.innerWidth-rect.right)+'px';
  pop.innerHTML=REACTS.map(e=>`<button style="font-size:20px;background:none;border:none;cursor:pointer;padding:4px;border-radius:4px;transition:.1s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'" onclick="ghSendReact('${msgId}','${e}');document.getElementById('_rp')?.remove()">${e}</button>`).join('');
  document.body.appendChild(pop);
  setTimeout(()=>document.addEventListener('click',e=>{if(!e.target.closest('#_rp'))document.getElementById('_rp')?.remove();},{once:true}),50);
};
window.ghSendReact=function(id,e){window.socket?.emit('react',{channelId:window.currentChannelId,msgId:id,emoji:e});};
window.ghReply=function(id,u,t){
  _rto={id,username:u,text:t};
  const bar=document.getElementById('replyBar');
  if(bar){bar.innerHTML=`<span>↩ <b>${u}</b>: ${t}</span><button onclick="ghClearReply()">✕</button>`;bar.classList.remove('hidden');}
  document.getElementById('msgInput')?.focus();
};
window.ghClearReply=function(){_rto=null;document.getElementById('replyBar')?.classList.add('hidden');};
window.ghEdit=function(id){
  const el=document.getElementById(`msgtxt-${id}`);
  const inp=document.getElementById('msgInput');if(!el||!inp)return;
  _eid=id;inp.value=el.innerText;inp.dataset.ghedit='1';
  const bar=document.getElementById('replyBar');
  if(bar){bar.innerHTML=`<span>✏️ در حال ویرایش</span><button onclick="ghCancelEdit()">✕</button>`;bar.classList.remove('hidden');}
  inp.focus();
};
window.ghCancelEdit=function(){_eid=null;const inp=document.getElementById('msgInput');if(inp){inp.value='';delete inp.dataset.ghedit;}window.ghClearReply();};
window.ghDel=function(id){window.socket?.emit('delete_message',{channelId:window.currentChannelId,msgId:id});};

const _oSend=window.sendMessage;
window.sendMessage=function(){
  const inp=document.getElementById('msgInput');
  const text=inp?.value.trim();if(!text||!window.socket)return;
  if(inp.dataset.ghedit&&_eid){socket.emit('edit_message',{channelId:window.currentChannelId,msgId:_eid,newText:text});window.ghCancelEdit();return;}
  const p={channelId:window.currentChannelId,text};
  if(_rto)p.replyTo=_rto;
  socket.emit('message',p);inp.value='';window.ghClearReply();
};

// ══════════════════════════════════════════════════════
// 7. SOCKET HOOKS
// ══════════════════════════════════════════════════════
function hookSocket(){
  if(!window.socket||window.__ghS4)return;
  window.__ghS4=true;
  socket.on('message_deleted',({channelId,msgId})=>{
    if(channelId!==window.currentChannelId)return;
    const el=document.getElementById(`msg-${msgId}`);
    if(el){el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),300);}
  });
  socket.on('message_edited',({channelId,msgId,newText})=>{
    if(channelId!==window.currentChannelId)return;
    const el=document.getElementById(`msgtxt-${msgId}`);
    if(el)el.innerHTML=renderMd(newText);
  });
  socket.on('reaction_update',({channelId,msgId,reactions})=>{
    if(channelId!==window.currentChannelId)return;
    const bar=document.getElementById(`rbar-${msgId}`);if(!bar)return;
    bar.innerHTML=Object.entries(reactions||{}).map(([e,u])=>
      `<button class="react-btn${u.includes(window.me?.id)?' mine':''}" onclick="ghSendReact('${msgId}','${e}')">${e} ${u.length}</button>`).join('');
  });
  socket.on('server_updated',({serverId,theme})=>{
    if(serverId===window.currentServerId&&theme)applyTheme(theme);
  });
  socket.on('sysicons_updated',({icons})=>{window.__sysIcons=icons;});
}

// ══════════════════════════════════════════════════════
// 8. THEME APPLY
// ══════════════════════════════════════════════════════
function applyTheme(t){
  if(!t)return;
  const map={'--bg-srv':'--bg-1','--bg-ch':'--bg-2','--bg-chat':'--bg-3','--bg-input':'--bg-4','--acc':'--accent','--t1':'--text-1','--t2':'--text-2','--t3':'--text-3','--accent':'--accent','--green':'--green','--red':'--red'};
  const s=document.documentElement.style;
  Object.entries(t).forEach(([k,v])=>s.setProperty(map[k]||k,v));
}
async function loadTheme(){
  try{const r=await fetch(`/api/servers/${window.currentServerId||'default'}/theme`);const d=await r.json();if(d.ok&&d.theme)applyTheme(d.theme);}catch(e){}
}

// ══════════════════════════════════════════════════════
// 9. FILE UPLOAD
// ══════════════════════════════════════════════════════
window.processFileUpload=function(file){
  if(file.size>5e6){window.showToast?.('⚠️ حداکثر 5MB');return;}
  window.showToast?.('📤 آپلود...');
  const r=new FileReader();
  r.onload=ev=>window.socket?.emit('file_message',{channelId:window.currentChannelId,fileData:ev.target.result,fileName:file.name,fileType:file.type,text:''});
  r.readAsDataURL(file);
};

// ══════════════════════════════════════════════════════
// 10. UTILITIES
// ══════════════════════════════════════════════════════
window.scrollToMsg=function(id){const el=document.getElementById(`msg-${id}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}};
window.selectChType=function(t){document.getElementById('chTypeText')?.classList.toggle('active',t==='text');document.getElementById('chTypeVoice')?.classList.toggle('active',t==='voice');const s=document.getElementById('newChType');if(s)s.value=t;};

// ══════════════════════════════════════════════════════
// 11. RESIZABLE SIDEBAR
// ══════════════════════════════════════════════════════
function initResize(){
  const sb=document.querySelector('.ch-sidebar');if(!sb||sb._r)return;sb._r=true;
  sb.style.position='relative';
  const h=document.createElement('div');h.className='resize-handle';sb.appendChild(h);
  let sx,sw;
  h.onmousedown=e=>{sx=e.clientX;sw=sb.offsetWidth;e.preventDefault();
    const mm=e2=>{const d=sx-e2.clientX;const w=Math.min(400,Math.max(150,sw+d));sb.style.width=w+'px';sb.style.minWidth=w+'px';localStorage.setItem('_sbw',w);};
    document.addEventListener('mousemove',mm);
    document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',mm),{once:true});
  };
  const saved=localStorage.getItem('_sbw');if(saved){sb.style.width=saved+'px';sb.style.minWidth=saved+'px';}
}

// ══════════════════════════════════════════════════════
// 12. REPLY BAR INJECT
// ══════════════════════════════════════════════════════
function injectUI(){
  // reply bar
  if(!document.getElementById('replyBar')){
    const bar=document.createElement('div');
    bar.id='replyBar';bar.className='reply-bar hidden';
    const ia=document.querySelector('.input-area');
    if(ia)ia.insertAdjacentElement('afterbegin',bar);
  }
  // file input
  const fileInp=document.getElementById('chatFileInput');
  if(fileInp){
    fileInp.onchange=e=>{if(e.target.files[0])window.processFileUpload(e.target.files[0]);};
  }
  // drag drop
  const cv=document.getElementById('chatView');
  if(cv&&!cv._drop){cv._drop=true;
    cv.addEventListener('dragover',e=>{e.preventDefault();cv.style.outline='2px dashed var(--accent,#5865f2)';});
    cv.addEventListener('dragleave',()=>cv.style.outline='');
    cv.addEventListener('drop',e=>{e.preventDefault();cv.style.outline='';const f=e.dataTransfer?.files[0];if(f)window.processFileUpload(f);});
  }
}

// ══════════════════════════════════════════════════════
// 13. INIT
// ══════════════════════════════════════════════════════
function run(){injectUI();initResize();hookSocket();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,800));
else setTimeout(run,800);
const _oApp=window.startApp;
window.startApp=function(){_oApp?.();setTimeout(()=>{run();hookSocket();loadTheme();},2000);};
const _oSS_=window.selectServer;
window.selectServer=async function(id){await _oSS_?.(id);setTimeout(loadTheme,600);};
setInterval(()=>{hookSocket();if(!document.getElementById('replyBar'))injectUI();},1500);

})();
