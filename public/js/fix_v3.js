// GapHub Fix Patch v3 — Clean & Complete
(function(){
'use strict';
if(window.__ghpv3) return;
window.__ghpv3 = true;

// ══════════════════════════════════════════════════════
// 1. SAVE PROFILE — کامل با avatar
// ══════════════════════════════════════════════════════
window.saveProfile = async function(){
  try{
    const btn = document.querySelector('#profileModal .auth-btn');
    if(btn){btn.textContent='در حال ذخیره...';btn.disabled=true;}

    // avatar اگه تغییر کرده
    const bigAvatar = document.getElementById('profileAvatarBig');
    const img = bigAvatar?.querySelector('img');
    const avatarUrl = img?.src || window.me?.avatarUrl || null;

    const payload = {
      bio: document.getElementById('profileBio')?.value || '',
      status: document.getElementById('profileStatus')?.value || 'online',
      avatarUrl: avatarUrl,
    };

    const r = await fetch('/api/users/me', {
      method:'PATCH',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},
      body: JSON.stringify(payload)
    });
    const d = await r.json();

    if(btn){btn.textContent='💾 ذخیره';btn.disabled=false;}
    if(d.ok){
      window.me = {...(window.me||{}), ...d.user};
      localStorage.setItem('mu', JSON.stringify(window.me));
      window.updateMyUI?.();
      // broadcast به بقیه
      window.socket?.emit('profile_updated', {user: d.user});
      window.closeModal?.('profileModal');
      window.showToast?.('پروفایل ذخیره شد ✅');
    } else {
      window.showToast?.('خطا: '+(d.msg||'دوباره امتحان کن'));
    }
  }catch(e){
    window.showToast?.('خطا در اتصال');
    console.error('saveProfile:', e);
  }
};

// ══════════════════════════════════════════════════════
// 2. UPLOAD AVATAR — با compress
// ══════════════════════════════════════════════════════
function compressImg(dataUrl, size, q){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');
      let w=img.width,h=img.height;
      if(w>size||h>size){const s=size/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
      c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      res(c.toDataURL('image/jpeg',q||.75));
    };
    img.src=dataUrl;
  });
}

window.uploadAvatar = function(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    const compressed=await compressImg(ev.target.result,256,.75);
    // نمایش در UI
    const big=document.getElementById('profileAvatarBig');
    if(big){big.innerHTML=`<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;}
    // ذخیره
    const r=await fetch('/api/users/me',{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('mt')},
      body:JSON.stringify({avatarUrl:compressed})
    });
    const d=await r.json();
    if(d.ok){
      if(!window.me) window.me={};
      window.me.avatarUrl=compressed;
      window.me={...window.me,...d.user};
      localStorage.setItem('mu',JSON.stringify(window.me));
      window.updateMyUI?.();
      window.showToast?.('عکس پروفایل آپلود شد ✅');
    }
  };
  reader.readAsDataURL(file);
};

// ══════════════════════════════════════════════════════
// 3. UPLOAD SERVER ICON — با compress
// ══════════════════════════════════════════════════════
window.uploadServerIcon = function(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    const compressed=await compressImg(ev.target.result,256,.8);
    window.newServerIconUrl=compressed;
    const prev=document.getElementById('srvIconPreview');
    if(prev)prev.innerHTML=`<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    window.showToast?.('آیکون سرور آماده ✅');
  };
  reader.readAsDataURL(file);
};

