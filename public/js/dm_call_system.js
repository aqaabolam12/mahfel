// ─── DM Call System v2 ───────────────────────────────────────────────────

var _call = {
  pc: null, localStream: null, remoteUser: null,
  isCaller: false, timerInt: null, ringInt: null, muted: false
};
var _callPeers = {};

var _callICE = [
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}
];

// ── Ring ─────────────────────────────────────────────────────────────────
function callPlayRing() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    function beep() {
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value=440;
      g.gain.setValueAtTime(0.3,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+0.4);
      o.start(); o.stop(ctx.currentTime+0.5);
    }
    beep();
    _call.ringInt = setInterval(beep, 1800);
  } catch(e) {}
}

function callStopRing() {
  if (_call.ringInt) { clearInterval(_call.ringInt); _call.ringInt = null; }
}

// ── Call UI (glassmorphism) ───────────────────────────────────────────────
function callShowUI(username, state) {
  var ex = document.getElementById('_callUI'); if (ex) ex.remove();
  if (_call.timerInt) { clearInterval(_call.timerInt); _call.timerInt = null; }

  var ui = document.createElement('div');
  ui.id = '_callUI';
  ui.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:40px 24px;direction:rtl;backdrop-filter:blur(20px);background:rgba(10,10,20,0.85)';

  var connected = state === 'connected';
  var initial = (username || '?')[0].toUpperCase();
  var secs = 0;

  // Glass card
  var card = document.createElement('div');
  card.style.cssText = 'width:100%;max-width:400px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;text-align:center;backdrop-filter:blur(10px)';

  // Avatar
  var avWrap = document.createElement('div');
  avWrap.style.cssText = 'width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#5865f2,#4752c4);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:40px;margin:0 auto 20px;' + (connected ? '' : 'animation:cp 2s infinite');
  avWrap.textContent = initial;

  // Style for animation
  if (!document.getElementById('_callStyle')) {
    var s = document.createElement('style');
    s.id = '_callStyle';
    s.textContent = '@keyframes cp{0%{box-shadow:0 0 0 0 rgba(88,101,242,.7)}70%{box-shadow:0 0 0 40px rgba(88,101,242,0)}100%{box-shadow:0 0 0 0 rgba(88,101,242,0)}}@keyframes cw{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}';
    document.head.appendChild(s);
  }

  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'color:#fff;font-weight:700;font-size:20px;margin-bottom:6px';
  nameEl.textContent = username || 'کاربر';

  var statusEl = document.createElement('div');
  statusEl.id = '_callStatusTxt';
  statusEl.style.cssText = 'color:' + (connected ? '#3ba55d' : '#aaa') + ';font-size:14px;margin-bottom:' + (connected ? '16px' : '24px');
  statusEl.textContent = connected ? 'اتصال برقرار است' : 'در حال تماس...';

  var timerEl = document.createElement('div');
  timerEl.id = '_callTimer';
  timerEl.style.cssText = 'color:#3ba55d;font-size:13px;min-height:18px;margin-bottom:8px';

  // Waveform (only when connected)
  var waveEl = document.createElement('div');
  if (connected) {
    waveEl.style.cssText = 'display:flex;align-items:flex-end;justify-content:center;gap:3px;height:32px;margin-bottom:8px';
    [.5,.8,.6,1,.7,.9,.4,.8,.6,.7,.5,.9].forEach(function(h, i) {
      var bar = document.createElement('div');
      bar.style.cssText = 'width:3px;background:linear-gradient(to top,#5865f2,#a5b4fc);border-radius:3px;animation:cw ' + (0.7+h*0.5).toFixed(1) + 's ease-in-out infinite;animation-delay:' + (i*0.06).toFixed(2) + 's';
      waveEl.appendChild(bar);
    });
  }

  card.appendChild(avWrap);
  card.appendChild(nameEl);
  card.appendChild(statusEl);
  card.appendChild(timerEl);
  if (connected) card.appendChild(waveEl);

  // Participants count (for group)
  var peerCount = Object.keys(_callPeers).length;
  if (peerCount > 0) {
    var pcEl = document.createElement('div');
    pcEl.style.cssText = 'color:#aaa;font-size:12px;margin-top:4px';
    pcEl.textContent = (peerCount + 1) + ' نفر در تماس';
    card.appendChild(pcEl);
  }

  ui.appendChild(card);

  // Buttons row - all in one line, glass style
  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:16px;width:100%;max-width:400px';

  function mkBtn(icon, label, color, onclick) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer';
    var btn = document.createElement('button');
    btn.style.cssText = 'width:52px;height:52px;border-radius:50%;background:' + (color || 'rgba(255,255,255,0.1)') + ';border:1px solid rgba(255,255,255,0.15);color:#fff;cursor:pointer;font-size:20px;backdrop-filter:blur(10px)';
    btn.textContent = icon;
    btn.onclick = onclick;
    var lbl = document.createElement('span');
    lbl.style.cssText = 'color:#aaa;font-size:11px';
    lbl.textContent = label;
    wrap.appendChild(btn);
    wrap.appendChild(lbl);
    return {wrap: wrap, btn: btn};
  }

  var muteB = mkBtn('🎤', 'میوت', '', callToggleMute);
  muteB.btn.id = '_callMuteBtn';

  var inviteB = mkBtn('👤+', 'دعوت', '', callInvite);
  var miniB = mkBtn('⬇', 'کوچک', '', callMinimize);
  var endB = mkBtn('✕', 'قطع', 'rgba(242,63,66,0.8)', callEnd);
  endB.btn.style.width = '64px';
  endB.btn.style.height = '64px';
  endB.btn.style.fontSize = '22px';

  btns.appendChild(muteB.wrap);
  btns.appendChild(inviteB.wrap);
  btns.appendChild(endB.wrap);
  btns.appendChild(miniB.wrap);

  ui.appendChild(btns);
  document.body.appendChild(ui);

  if (connected) {
    _call.timerInt = setInterval(function() {
      secs++;
      var m = String(Math.floor(secs/60)).padStart(2,'0');
      var s2 = String(secs%60).padStart(2,'0');
      var el = document.getElementById('_callTimer');
      if (el) el.textContent = m + ':' + s2;
      var el2 = document.getElementById('_callMiniTimer');
      if (el2) el2.textContent = m + ':' + s2;
    }, 1000);
  }
}

