var _dmF=[],_dmR=[],_dmCurId=null,_dmCurUser=null,_dmMsgs={},_dmTab='f',_dmSockOk=false;

function openDMView(){
  var sidebar=document.getElementById('channelSidebar');
  var mc=document.querySelector('.main-content');
  if(sidebar) _dmInjectSidebar(sidebar);
  if(mc) _dmInjectMain(mc);
  _dmLoadFriends();
  if(window.socket&&!_dmSockOk){_dmInitSock();_dmSockOk=true;}
  document.querySelectorAll('.srv-icon').forEach(function(e){e.classList.remove('active');});
  var si=document.getElementById('si-home');if(si)si.classList.add('active');
}

function closeDMView(){location.reload();}

function _dmInjectSidebar(el){
  var d=document.createElement('div');
  d.style.cssText='display:flex;flex-direction:column;height:100%';
  var h=document.createElement('div');
  h.style.cssText='padding:12px;border-bottom:1px solid #1e1e2e;flex-shrink:0';
  h.innerHTML='<div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:8px"><span style="flex:1">\u{1F4AC} \u067E\u06CC\u0627\u0645\u200c\u0647\u0627</span><button style="background:none;border:none;color:#555;cursor:pointer;font-size:18px" title="\u0628\u0631\u06AF\u0634\u062A" id="_dmBack">\u27F5</button></div><input id="_dmSideSearch" placeholder="\uD83D\uDD0D \u062C\u0633\u062A\u062C\u0648..." oninput="_dmSearch(this.value)" style="width:100%;background:#1e1e2e;border:none;border-radius:7px;padding:8px 10px;color:#fff;font-size:13px;box-sizing:border-box;font-family:inherit;direction:rtl"><div id="_dmSearchRes" style="margin-top:6px;max-height:150px;overflow-y:auto"></div>';
  var tabs=document.createElement('div');
  tabs.style.cssText='display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid #1e1e2e;flex-shrink:0';
  var tf=document.createElement('button');
  tf.id='_dmTabF';tf.textContent='\u062F\u0648\u0633\u062A\u0627\u0646';
  tf.style.cssText='flex:1;background:#5865f2;border:none;color:#fff;padding:6px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit';
  tf.onclick=function(){_dmShowTab('f');};
  var tr=document.createElement('button');
  tr.id='_dmTabR';tr.textContent='\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200c\u0647\u0627';
  tr.style.cssText='flex:1;background:#2a2a3e;border:none;color:#aaa;padding:6px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit';
  tr.onclick=function(){_dmShowTab('r');};
  tabs.appendChild(tf);tabs.appendChild(tr);
  var list=document.createElement('div');
  list.id='_dmSideList';list.style.cssText='flex:1;overflow-y:auto;padding:8px';
  d.appendChild(h);d.appendChild(tabs);d.appendChild(list);
  el.innerHTML='';el.appendChild(d);
  document.getElementById('_dmBack').onclick=closeDMView;
}

