// DM Call UI - Beautiful style
function _dmShowCallUI(uname, avatarUrl, state) {
  var ex = document.getElementById('_dmCallUI');
  if (ex) ex.remove();

  var ui = document.createElement('div');
  ui.id = '_dmCallUI';
  ui.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#0a0a14;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:40px 0;font-family:inherit';

  var connected = state === 'connected';

  // Avatar with pulse animation
  var avHtml = avatarUrl
    ? '<img src="' + avatarUrl + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover">'
    : '<div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#5865f2,#7983f5);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:48px">' + (uname || '?')[0].toUpperCase() + '</div>';

  var timer = 0;
  var timerEl;

  ui.innerHTML =
    '<style>' +
    '@keyframes dmPulse{0%{box-shadow:0 0 0 0 rgba(88,101,242,.6)}70%{box-shadow:0 0 0 40px rgba(88,101,242,0)}100%{box-shadow:0 0 0 0 rgba(88,101,242,0)}}' +
    '@keyframes dmPulse2{0%{box-shadow:0 0 0 0 rgba(88,101,242,.3)}70%{box-shadow:0 0 0 60px rgba(88,101,242,0)}100%{box-shadow:0 0 0 0 rgba(88,101,242,0)}}' +
    '@keyframes dmWave{0%,100%{height:8px}50%{height:32px}}' +
    '</style>' +
    // Top bar
    '<div style="display:flex;align-items:center;gap:12px;width:100%;padding:0 24px;box-sizing:border-box">' +
      '<div style="width:40px;height:40px;border-radius:50%;overflow:hidden">' + avHtml.replace('120px', '40px').replace('48px', '16px') + '</div>' +
      '<div><div style="color:#fff;font-weight:700;font-size:15px">' + uname + '</div>' +
      '<div id="_dmCallStateTxt" style="color:' + (connected ? '#3ba55d' : '#aaa') + ';font-size:12px">' + (connected ? 'در حال تماس' : 'در حال تماس...') + '</div></div>' +
      '<div id="_dmCallTimer" style="color:#aaa;font-size:13px;margin-right:auto"></div>' +
      '<button onclick="document.getElementById(\'_dmCallUI\').remove()" style="background:rgba(255,255,255,.1);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:16px">💬</button>' +
    '</div>' +
    // Center - avatar with pulse
    '<div style="display:flex;flex-direction:column;align-items:center;gap:24px">' +
      '<div style="border-radius:50%;animation:dmPulse 2s infinite;' + (connected ? 'animation:dmPulse2 1.5s infinite' : '') + '">' +
        '<div style="border-radius:50%;padding:8px;background:rgba(88,101,242,.2)">' +
          '<div style="border-radius:50%;overflow:hidden">' + avHtml + '</div>' +
        '</div>' +
      '</div>' +
      // Waveform (only when connected)
      (connected ? '<div style="display:flex;align-items:center;gap:4px;height:40px">' +
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(function(i) {
          return '<div style="width:3px;background:linear-gradient(to top,#5865f2,#7983f5);border-radius:3px;animation:dmWave 1.' + (i%5+1) + 's ease-in-out infinite;animation-delay:' + (i*0.07) + 's"></div>';
        }).join('') +
      '</div>' : '<div style="display:flex;gap:6px"><div style="width:8px;height:8px;border-radius:50%;background:#5865f2;animation:dmPulse 1s infinite"></div><div style="width:8px;height:8px;border-radius:50%;background:#5865f2;animation:dmPulse 1s .3s infinite"></div><div style="width:8px;height:8px;border-radius:50%;background:#5865f2;animation:dmPulse 1s .6s infinite"></div></div>') +
      '<div style="text-align:center"><div style="color:#fff;font-weight:700;font-size:22px;margin-bottom:6px">' + uname + '</div>' +
      '<div style="color:' + (connected ? '#3ba55d' : '#888') + ';font-size:15px">' + (connected ? 'اتصال برقرار است' : 'در حال تماس...') + '</div></div>' +
    '</div>' +
    // Bottom buttons
    '<div style="display:flex;align-items:center;gap:24px">' +
      '<button id="_dmMuteBtn" onclick="_dmToggleMute()" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;cursor:pointer;font-size:22px" title="میوت">🎤</button>' +
      '<button onclick="_dmEndCall()" style="width:72px;height:72px;border-radius:50%;background:#f23f42;border:none;color:#fff;cursor:pointer;font-size:28px">📵</button>' +
      '<button style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#aaa;cursor:pointer;font-size:22px">📷</button>' +
    '</div>';

  document.body.appendChild(ui);

  // Start timer if connected
  if (connected) {
    _dmCallTimerStart();
  }
}

var _dmCallTimerInt = null;
function _dmCallTimerStart() {
  var secs = 0;
  _dmCallTimerInt = setInterval(function() {
    secs++;
    var m = Math.floor(secs / 60).toString().padStart(2, '0');
    var s = (secs % 60).toString().padStart(2, '0');
    var el = document.getElementById('_dmCallTimer');
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

var _dmMuted = false;
function _dmToggleMute() {
  _dmMuted = !_dmMuted;
  var btn = document.getElementById('_dmMuteBtn');
  if (btn) {
    btn.style.background = _dmMuted ? '#f23f42' : 'rgba(255,255,255,.1)';
    btn.style.border = _dmMuted ? '2px solid #f23f42' : 'none';
    btn.textContent = _dmMuted ? '🔇' : '🎤';
  }
  if (window._dmLocalStream) {
    window._dmLocalStream.getAudioTracks().forEach(function(t) { t.enabled = !_dmMuted; });
  }
}