// ── Mini bar ─────────────────────────────────────────────────────────────
function callShowMiniBar(username) {
  var ex = document.getElementById('_callMini'); if (ex) ex.remove();
  var bar = document.createElement('div');
  bar.id = '_callMini';
  bar.style.cssText = 'position:fixed;top:0;left:312px;right:0;height:44px;background:rgba(26,26,46,0.95);border-bottom:1px solid rgba(88,101,242,0.5);z-index:88888;display:flex;align-items:center;padding:0 16px;gap:10px;direction:rtl;backdrop-filter:blur(10px)';

  var dot = document.createElement('div');
  dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#3ba55d;animation:cp 1.5s infinite;flex-shrink:0';

  var txt = document.createElement('span');
  txt.style.cssText = 'color:#ccc;font-size:13px;flex:1';
  txt.textContent = 'در تماس با ' + (username || 'کاربر');

  var timer = document.createElement('span');
  timer.id = '_callMiniTimer';
  timer.style.cssText = 'color:#888;font-size:12px';

  var btnMax = document.createElement('button');
  btnMax.textContent = 'بازگردانی';
  btnMax.style.cssText = 'background:rgba(88,101,242,0.3);border:1px solid rgba(88,101,242,0.5);color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit';
  btnMax.onclick = callShowFull;

  var btnEnd = document.createElement('button');
  btnEnd.textContent = 'قطع';
  btnEnd.style.cssText = 'background:rgba(242,63,66,0.7);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit';
  btnEnd.onclick = callEnd;

  bar.appendChild(dot); bar.appendChild(txt); bar.appendChild(timer);
  bar.appendChild(btnMax); bar.appendChild(btnEnd);
  document.body.appendChild(bar);
}

function callShowFull() {
  var mini = document.getElementById('_callMini'); if (mini) mini.remove();
  var ui = document.getElementById('_callUI');
  if (ui) ui.style.display = 'flex';
  else if (_call.remoteUser) callShowUI(_call.remoteUser.username, 'connected');
}

function callMinimize() {
  var ui = document.getElementById('_callUI'); if (ui) ui.style.display = 'none';
  callShowMiniBar(_call.remoteUser && _call.remoteUser.username || 'کاربر');
}