function _dmInjectMain(el){
  var d=document.createElement('div');
  d.id='_dmMain';d.style.cssText='display:flex;flex-direction:column;height:100%;background:#0a0a0f';
  var empty=document.createElement('div');
  empty.id='_dmEmpty';empty.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#555';
  empty.innerHTML='<div style="font-size:64px;margin-bottom:16px">\uD83D\uDCAC</div><div style="font-size:20px;font-weight:700;color:#888;margin-bottom:8px">\u067E\u06CC\u0627\u0645\u200c\u0647\u0627\u06CC \u0645\u0633\u062A\u0642\u06CC\u0645</div><div style="font-size:14px">\u0627\u0632 \u0633\u0645\u062A \u0686\u067E \u06CC\u0647 \u062F\u0648\u0633\u062A \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646</div>';
  var chat=document.createElement('div');
  chat.id='_dmChat';chat.style.cssText='display:none;flex-direction:column;height:100%';
  var header=document.createElement('div');
  header.style.cssText='padding:12px 16px;border-bottom:1px solid #1a1a2e;display:flex;align-items:center;gap:10px;flex-shrink:0;background:#0d0d14';
  header.innerHTML='<div id="_dmChatAv" style="width:36px;height:36px;border-radius:50%;background:#5865f2;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0">?</div><div style="flex:1"><div id="_dmChatName" style="color:#fff;font-weight:700;font-size:15px"></div></div><button onclick="_dmCallCur()" style="background:#3ba55d;border:none;color:#fff;padding:7px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit">\uD83D\uDCDE \u062A\u0645\u0627\u0633</button>';
  var msgs=document.createElement('div');
  msgs.id='_dmMsgs';msgs.style.cssText='flex:1;overflow-y:auto;padding:16px';
  var footer=document.createElement('div');
  footer.style.cssText='padding:10px 16px;border-top:1px solid #1a1a2e;display:flex;gap:8px;flex-shrink:0';
  var inp=document.createElement('input');
  inp.id='_dmInput';inp.placeholder='\u067E\u06CC\u0627\u0645 \u0628\u0641\u0631\u0633\u062A...';
  inp.onkeydown=function(e){if(e.key==='Enter')_dmSend();};
  inp.style.cssText='flex:1;background:#1e1e2e;border:none;border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;font-family:inherit;direction:rtl';
  var btn=document.createElement('button');
  btn.textContent='\u27A4';btn.onclick=_dmSend;
  btn.style.cssText='background:#5865f2;border:none;color:#fff;width:40px;border-radius:8px;cursor:pointer;font-size:18px';
  footer.appendChild(inp);footer.appendChild(btn);
  chat.appendChild(header);chat.appendChild(msgs);chat.appendChild(footer);
  d.appendChild(empty);d.appendChild(chat);
  el.innerHTML='';el.appendChild(d);
}

function _dmAv(u,sz){
  sz=sz||38;
  if(u&&u.avatarUrl) return '<img src="'+u.avatarUrl+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover;flex-shrink:0">';
  return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+(u&&u.color||'#5865f2')+';display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:'+(sz/3)+'px;flex-shrink:0">'+(u&&u.username||'?')[0].toUpperCase()+'</div>';
}

async function _dmLoadFriends(){
  var d=await api('/api/friends');
  if(d.ok){_dmF=d.friends||[];_dmR=d.requests||[];_dmShowTab(_dmTab);}
}

function _dmShowTab(t){
  _dmTab=t;
  var tf=document.getElementById('_dmTabF'),tr=document.getElementById('_dmTabR'),el=document.getElementById('_dmSideList');
  if(!el)return;
  if(tf){tf.style.background=t==='f'?'#5865f2':'#2a2a3e';tf.style.color=t==='f'?'#fff':'#aaa';}
  if(tr){tr.style.background=t==='r'?'#5865f2':'#2a2a3e';tr.style.color=t==='r'?'#fff':'#aaa';}
  el.innerHTML='';
  if(t==='f'){
    if(!_dmF.length){el.innerHTML='<div style="color:#555;text-align:center;padding:20px;font-size:13px">\u062F\u0648\u0633\u062A\u06CC \u0646\u062F\u0627\u0631\u06CC!<br>\u062C\u0633\u062A\u062C\u0648 \u06A9\u0646</div>';return;}
    _dmF.forEach(function(f){
      var sc=f.status==='online'?'#3ba55d':'#747f8d';
      var dmId=f.dmId||[window.me&&window.me.id,f.id].sort().join('_');
      var row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:3px';
      row.innerHTML='<div style="position:relative">'+_dmAv(f,36)+'<div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:'+sc+';border:2px solid #111122"></div></div><span style="flex:1;color:#ccc;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.username+'</span>';
      row.onmouseover=function(){this.style.background='#1e1e2e';};
      row.onmouseout=function(){this.style.background='none';};
      row.onclick=function(){_dmOpenChat(f.id,f.username,dmId);};
      el.appendChild(row);
    });
  } else {
    if(!_dmR.length){el.innerHTML='<div style="color:#555;text-align:center;padding:20px;font-size:13px">\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC \u0646\u062F\u0627\u0631\u06CC</div>';return;}
    _dmR.forEach(function(r){
      var row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#1e1e2e;margin-bottom:6px';
      var avEl=document.createElement('div');avEl.innerHTML=_dmAv(r,36);
      var nameEl=document.createElement('span');nameEl.style.cssText='flex:1;color:#ccc;font-size:13px';nameEl.textContent=r.username;
      var acc=document.createElement('button');acc.textContent='\u2713';acc.style.cssText='background:#3ba55d;border:none;color:#fff;padding:5px 10px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:12px';
      acc.onclick=function(){_dmAccept(r.from);};
      var rej=document.createElement('button');rej.textContent='\u2715';rej.style.cssText='background:#f23f42;border:none;color:#fff;padding:5px 8px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:12px;margin-right:3px';
      rej.onclick=function(){_dmReject(r.from);};
      row.appendChild(avEl);row.appendChild(nameEl);row.appendChild(acc);row.appendChild(rej);
      el.appendChild(row);
    });
  }
}