window.previewNewServerIcon = function(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    const compressed=await compressImg(ev.target.result,256,.8);
    window.newServerIconUrl=compressed;
    const prev=document.getElementById('newSrvIconPreview');
    if(prev)prev.innerHTML=`<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  };
  reader.readAsDataURL(file);
};

// ══════════════════════════════════════════════════════
// 4. appendMessage — کامل
// ══════════════════════════════════════════════════════
window.appendMessage = function(msg, noScroll=false){
  const a=document.getElementById('messagesArea');
  if(!a) return;
  const t=new Date(msg.time);
  const ts=`${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
  const me_=window.me||{};
  const av=msg.avatarUrl
    ?`<img src="${msg.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    :`<span>${e_(msg.avatar||'?')}</span>`;

  const roleTag=(()=>{
    const m=(window.serverMembers?.[window.currentServerId]||[]).find(m=>m.id===msg.userId);
    if(!m)return'';
    return(window.serverRoles?.[window.currentServerId]||[])
      .filter(r=>m.roles?.includes(r.id))
      .map(r=>`<span style="font-size:11px;padding:1px 6px;border-radius:3px;background:${r.color}22;color:${r.color};border:1px solid ${r.color}44">${r.name}</span>`).join('');
  })();

  const replyBlock=msg.replyTo
    ?`<div class="reply-preview" onclick="scrollToMsg('${msg.replyTo.id}')">↩ <b>${e_(msg.replyTo.username)}</b>: ${e_((msg.replyTo.text||'').slice(0,60))}</div>`:'';

  const isMe=msg.userId===me_.id;
  const canDel=isMe||['owner','admin','mod'].includes(window.myServerRole||'');

  const div=document.createElement('div');
  div.className='msg-group';
  div.id=`msg-${msg.id}`;
  div.innerHTML=`
    <div class="msg-avatar" style="background:linear-gradient(135deg,${msg.color||'#5865f2'},${msg.color||'#5865f2'}99)"
      onclick="window.openUserProfile?.('${msg.userId}')">${av}</div>
    <div class="msg-body">
      ${replyBlock}
      <div class="msg-header">
        <span class="msg-uname" style="color:${msg.color||'#5865f2'}">${e_(msg.username)}</span>
        ${roleTag}
        <span class="msg-time">${ts}</span>
        ${msg.edited?'<span style="font-size:10px;color:var(--text-4,#4e5058)">(ویرایش)</span>':''}
      </div>
      <div class="msg-text" id="msgtxt-${msg.id}">${renderMd_(msg.text||'')}${buildFile_(msg)}</div>
      <div class="react-bar" id="rbar-${msg.id}"></div>
    </div>
    <div class="msg-actions">
      <button class="msg-act" onclick="ghReact('${msg.id}')">😀</button>
      <button class="msg-act" onclick="ghReply('${msg.id}','${e2_(msg.username)}','${e2_((msg.text||'').slice(0,50))}')">↩</button>
      ${isMe?`<button class="msg-act" onclick="ghEdit('${msg.id}')">✏️</button>`:''}
      ${canDel?`<button class="msg-act danger" onclick="ghDel('${msg.id}')">🗑</button>`:''}
    </div>`;
  a.appendChild(div);
  if(!noScroll)a.scrollTop=a.scrollHeight;
};

function e_(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function e2_(s){return String(s||'').replace(/'/g,"\\'").replace(/"/g,'\\"');}

function renderMd_(raw){
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
    return`<a href="${url}" target="_blank" rel="noopener" style="color:#00aff4">${url}</a>`;
  });
  t=t.replace(/@(\w+)/g,(_,n)=>`<span style="color:var(--accent,#5865f2);background:rgba(88,101,242,.15);border-radius:3px;padding:0 3px;cursor:pointer">@${n}</span>`);
  return t.replace(/\n/g,'<br>');
}
function buildFile_(msg){
  if(!msg.file)return'';
  const {data,name,type}=msg.file;
  if(type?.startsWith('image/'))
    return`<br><img src="${data}" style="max-width:360px;max-height:280px;border-radius:4px;margin-top:6px;display:block;cursor:pointer" onclick="ghImgFull('${data}')">`;
  return`<div class="file-attach">📎 <a href="${data}" download="${e_(name)}" style="color:var(--accent,#5865f2)">${e_(name)}</a></div>`;
}
window.ghImgFull=function(src){
  let m=document.getElementById('_ghIM');
  if(!m){m=document.createElement('div');m.id='_ghIM';m.style.cssText='position:fixed;inset:0;z-index:9999;background:#000c;display:flex;align-items:center;justify-content:center;cursor:zoom-out';m.onclick=()=>m.style.display='none';document.body.appendChild(m);}
  m.innerHTML=`<img src="${src}" style="max-width:92vw;max-height:92vh;border-radius:8px">`;
  m.style.display='flex';
};

// ══════════════════════════════════════════════════════
// 5. ACTIONS: react, reply, edit, delete
// ══════════════════════════════════════════════════════
let _rto=null,_eid=null;
const REACTS=['👍','❤️','😂','😮','😢','😡','🎉','🔥','💯','👀','🎵','💎'];

window.ghReact=function(msgId){
  const ex=document.getElementById('_ghRP');
  if(ex&&ex.dataset.for===msgId){ex.remove();return;}
  ex?.remove();
  const msg=document.getElementById(`msg-${msgId}`);if(!msg)return;
  const pop=document.createElement('div');pop.id='_ghRP';pop.dataset.for=msgId;
  pop.style.cssText='position:absolute;z-index:300;bottom:calc(100% + 4px);right:0;background:var(--bg-5,#404249);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;box-shadow:0 8px 32px #0008;max-width:260px;';
  pop.innerHTML=REACTS.map(e=>`<button style="font-size:20px;background:none;border:none;cursor:pointer;padding:4px;border-radius:4px;transition:.1s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'" onclick="ghSendReact('${msgId}','${e}');document.getElementById('_ghRP')?.remove()">${e}</button>`).join('');
  msg.style.position='relative';msg.appendChild(pop);
  setTimeout(()=>document.addEventListener('click',e=>{if(!e.target.closest('#_ghRP'))document.getElementById('_ghRP')?.remove();},{once:true}),50);
};
window.ghSendReact=function(msgId,emoji){window.socket?.emit('react',{channelId:window.currentChannelId,msgId,emoji});};

window.ghReply=function(id,username,text){
  _rto={id,username,text};
  const bar=document.getElementById('replyBar');
  if(bar){bar.innerHTML=`<span>↩ <b>${username}</b>: ${text}</span><button onclick="ghClearReply()" style="background:none;border:none;cursor:pointer;color:var(--text-3,#80848e);font-size:16px;margin-right:auto">✕</button>`;bar.classList.remove('hidden');}
  document.getElementById('msgInput')?.focus();
};
window.ghClearReply=function(){_rto=null;document.getElementById('replyBar')?.classList.add('hidden');};

window.ghEdit=function(msgId){
  const el=document.getElementById(`msgtxt-${msgId}`);
  const inp=document.getElementById('msgInput');if(!el||!inp)return;
  _eid=msgId;inp.value=el.innerText;inp.dataset.ghedit='1';
  const bar=document.getElementById('replyBar');
  if(bar){bar.innerHTML=`<span>✏️ ویرایش پیام</span><button onclick="ghCancelEdit()" style="background:none;border:none;cursor:pointer;color:var(--text-3,#80848e);font-size:16px;margin-right:auto">✕</button>`;bar.classList.remove('hidden');}
  inp.focus();
};
window.ghCancelEdit=function(){_eid=null;const inp=document.getElementById('msgInput');if(inp){inp.value='';delete inp.dataset.ghedit;}window.ghClearReply();};
window.ghDel=function(msgId){window.socket?.emit('delete_message',{channelId:window.currentChannelId,msgId});};

// override sendMessage
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
// 6. FILE UPLOAD
// ══════════════════════════════════════════════════════
window.processFileUpload=function(file){
  if(file.size>5e6){window.showToast?.('⚠️ حداکثر 5MB');return;}
  window.showToast?.('📤 آپلود...');
  const r=new FileReader();
  r.onload=ev=>window.socket?.emit('file_message',{channelId:window.currentChannelId,fileData:ev.target.result,fileName:file.name,fileType:file.type,text:''});
  r.readAsDataURL(file);
};

// ══════════════════════════════════════════════════════
// 7. SOCKET EVENTS جدید
// ══════════════════════════════════════════════════════
function hookSocket(){
  if(!window.socket||window.__ghSockHooked)return;
  window.__ghSockHooked=true;

  socket.on('message_deleted',({channelId,msgId})=>{
    if(channelId!==window.currentChannelId)return;
    const el=document.getElementById(`msg-${msgId}`);
    if(el){el.style.opacity='0';el.style.transition='.3s';setTimeout(()=>el.remove(),300);}
  });
  socket.on('message_edited',({channelId,msgId,newText})=>{
    if(channelId!==window.currentChannelId)return;
    const el=document.getElementById(`msgtxt-${msgId}`);
    if(el)el.innerHTML=renderMd_(newText);
  });
  socket.on('reaction_update',({channelId,msgId,reactions})=>{
    if(channelId!==window.currentChannelId)return;
    const bar=document.getElementById(`rbar-${msgId}`);if(!bar)return;
    bar.innerHTML=Object.entries(reactions||{}).map(([e,u])=>
      `<button class="react-btn${u.includes(window.me?.id)?' mine':''}" onclick="ghSendReact('${msgId}','${e}')">${e} ${u.length}</button>`
    ).join('');
  });
  // theme
  socket.on('server_updated',({serverId,theme})=>{
    if(serverId===window.currentServerId&&theme)applyTheme_(theme);
  });
  socket.on('sysicons_updated',({icons})=>{window.__sysIcons=icons||{};});
}

// ══════════════════════════════════════════════════════
// 8. SCREEN SHARE FIX — نمایش برای گیرنده
// ══════════════════════════════════════════════════════
function fixScreenShare(){
  if(!window.socket||window.__ghSSHooked)return;
  window.__ghSSHooked=true;
  // وقتی share شروع شد voiceView رو نشون بده
  socket.on('screen_share_started',async({userId,username,socketId})=>{
    window.showToast?.(`🖥 ${username} داره صفحه‌ش رو نشون میده`);
    // اگه voiceView hidden هست، باز کن
    const vv=document.getElementById('voiceView');
    const cv=document.getElementById('chatView');
    if(vv&&vv.classList.contains('hidden')){
      vv.classList.remove('hidden');
      cv?.classList.add('hidden');
    }
    const grid=document.getElementById('vcScreenGrid');
    const label=document.getElementById('ssUsername');
    if(grid)grid.classList.remove('hidden');
    if(label)label.textContent=`🖥 ${username}`;
    // WebRTC receive
    if(window.createScreenPC){
      const pc=await window.createScreenPC(socketId,false);
      socket.emit('screen_request',{to:socketId});
    }
  });
}

// ══════════════════════════════════════════════════════
// 9. MEMBER LIST — سمت راست
// ══════════════════════════════════════════════════════
function fixMemberList(){
  const ml=document.getElementById('memberList');if(!ml)return;
  // اگه داخل main-content هست، بیارش بیرون
  const mc=document.querySelector('.main-content');
  const app=document.querySelector('.app')||document.getElementById('app');
  if(ml.parentElement===mc&&app){
    app.appendChild(ml);
    // style
    ml.style.cssText='position:fixed;top:0;left:0;bottom:0;width:240px;background:var(--bg-2,#2b2d31);z-index:50;overflow-y:auto;padding:16px 8px;transition:transform .2s;box-shadow:2px 0 8px rgba(0,0,0,.3);';
  }
}

// ══════════════════════════════════════════════════════
// 10. RESIZABLE SIDEBAR
// ══════════════════════════════════════════════════════
function initResize(){
  const sb=document.querySelector('.ch-sidebar');if(!sb||sb._resized)return;
  sb._resized=true;sb.style.position='relative';
  const h=document.createElement('div');
  h.style.cssText='position:absolute;top:0;left:0;bottom:0;width:4px;cursor:col-resize;z-index:20;transition:.1s;';
  h.onmouseover=()=>h.style.background='var(--accent,#5865f2)';
  h.onmouseout=()=>h.style.background='transparent';
  sb.appendChild(h);
  let sx,sw;
  h.onmousedown=e=>{sx=e.clientX;sw=sb.offsetWidth;e.preventDefault();
    const mm=e2=>{const d=sx-e2.clientX;const w=Math.min(400,Math.max(150,sw+d));sb.style.width=w+'px';sb.style.minWidth=w+'px';localStorage.setItem('_sbw',w);};
    document.addEventListener('mousemove',mm);
    document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',mm),{once:true});
  };
  const saved=localStorage.getItem('_sbw');
  if(saved){sb.style.width=saved+'px';sb.style.minWidth=saved+'px';}
}

// ══════════════════════════════════════════════════════
// 11. REPLY BAR INJECT
// ══════════════════════════════════════════════════════
function injectReplyBar(){
  if(document.getElementById('replyBar'))return;
  const bar=document.createElement('div');
  bar.id='replyBar';bar.className='reply-bar hidden';
  bar.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--bg-4,#383a40);font-size:13px;color:var(--text-2,#b5bac1);border-top:1px solid rgba(255,255,255,.06);';
  const ia=document.querySelector('.input-area');
  if(ia)ia.insertAdjacentElement('afterbegin',bar);
}

// ══════════════════════════════════════════════════════
// 12. DRAG & DROP
// ══════════════════════════════════════════════════════
function initDrop(){
  const cv=document.getElementById('chatView');if(!cv||cv._drop)return;
  cv._drop=true;
  cv.addEventListener('dragover',e=>{e.preventDefault();cv.style.outline='2px dashed var(--accent,#5865f2)';});
  cv.addEventListener('dragleave',()=>cv.style.outline='');
  cv.addEventListener('drop',e=>{e.preventDefault();cv.style.outline='';const f=e.dataTransfer?.files[0];if(f)window.processFileUpload(f);});
  // file input click
  const fileBtn=document.querySelector('.input-icon-btn[onclick*="chatFileInput"]');
  const fileInp=document.getElementById('chatFileInput');
  if(fileBtn&&fileInp){fileBtn.onclick=()=>fileInp.click();fileInp.onchange=e=>{if(e.target.files[0])window.processFileUpload(e.target.files[0]);};}
}

// ══════════════════════════════════════════════════════
// 13. THEME APPLY
// ══════════════════════════════════════════════════════
function applyTheme_(theme){
  if(!theme)return;
  const map={'--bg-srv':'--bg-1','--bg-ch':'--bg-2','--bg-chat':'--bg-3','--bg-input':'--bg-4','--accent':'--accent','--green':'--green','--red':'--red','--t1':'--text-1','--t2':'--text-2','--t3':'--text-3'};
  const s=document.documentElement.style;
  Object.entries(theme).forEach(([k,v])=>s.setProperty(map[k]||k,v));
}
async function loadTheme(){
  try{
    const sid=window.currentServerId||'default';
    const r=await fetch(`/api/servers/${sid}/theme`);
    const d=await r.json();
    if(d.ok&&d.theme)applyTheme_(d.theme);
  }catch(e){}
}

// ══════════════════════════════════════════════════════
// 14. SCROLL TO MSG
// ══════════════════════════════════════════════════════
window.scrollToMsg=function(id){
  const el=document.getElementById(`msg-${id}`);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('highlight');setTimeout(()=>el.classList.remove('highlight'),2000);}
};

// ══════════════════════════════════════════════════════
// 15. selectChType
// ══════════════════════════════════════════════════════
window.selectChType=function(type){
  document.getElementById('chTypeText')?.classList.toggle('active',type==='text');
  document.getElementById('chTypeVoice')?.classList.toggle('active',type==='voice');
  const s=document.getElementById('newChType');if(s)s.value=type;
};

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════
function run(){
  injectReplyBar();
  initDrop();
  initResize();
  fixMemberList();
  hookSocket();
  fixScreenShare();
  loadTheme();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,800));
else setTimeout(run,800);

// بعد از login
const _oStart=window.startApp;
window.startApp=function(){
  _oStart?.();
  setTimeout(()=>{run();hookSocket();fixScreenShare();},2000);
};
// selectServer
const _oSS=window.selectServer;
window.selectServer=async function(id){await _oSS?.(id);setTimeout(loadTheme,600);};

// re-run هر ثانیه تا مطمئن بشیم
let _retries=0;
const _iv=setInterval(()=>{
  if(++_retries>10)clearInterval(_iv);
  hookSocket();fixScreenShare();
  if(document.getElementById('msgInput'))initDrop();
},1000);

})();