// ── Invite ────────────────────────────────────────────────────────────────
function callInvite() {
  var ex = document.getElementById('_callInvMenu'); if (ex) { ex.remove(); return; }
  var friends = window._dmF || [];
  var active = [_call.remoteUser && _call.remoteUser.id].concat(Object.keys(_callPeers)).filter(Boolean);
  var available = friends.filter(function(f) { return active.indexOf(f.id) < 0; });

  var menu = document.createElement('div');
  menu.id = '_callInvMenu';
  menu.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(20,20,36,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;z-index:999999;min-width:240px;direction:rtl;backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,.8)';

  var title = document.createElement('div');
  title.style.cssText = 'color:#fff;font-weight:700;font-size:14px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1)';
  title.textContent = 'دعوت به تماس';
  menu.appendChild(title);

  if (!available.length) {
    var msg = document.createElement('div');
    msg.style.cssText = 'color:#888;font-size:13px;text-align:center;padding:12px';
    msg.textContent = 'دوست دیگه‌ای نداری';
    menu.appendChild(msg);
  } else {
    available.forEach(function(f) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:10px;cursor:pointer;margin-bottom:4px';
      row.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.08)'; };
      row.onmouseout = function() { this.style.background = 'none'; };

      var av = document.createElement('div');
      av.style.cssText = 'width:34px;height:34px;border-radius:50%;background:' + (f.color || '#5865f2') + ';display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;flex-shrink:0';
      av.textContent = f.username[0].toUpperCase();

      var name = document.createElement('span');
      name.style.cssText = 'flex:1;color:#ccc;font-size:14px';
      name.textContent = f.username;

      var callBtn = document.createElement('button');
      callBtn.textContent = 'دعوت';
      callBtn.style.cssText = 'background:rgba(88,101,242,0.4);border:1px solid rgba(88,101,242,0.6);color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit';
      callBtn.onclick = function(e) {
        e.stopPropagation();
        window.socket && window.socket.emit('dm_call_request', { toUserId: f.id, fromUsername: window.me && window.me.username, isGroup: true });
        showToast('دعوتنامه به ' + f.username + ' فرستاده شد');
        menu.remove();
      };

      row.appendChild(av); row.appendChild(name); row.appendChild(callBtn);
      menu.appendChild(row);
    });
  }

  var closeBtn = document.createElement('button');
  closeBtn.textContent = 'بستن';
  closeBtn.style.cssText = 'width:100%;margin-top:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#aaa;padding:8px;border-radius:8px;cursor:pointer;font-family:inherit';
  closeBtn.onclick = function() { menu.remove(); };
  menu.appendChild(closeBtn);

  document.body.appendChild(menu);
  setTimeout(function() { if (menu.parentNode) menu.remove(); }, 15000);
}

// ── Incoming call UI ──────────────────────────────────────────────────────
function callShowIncoming(fromUserId, fromUsername) {
  callPlayRing();
  var ex = document.getElementById('_callIncoming'); if (ex) ex.remove();
  var t = document.createElement('div');
  t.id = '_callIncoming';
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(20,20,36,0.95);border:1px solid rgba(88,101,242,0.4);padding:16px 20px;border-radius:16px;z-index:99999;display:flex;align-items:center;gap:12px;box-shadow:0 8px 40px rgba(0,0,0,.8);direction:rtl;min-width:280px;backdrop-filter:blur(20px)';

  var av = document.createElement('div');
  av.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#5865f2;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:18px;flex-shrink:0';
  av.textContent = (fromUsername || '?')[0].toUpperCase();

  var info = document.createElement('div');
  info.style.cssText = 'flex:1';
  info.innerHTML = '<div style="color:#fff;font-weight:700;font-size:14px">' + (fromUsername || 'کاربر') + '</div><div style="color:#aaa;font-size:12px">تماس صوتی</div>';

  var acc = document.createElement('button');
  acc.style.cssText = 'background:#3ba55d;border:none;color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:18px;flex-shrink:0';
  acc.textContent = '📞';
  acc.onclick = function() {
    callStopRing();
    t.remove();
    _call.remoteUser = { id: fromUserId, username: fromUsername };
    _call.isCaller = false;
    window.socket.emit('dm_call_accept', { toUserId: fromUserId });
    callShowUI(fromUsername, 'connected');
    callStartWebRTC(false, _call.remoteUser);
  };

  var rej = document.createElement('button');
  rej.style.cssText = 'background:#f23f42;border:none;color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:18px;flex-shrink:0';
  rej.textContent = '📵';
  rej.onclick = function() {
    callStopRing();
    t.remove();
    window.socket.emit('dm_call_reject', { toUserId: fromUserId });
  };

  t.appendChild(av); t.appendChild(info); t.appendChild(acc); t.appendChild(rej);
  document.body.appendChild(t);
  setTimeout(function() { callStopRing(); if (t.parentNode) t.remove(); }, 30000);
}