async function _dmAccept(id){var d=await api('/api/friends/accept','POST',{fromId:id});if(d.ok){await _dmLoadFriends();showToast('\u2705 \u062F\u0648\u0633\u062A \u0627\u0636\u0627\u0641\u0647 \u0634\u062F');}}
async function _dmReject(id){await api('/api/friends/reject','POST',{fromId:id});_dmR=_dmR.filter(function(r){return r.from!==id;});_dmShowTab('r');}

async function _dmOpenChat(uid,uname,dmId){
  _dmCurId=dmId;_dmCurUser={id:uid,username:uname};
  var empty=document.getElementById('_dmEmpty'),chat=document.getElementById('_dmChat');
  if(empty)empty.style.display='none';
  if(chat)chat.style.display='flex';
  var nm=document.getElementById('_dmChatName');if(nm)nm.textContent=uname;
  var av=document.getElementById('_dmChatAv');
  var f=_dmF.find(function(x){return x.id===uid;});
  if(av&&f){av.innerHTML=_dmAv(f,36);av.style.cssText='flex-shrink:0';}
  var d=await api('/api/dm/'+dmId);
  if(d.ok){_dmMsgs[dmId]=d.messages||[];_dmRenderMsgs();}
  _dmShowTab('f');
}

function _dmRenderMsgs(){
  var el=document.getElementById('_dmMsgs');if(!el||!_dmCurId)return;
  var msgs=_dmMsgs[_dmCurId]||[];
  if(!msgs.length){el.innerHTML='<div style="color:#555;text-align:center;padding:30px;font-size:14px">\u0627\u0648\u0644\u06CC\u0646 \u067E\u06CC\u0627\u0645 \u0631\u0648 \u0628\u0641\u0631\u0633\u062A!</div>';return;}
  el.innerHTML='';
  msgs.forEach(function(m){
    var isMe=m.userId===(window.me&&window.me.id);
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;flex-direction:'+(isMe?'row-reverse':'row');
    var avDiv=document.createElement('div');avDiv.innerHTML=_dmAv({username:m.username,avatarUrl:m.avatarUrl,color:m.color},34);
    var bubble=document.createElement('div');bubble.style.cssText='max-width:65%';
    var time=new Date(m.at).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
    bubble.innerHTML='<div style="font-size:11px;color:#555;margin-bottom:3px;text-align:'+(isMe?'left':'right')+'">'+(isMe?'\u0634\u0645\u0627':m.username)+' \u00B7 '+time+'</div><div style="background:'+(isMe?'#5865f2':'#1e1e2e')+';border-radius:12px;padding:8px 12px;color:#fff;font-size:14px;line-height:1.5;word-break:break-word">'+m.text+'</div>';
    row.appendChild(avDiv);row.appendChild(bubble);el.appendChild(row);
  });
  el.scrollTop=el.scrollHeight;
}

function _dmSend(){
  var inp=document.getElementById('_dmInput');if(!inp)return;
  var text=inp.value.trim();if(!text||!_dmCurId)return;
  inp.value='';
  window.socket&&window.socket.emit('dm_message',{dmId:_dmCurId,text:text,toUserId:_dmCurUser.id});
}

