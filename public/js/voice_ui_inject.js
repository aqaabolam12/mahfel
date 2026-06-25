/* ═══════════════════════════════════════════════════════════════
   GapHub — Voice UI Inject  (voice_ui_inject.js)
   این فایل رو در public/js/ بذار و در index.html بعد از app.js لود کن:
   <script src="/js/voice_ui_inject.js"></script>
   ═══════════════════════════════════════════════════════════════
   کاری که می‌کنه:
   - منتظر می‌مونه voiceView در DOM بیاد
   - داخلش رو با UI جدید replace می‌کنه
   - renderVcUsers و toggleVcMic و toggleDeafen رو override می‌کنه
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (window.__vcInject) return;
  window.__vcInject = true;

  /* ── CSS ──────────────────────────────────────────────────── */
  var css = `
.vc-root{display:flex;flex-direction:column;height:100%;background:#0d0d16;color:#e0e0f0;font-family:inherit;overflow:hidden;}
.vc-header{display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid #1a1a2e;background:#0d0d16;flex-shrink:0;}
.vc-header-icon{font-size:18px;}
.vc-header-title{font-size:15px;font-weight:700;color:#fff;flex:1;}
.vc-header-count{font-size:12px;color:#6b7280;background:#1a1a2e;padding:2px 10px;border-radius:20px;}
.vc-body{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;}
.vc-participants{display:flex;flex-wrap:wrap;gap:8px;padding:14px 16px;background:#0d0d16;border-bottom:1px solid #141428;flex-shrink:0;}

/* Card */
.vc-card{display:flex;flex-direction:column;align-items:center;gap:8px;background:#13132a;border:1.5px solid #1e1e38;border-radius:14px;padding:14px 16px 10px;width:140px;position:relative;transition:border-color .2s,box-shadow .2s;}
.vc-card:hover{border-color:#2a2a50;}
.vc-card.speaking{border-color:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.18);}

/* Avatar */
.vc-avatar{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;position:relative;overflow:hidden;transition:box-shadow .2s;flex-shrink:0;}
.vc-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
.vc-avatar.speaking{box-shadow:0 0 0 3px #4ade80,0 0 16px rgba(74,222,128,.35);}
.vc-avatar::after{content:'';position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#3ba55d;border:2px solid #13132a;transition:background .2s;}
.vc-avatar.muted::after{background:#f23f42;}
.vc-share-badge{position:absolute;top:8px;right:8px;background:#5865f2;color:#fff;font-size:9px;padding:2px 6px;border-radius:6px;font-weight:700;}
.vc-name{font-size:13px;font-weight:600;color:#d0d2f0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;}
.vc-me-tag{font-size:10px;color:#5865f2;background:rgba(88,101,242,.12);padding:2px 8px;border-radius:6px;font-weight:700;}
.vc-vol-row{display:flex;align-items:center;gap:4px;width:100%;}
.lmute-btn{background:none;border:none;cursor:pointer;font-size:14px;padding:0;width:20px;opacity:.7;transition:opacity .15s;}
.lmute-btn:hover,.lmute-btn.muted{opacity:1;}
.vol-slider{flex:1;height:3px;accent-color:#5865f2;cursor:pointer;}
.vol-lbl{font-size:10px;color:#6b7280;min-width:28px;text-align:right;}

/* Waveform */
@keyframes vcWave{0%,100%{height:4px}50%{height:14px}}
.vc-wave{display:flex;align-items:flex-end;gap:2px;height:16px;margin-top:2px;}
.vc-wave span{width:3px;background:#4ade80;border-radius:2px;animation:vcWave 1s ease-in-out infinite;}
.vc-wave span:nth-child(2){animation-delay:.15s;}
.vc-wave span:nth-child(3){animation-delay:.3s;}
.vc-wave span:nth-child(4){animation-delay:.15s;}

/* Screen share */
.vc-screen-area{flex:1;display:flex;flex-direction:column;background:#0a0a12;border-radius:12px;margin:0 14px 14px;overflow:hidden;border:1px solid #1e1e38;min-height:0;}
.vc-screen-label{display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(10,10,20,.7);border-bottom:1px solid #1a1a2e;font-size:13px;color:#9ca3c4;flex-shrink:0;}
.vc-screen-label span{flex:1;font-weight:500;}
.vc-screen-badges{display:flex;gap:4px;}
.vc-screen-badge-btn{background:rgba(255,255,255,.06);border:none;color:#9ca3c4;width:28px;height:28px;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;font-size:14px;}
.vc-screen-badge-btn:hover{background:rgba(255,255,255,.12);color:#fff;}
.vc-screen-badge-btn.active{color:#5865f2;background:rgba(88,101,242,.18);}
.vc-screen-video-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#08080f;min-height:0;}
.vc-screen-video-wrap video{max-width:100%;max-height:100%;object-fit:contain;}

/* Empty */
.vc-empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#4b5563;}
.vc-empty-icon{font-size:48px;opacity:.4;}
.vc-empty-text{font-size:14px;}

/* Bottom bar */
.vc-bar{display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 24px 18px;background:#0d0d16;border-top:1px solid #141428;flex-shrink:0;}
.vc-bar-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:#181830;border:1.5px solid #1e1e38;color:#c0c2e0;cursor:pointer;width:72px;height:72px;border-radius:16px;font-size:11px;font-weight:600;transition:background .15s,border-color .15s,color .15s,transform .1s;}
.vc-bar-btn:hover{background:#1e1e38;border-color:#2a2a50;color:#fff;transform:translateY(-1px);}
.vc-bar-btn:active{transform:translateY(0);}
.vc-bar-btn.muted{background:rgba(242,63,66,.12);border-color:rgba(242,63,66,.3);color:#f23f42;}
.vc-bar-btn.sharing{background:rgba(88,101,242,.15);border-color:#5865f2;color:#818cf8;}
.vc-btn-leave{background:#f23f42!important;border-color:#f23f42!important;color:#fff!important;}
.vc-btn-leave:hover{background:#e02d30!important;border-color:#e02d30!important;}
.vc-btn-label{font-size:10px;font-weight:700;letter-spacing:.3px;white-space:nowrap;}

@media(max-width:640px){
  .vc-card{width:110px;padding:10px 10px 8px;}
  .vc-avatar{width:56px;height:56px;font-size:22px;}
  .vc-bar-btn{width:60px;height:60px;border-radius:14px;}
  .vc-screen-area{margin:0 8px 8px;}
}
`;

  var styleEl = document.createElement('style');
  styleEl.id = '_vcInjectCSS';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── HTML builder ─────────────────────────────────────────── */
  function buildVoiceHTML() {
    return `
<div class="vc-header">
  <span class="vc-header-icon">🔊</span>
  <span id="vcTitle" class="vc-header-title">ویس</span>
  <span id="vcMemberCount" class="vc-header-count">0 نفر</span>
</div>
<div class="vc-body">
  <div id="vcParticipants" class="vc-participants"></div>
  <div id="screenShareArea" class="hidden" style="flex:1;display:flex;flex-direction:column;background:#0a0a12;border-radius:12px;margin:0 14px 14px;overflow:hidden;border:1px solid #1e1e38;min-height:0;">
    <div class="vc-screen-label">
      🖥️
      <span id="vcSharerName">در حال اشتراک‌گذاری</span>
      <div class="vc-screen-badges">
        <button class="vc-screen-badge-btn" id="vcScreenPinBtn" onclick="vcTogglePin()" title="پین">📌</button>
        <button class="vc-screen-badge-btn" onclick="vcToggleFullscreen()" title="تمام‌صفحه">⛶</button>
      </div>
    </div>
    <div class="vc-screen-video-wrap">
      <video id="screenShareVideo" autoplay playsinline muted></video>
    </div>
  </div>
  <div id="vcEmptyState" class="vc-empty-state hidden">
    <div class="vc-empty-icon">🎤</div>
    <div class="vc-empty-text">هنوز کسی در ویس نیست</div>
  </div>
</div>
<div class="vc-bar" id="vcPanel">
  <button id="vcMuteBtn" class="vc-bar-btn" onclick="toggleVcMic()" title="میکروفون">
    <span id="_vcMicIcon">🎤</span>
    <span class="vc-btn-label">میکروفون</span>
  </button>
  <button id="deafenBtn" class="vc-bar-btn" onclick="toggleDeafen()" title="هدفون">
    🎧
    <span class="vc-btn-label">هدفون</span>
  </button>
  <button id="screenShareBtn" class="vc-bar-btn" onclick="toggleScreenShare()" title="اشتراک‌گذاری">
    🖥️
    <span class="vc-btn-label" id="vcShareBtnLabel">اشتراک</span>
  </button>
  <button class="vc-bar-btn" onclick="toggleMemberList()" title="اعضا">
    👥
    <span class="vc-btn-label">اعضا</span>
  </button>
  <button class="vc-bar-btn vc-btn-leave" onclick="leaveVoice()" title="قطع تماس">
    📵
    <span class="vc-btn-label">قطع تماس</span>
  </button>
</div>`;
  }

  /* ── Inject into voiceView ────────────────────────────────── */
  function injectUI() {
    var vv = document.getElementById('voiceView');
    if (!vv || vv._vcInjected) return;
    vv._vcInjected = true;
    vv.classList.add('vc-root');
    vv.innerHTML = buildVoiceHTML();
  }

  // Try immediately, then watch DOM
  injectUI();
  var obs = new MutationObserver(function () {
    var vv = document.getElementById('voiceView');
    if (vv && !vv._vcInjected) { injectUI(); }
  });
  obs.observe(document.body || document.documentElement, { childList: true, subtree: true });

  /* ── Override renderVcUsers ───────────────────────────────── */
  var _waitRender = setInterval(function () {
    if (typeof window.renderVcUsers === 'undefined') return;
    clearInterval(_waitRender);

    window.renderVcUsers = function (users) {
      var container = document.getElementById('vcParticipants');
      var empty     = document.getElementById('vcEmptyState');
      var countEl   = document.getElementById('vcMemberCount');
      if (!container) return;

      if (countEl) countEl.textContent = (users ? users.length : 0) + ' نفر';

      if (!users || !users.length) {
        container.innerHTML = '';
        if (empty) { empty.classList.remove('hidden'); empty.style.display = 'flex'; }
        return;
      }
      if (empty) { empty.classList.add('hidden'); empty.style.display = 'none'; }

      container.innerHTML = users.map(function (u) {
        var isMe    = u.id === (window.me && window.me.id);
        var lm      = !!(window.localMutes && window.localMutes[u.id]);
        var vol     = (window.localVolumes && window.localVolumes[u.id] != null) ? window.localVolumes[u.id] : 1;
        var speaking = u.speaking && !lm;
        var muted    = u.muted || lm;

        var avatarInner = u.avatarUrl
          ? '<img src="' + u.avatarUrl + '" alt="">'
          : (u.avatar || (u.username || '?')[0].toUpperCase());

        var shareBadge = (window.currentSharerUserId === u.id)
          ? '<span class="vc-share-badge">اشتراک</span>' : '';

        var wave = speaking
          ? '<div class="vc-wave"><span></span><span></span><span></span><span></span></div>' : '';

        var bottom = isMe
          ? '<div class="vc-me-tag">شما</div>'
          : '<div class="vc-vol-row">' +
              '<button id="lm-' + u.id + '" class="lmute-btn' + (lm ? ' muted' : '') + '" onclick="toggleLocalMute(\'' + u.id + '\')">' + (lm ? '🔇' : '🔊') + '</button>' +
              '<input type="range" class="vol-slider" min="0" max="100" value="' + Math.round(vol * 100) + '" oninput="setLocalVolume(\'' + u.id + '\',this.value/100)">' +
              '<span id="vl-' + u.id + '" class="vol-lbl">' + Math.round(vol * 100) + '%</span>' +
            '</div>';

        return '<div class="vc-card' + (speaking ? ' speaking' : '') + '">' +
          shareBadge +
          '<div class="vc-avatar' + (speaking ? ' speaking' : '') + (muted ? ' muted' : '') + '" data-uid="' + u.id + '" style="background:linear-gradient(135deg,' + u.color + ',' + u.color + 'bb);' + (lm ? 'filter:grayscale(.8);opacity:.5' : '') + '">' + avatarInner + '</div>' +
          '<div class="vc-name">' + u.username + (muted ? ' 🔇' : '') + '</div>' +
          wave + bottom +
        '</div>';
      }).join('');
    };
  }, 100);

  /* ── Mute / Deafen button sync ────────────────────────────── */
  var _waitMic = setInterval(function () {
    if (typeof window.toggleVcMic === 'undefined') return;
    clearInterval(_waitMic);

    var _origMic = window.toggleVcMic;
    window.toggleVcMic = function () {
      if (_origMic) _origMic.call(this);
      var btn = document.getElementById('vcMuteBtn');
      var ico = document.getElementById('_vcMicIcon');
      if (btn) btn.classList.toggle('muted', !!window.isMuted);
      if (ico) ico.textContent = window.isMuted ? '🔇' : '🎤';
    };

    var _origDeafen = window.toggleDeafen;
    window.toggleDeafen = function () {
      if (_origDeafen) _origDeafen.call(this);
      var btn = document.getElementById('deafenBtn');
      if (btn) btn.classList.toggle('muted', !!window.isDeafened);
    };
  }, 100);

  /* ── Screen share button sync ─────────────────────────────── */
  var _waitShare = setInterval(function () {
    if (typeof window.startScreenShare === 'undefined') return;
    clearInterval(_waitShare);

    var _origStart = window.startScreenShare;
    window.startScreenShare = function () {
      if (_origStart) _origStart.call(this);
      var btn = document.getElementById('screenShareBtn');
      var lbl = document.getElementById('vcShareBtnLabel');
      if (btn) btn.classList.add('sharing');
      if (lbl) lbl.textContent = 'توقف';
    };

    var _origStop = window.stopScreenShare;
    window.stopScreenShare = function () {
      if (_origStop) _origStop.call(this);
      var btn = document.getElementById('screenShareBtn');
      var lbl = document.getElementById('vcShareBtnLabel');
      if (btn) btn.classList.remove('sharing');
      if (lbl) lbl.textContent = 'اشتراک';
    };
  }, 100);

  /* ── Screen sharer name ───────────────────────────────────── */
  var _waitSocket = setInterval(function () {
    if (!window.socket) return;
    clearInterval(_waitSocket);

    window.socket.on('screen_share_started', function (data) {
      var lbl = document.getElementById('vcSharerName');
      if (lbl) lbl.textContent = 'در حال اشتراک‌گذاری توسط ' + (data.username || '');
      window.currentSharerUserId = data.userId;
    });
    window.socket.on('screen_share_stopped', function () {
      window.currentSharerUserId = null;
    });
  }, 200);

  /* ── Helpers ──────────────────────────────────────────────── */
  window.vcToggleFullscreen = function () {
    var area = document.getElementById('screenShareArea');
    if (!area) return;
    if (!document.fullscreenElement) area.requestFullscreen && area.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  };
  window.vcTogglePin = function () {
    var btn = document.getElementById('vcScreenPinBtn');
    if (btn) btn.classList.toggle('active');
  };

})();