// ── WebRTC ────────────────────────────────────────────────────────────────
async function callStartWebRTC(isCaller, forcedRemoteUser) {
  if (forcedRemoteUser) _call.remoteUser = forcedRemoteUser;
  try {
    try {
      _call.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch(micErr) {
      console.warn('mic error:', micErr);
      _call.localStream = null;
    }
    _call.pc = new RTCPeerConnection({ iceServers: _callICE });
    if (_call.localStream) _call.localStream.getTracks().forEach(function(t) { _call.pc.addTrack(t, _call.localStream); });
    _call.pc.ontrack = function(e) {
      var audio = document.getElementById('_callAudio');
      if (!audio) { audio = document.createElement('audio'); audio.id = '_callAudio'; audio.autoplay = true; document.body.appendChild(audio); }
      audio.srcObject = e.streams[0];
    };
    _call.pc.onicecandidate = function(e) {
      if (e.candidate && _call.remoteUser) window.socket.emit('dm_rtc_ice', { toUserId: _call.remoteUser.id, candidate: e.candidate });
    };
    if (isCaller) {
      var offer = await _call.pc.createOffer();
      await _call.pc.setLocalDescription(offer);
      window.socket.emit('dm_rtc_offer', { toUserId: _call.remoteUser.id, offer: offer });
    }
  } catch(e) {
    console.error('WebRTC error:', e);
    showToast('❌ ' + e.message);
  }
}

// ── Controls ──────────────────────────────────────────────────────────────
function callToggleMute() {
  _call.muted = !_call.muted;
  if (_call.localStream) _call.localStream.getAudioTracks().forEach(function(t) { t.enabled = !_call.muted; });
  var btn = document.getElementById('_callMuteBtn');
  if (btn) { btn.textContent = _call.muted ? '🔇' : '🎤'; btn.style.background = _call.muted ? 'rgba(242,63,66,0.7)' : 'rgba(255,255,255,0.1)'; }
}

function callEnd() {
  callStopRing();
  if (_call.timerInt) { clearInterval(_call.timerInt); _call.timerInt = null; }
  if (_call.pc) { _call.pc.close(); _call.pc = null; }
  if (_call.localStream) { _call.localStream.getTracks().forEach(function(t){t.stop();}); _call.localStream = null; }
  Object.keys(_callPeers).forEach(function(id) { try{_callPeers[id].close();}catch(e){} });
  _callPeers = {};
  var audio = document.getElementById('_callAudio'); if (audio) audio.remove();
  var ui = document.getElementById('_callUI'); if (ui) ui.remove();
  var mini = document.getElementById('_callMini'); if (mini) mini.remove();
  if (_call.remoteUser && window.socket) window.socket.emit('dm_call_end', { toUserId: _call.remoteUser.id });
  _call.remoteUser = null;
  showToast('تماس پایان یافت');
}

function callStart(userId, username) {
  _call.remoteUser = { id: userId, username: username };
  _call.isCaller = true;
  callPlayRing();
  callShowUI(username, 'calling');
  window.socket.emit('dm_call_request', { toUserId: userId, fromUsername: window.me && window.me.username });
}

// ── Sockets ───────────────────────────────────────────────────────────────
function callInitSockets() {
  window.socket.on('dm_call_request', function(d) {
    if (d.isGroup && _call.remoteUser) {
      showToast(d.fromUsername + ' به تماس پیوست');
      window.socket.emit('dm_call_accept', { toUserId: d.fromUserId });
    } else {
      callShowIncoming(d.fromUserId, d.fromUsername);
    }
  });
  window.socket.on('dm_call_accept', function(d) {
    callStopRing();
    var savedUser = _call.remoteUser;
    callShowUI(_call.remoteUser && _call.remoteUser.username, 'connected');
    setTimeout(function() { callStartWebRTC(true, savedUser); }, 300);
  });
  window.socket.on('dm_call_reject', function() {
    callStopRing();
    var ui = document.getElementById('_callUI'); if (ui) ui.remove();
    showToast('❌ تماس رد شد');
  });
  window.socket.on('dm_call_end', function() {
    callStopRing();
    if (_call.timerInt) { clearInterval(_call.timerInt); _call.timerInt = null; }
    if (_call.pc) { _call.pc.close(); _call.pc = null; }
    if (_call.localStream) { _call.localStream.getTracks().forEach(function(t){t.stop();}); }
    var audio = document.getElementById('_callAudio'); if (audio) audio.remove();
    var ui = document.getElementById('_callUI'); if (ui) ui.remove();
    var mini = document.getElementById('_callMini'); if (mini) mini.remove();
    _call.remoteUser = null;
    showToast('تماس پایان یافت');
  });
  window.socket.on('dm_rtc_offer', async function(d) {
    if (!_call.pc) { await callStartWebRTC(false, {id: d.fromUserId}); }
    await _call.pc.setRemoteDescription(new RTCSessionDescription(d.offer));
    var answer = await _call.pc.createAnswer();
    await _call.pc.setLocalDescription(answer);
    window.socket.emit('dm_rtc_answer', { toUserId: d.fromUserId, answer: answer });
  });
  window.socket.on('dm_rtc_answer', async function(d) {
    if (_call.pc) await _call.pc.setRemoteDescription(new RTCSessionDescription(d.answer));
  });
  window.socket.on('dm_rtc_ice', async function(d) {
    if (_call.pc) try { await _call.pc.addIceCandidate(new RTCIceCandidate(d.candidate)); } catch(e) {}
  });
}

window.callStart = callStart;
window.callEnd = callEnd;
window.callToggleMute = callToggleMute;
window.callMinimize = callMinimize;
window.callShowFull = callShowFull;
window.callInvite = callInvite;
window.callInitSockets = callInitSockets;