function _dmCallCur(){
  if(!_dmCurUser)return;
  showToast('\uD83D\uDCDE \u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u0642\u0631\u0627\u0631\u06CC \u062A\u0645\u0627\u0633...');
  window.socket&&window.socket.emit('dm_call_request',{toUserId:_dmCurUser.id,fromUsername:window.me&&window.me.username});
}

async function _dmSearch(q){
  var el=document.getElementById('_dmSearchRes');if(!el)return;
  if(!q||q.length<2){el.innerHTML='';return;}
  var d=await api('/api/users/search?q='+encodeURIComponent(q));if(!d.ok)return;
  el.innerHTML='';
  d.users.forEach(function(u){
    var isFriend=_dmF.find(function(f){return f.id===u.id;});
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px;border-radius:7px';
    row.onmouseover=function(){this.style.background='#1e1e2e';};
    row.onmouseout=function(){this.style.background='none';};
    var avEl=document.createElement('div');avEl.innerHTML=_dmAv(u,30);
    var nameEl=document.createElement('span');nameEl.style.cssText='flex:1;color:#ccc;font-size:13px';nameEl.textContent=u.username;
    var btn=document.createElement('button');
    if(isFriend){
      btn.textContent='\uD83D\uDCAC';btn.style.cssText='background:#5865f2;border:none;color:#fff;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:12px;font-family:inherit';
      btn.onclick=function(){_dmOpenChat(u.id,u.username,isFriend.dmId);};
    } else {
      btn.textContent='+\u0627\u0636\u0627\u0641\u0647';btn.style.cssText='background:#3ba55d;border:none;color:#fff;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:12px;font-family:inherit';
      btn.onclick=function(){_dmAddFriend(u.id);};
    }
    row.appendChild(avEl);row.appendChild(nameEl);row.appendChild(btn);el.appendChild(row);
  });
}

async function _dmAddFriend(id){var d=await api('/api/friends/request','POST',{targetId:id});showToast(d.ok?'\u2705 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0641\u0631\u0633\u062A\u0627\u062F\u0647 \u0634\u062F':'\u274C '+d.msg);}

function _dmInitSock(){
  window.socket.on('friend_request',function(r){_dmR.push(r);showToast(r.username+' \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062F\u0648\u0633\u062A\u06CC \u0641\u0631\u0633\u062A\u0627\u062F');});
  window.socket.on('friend_accepted',function(r){_dmLoadFriends();showToast(r.username+' \u0642\u0628\u0648\u0644 \u06A9\u0631\u062F');});
  window.socket.on('dm_message',function(d){
    if(!_dmMsgs[d.dmId])_dmMsgs[d.dmId]=[];
    _dmMsgs[d.dmId].push(d.msg);
    if(_dmCurId===d.dmId)_dmRenderMsgs();
    else showToast('\uD83D\uDCAC \u067E\u06CC\u0627\u0645 \u0627\u0632 '+d.msg.username);
  });
  window.socket.on('dm_call_request',function(d){
    var t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e1e2e;border:1px solid #5865f2;padding:16px 24px;border-radius:12px;z-index:9999;display:flex;gap:12px;align-items:center;box-shadow:0 8px 32px rgba(0,0,0,.5)';
    var acc=document.createElement('button');acc.textContent='\u0642\u0628\u0648\u0644';acc.style.cssText='background:#3ba55d;border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit';
    acc.onclick=function(){window.socket.emit('dm_call_accept',{toUserId:d.fromUserId});t.remove();};
    var rej=document.createElement('button');rej.textContent='\u0631\u062F';rej.style.cssText='background:#f23f42;border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-family:inherit';
    rej.onclick=function(){t.remove();};
    var lbl=document.createElement('span');lbl.style.color='#fff';lbl.style.fontSize='14px';lbl.textContent='\uD83D\uDCDE '+d.fromUsername+' \u062F\u0627\u0631\u0647 \u0632\u0646\u06AF \u0645\u06CC\u0632\u0646\u0647';
    t.appendChild(lbl);t.appendChild(acc);t.appendChild(rej);
    document.body.appendChild(t);setTimeout(function(){t.remove();},30000);
  });
}

window.openDMModal=openDMView;
window.openDMView=openDMView;
