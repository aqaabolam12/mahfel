// ─── DM Call System - Clean WebRTC Implementation ────────────────────────

var _call = {
  pc: null,
  localStream: null,
  remoteUser: null,
  isCaller: false,
  timerInt: null,
  ringInt: null,
  muted: false
};

var _callICE = [
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}
];

// ── Ring tone ──────────────────────────────────────────────────────────────
function callPlayRing() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    function beep() {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 440;
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.5);
    }
    beep();
    _call.ringInt = setInterval(beep, 1800);
  } catch(e) {}
}

function callStopRing() {
  if (_call.ringInt) { clearInterval(_call.ringInt); _call.ringInt = null; }
}

// ── Call UI ────────────────────────────────────────────────────────────────
function callShowUI(username, state) {
  var ex = document.getElementById('_callUI'); if (ex) ex.remove();
  if (_call.timerInt) { clearInterval(_call.timerInt); _call.timerInt = null; }

  var ui = document.createElement('div');
  ui.id = '_callUI';
  ui.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#070710;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:48px 0 40px;direction:rtl';

  var connected = state === 'connected';
  var initial = (username || '?')[0].toUpperCase();

  ui.innerHTML =
    '<style>' +
    '@keyframes cp{0%{box-shadow:0 0 0 0 rgba(88,101,242,.7)}70%{box-shadow:0 0 0 50px rgba(88,101,242,0)}100%{box-shadow:0 0 0 0 rgba(88,101,242,0)}}' +
    '@keyframes cw{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}' +
    '</style>' +
    // Header
    '<div style="text-align:center">' +
      '<div style="color:#888;font-size:13px;margin-bottom:4px">' + (connected ? 'در تماس با' : 'در حال برقراری تماس با') + '</div>' +
      '<div style="color:#fff;font-weight:700;font-size:17px">' + (username || 'کاربر') + '</div>' +
      '<div id="_callTimer" style="color:#3ba55d;font-size:13px;margin-top:4px;min-height:18px"></div>' +
    '</div>' +
    // Avatar
    '<div style="display:flex;flex-direction:column;align-items:center;gap:28px">' +
      '<div style="width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,#5865f2,#4752c4);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:56px;' + (connected ? '' : 'animation:cp 2s infinite') + '">' + initial + '</div>' +
      (connected ?
        '<div style="display:flex;align-items:flex-end;gap:3px;height:40px">' +
        [.6,.8,.5,1,.7,.9,.4,.8,.6,.7,.5,.9,.8,.6,.7].map(function(h,i){
          return '<div style="width:4px;background:linear-gradient(to top,#5865f2,#a5b4fc);border-radius:4px;animation:cw '+(0.8+h*0.4).toFixed(1)+'s ease-in-out infinite;animation-delay:'+(i*0.06).toFixed(2)+'s"></div>';
        }).join('') +
        '</div>'
      :
        '<div style="display:flex;gap:8px">' +
        [0,0.3,0.6].map(function(d){
          return '<div style="width:10px;height:10px;border-radius:50%;background:#5865f2;animation:cp 1.5s '+d+'s infinite"></div>';
        }).join('') +
        '</div>'
      ) +
    '</div>' +
    // Buttons
    '<div style="display:flex;flex-direction:column;align-items:center;gap:20px">' +
      '<div style="display:flex;gap:32px;align-items:center">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px">' +
          '<button id="_callMuteBtn" onclick="callToggleMute()" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.12);border:none;color:#fff;cursor:pointer;font-size:22px">🎤</button>' +
          '<span style="color:#888;font-size:11px">میوت</span>' +
        '</div>' +
        '<button onclick="callEnd()" style="width:72px;height:72px;border-radius:50%;background:#f23f42;border:none;color:#fff;cursor:pointer;font-size:30px;box-shadow:0 4px 20px rgba(242,63,66,.5)">📵</button>' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:8px">' +
          '<button style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.12);border:none;color:#aaa;cursor:pointer;font-size:22px">🔈</button>' +
          '<span style="color:#888;font-size:11px">بلندگو</span>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(ui);

  if (connected) {
    var secs = 0;
    _call.timerInt = setInterval(function() {
      secs++;
      var m = String(Math.floor(secs/60)).padStart(2,'0');
      var s = String(secs%60).padStart(2,'0');
      var el = document.getElementById('_callTimer');
      if (el) el.textContent = m + ':' + s;
    }, 1000);
  }
}

// ── Incoming call UI ────────────────────────────────────────────────────────
function callShowIncoming(fromUserId, fromUsername) {
  callPlayRing();
  var ex = document.getElementById('_callIncoming'); if (ex) ex.remove();
  var t = document.createElement('div');
  t.id = '_callIncoming';
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #5865f2;padding:20px 28px;border-radius:16px;z-index:99999;display:flex;align-items:center;gap:16px;box-shadow:0 8px 40px rgba(0,0,0,.8);direction:rtl;min-width:300px';
  t.innerHTML =
    '<div style="width:48px;height:48px;border-radius:50%;background:#5865f2;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:20px;flex-shrink:0">' + (fromUsername||'?')[0].toUpperCase() + '</div>' +
    '<div style="flex:1"><div style="color:#fff;font-weight:700;font-size:15px">' + (fromUsername||'کاربر') + '</div><div style="color:#aaa;font-size:12px">تماس صوتی</div></div>' +
    '<button id="_callAcceptBtn" style="background:#3ba55d;border:none;color:#fff;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px">📞</button>' +
    '<button id="_callRejectBtn" style="background:#f23f42;border:none;color:#fff;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:20px;margin-right:4px">📵</button>';
  document.body.appendChild(t);

  document.getElementById('_callAcceptBtn').onclick = function() {
    callStopRing();
    t.remove();
    _call.remoteUser = { id: fromUserId, username: fromUsername };
    _call.isCaller = false;
    window.socket.emit('dm_call_accept', { toUserId: fromUserId });
    callShowUI(fromUsername, 'connected');
    callStartWebRTC(false);
  };

  document.getElementById('_callRejectBtn').onclick = function() {
    callStopRing();
    t.remove();
    window.socket.emit('dm_call_reject', { toUserId: fromUserId });
  };

  setTimeout(function() { callStopRing(); if(t.parentNode) t.remove(); }, 30000);
}

// ── WebRTC ─────────────────────────────────────────────────────────────────
async function callStartWebRTC(isCaller) {
  try {
    _call.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _call.pc = new RTCPeerConnection({ iceServers: _callICE });

    _call.localStream.getTracks().forEach(function(t) { _call.pc.addTrack(t, _call.localStream); });

    _call.pc.ontrack = function(e) {
      var audio = document.getElementById('_callAudio');
      if (!audio) { audio = document.createElement('audio'); audio.id = '_callAudio'; audio.autoplay = true; document.body.appendChild(audio); }
      audio.srcObject = e.streams[0];
    };

    _call.pc.onicecandidate = function(e) {
      if (e.candidate && _call.remoteUser) {
        window.socket.emit('dm_rtc_ice', { toUserId: _call.remoteUser.id, candidate: e.candidate });
      }
    };

    _call.pc.onconnectionstatechange = function() {
      console.log('WebRTC state:', _call.pc.connectionState);
    };

    if (isCaller) {
      var offer = await _call.pc.createOffer();
      await _call.pc.setLocalDescription(offer);
      window.socket.emit('dm_rtc_offer', { toUserId: _call.remoteUser.id, offer: offer });
    }
  } catch(e) {
    console.error('WebRTC error:', e);
    showToast('❌ خطا در دسترسی به میکروفون');
  }
}

// ── Call controls ──────────────────────────────────────────────────────────
function callToggleMute() {
  _call.muted = !_call.muted;
  if (_call.localStream) {
    _call.localStream.getAudioTracks().forEach(function(t) { t.enabled = !_call.muted; });
  }
  var btn = document.getElementById('_callMuteBtn');
  if (btn) { btn.textContent = _call.muted ? '🔇' : '🎤'; btn.style.background = _call.muted ? '#f23f42' : 'rgba(255,255,255,.12)'; }
}

function callEnd() {
  callStopRing();
  if (_call.timerInt) { clearInterval(_call.timerInt); _call.timerInt = null; }
  if (_call.pc) { _call.pc.close(); _call.pc = null; }
  if (_call.localStream) { _call.localStream.getTracks().forEach(function(t){t.stop();}); _call.localStream = null; }
  var audio = document.getElementById('_callAudio'); if (audio) audio.remove();
  var ui = document.getElementById('_callUI'); if (ui) ui.remove();
  if (_call.remoteUser && window.socket) window.socket.emit('dm_call_end', { toUserId: _call.remoteUser.id });
  _call.remoteUser = null;
  showToast('تماس پایان یافت');
}

// ── Make a call ────────────────────────────────────────────────────────────
function callStart(userId, username) {
  _call.remoteUser = { id: userId, username: username };
  _call.isCaller = true;
  callPlayRing();
  callShowUI(username, 'calling');
  window.socket.emit('dm_call_request', { toUserId: userId, fromUsername: window.me && window.me.username });
}

// ── Socket handlers ────────────────────────────────────────────────────────
function callInitSockets() {
  window.socket.on('dm_call_request', function(d) {
    callShowIncoming(d.fromUserId, d.fromUsername);
  });

  window.socket.on('dm_call_accept', function(d) {
    callStopRing();
    callShowUI(_call.remoteUser && _call.remoteUser.username, 'connected');
    setTimeout(function() { callStartWebRTC(true); }, 300);
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
    _call.remoteUser = null;
    showToast('تماس پایان یافت');
  });

  window.socket.on('dm_rtc_offer', async function(d) {
    if (!_call.pc) { await callStartWebRTC(false); }
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
window.callInitSockets = callInitSockets;
