/* ═══════════════════════════════════════════════════════════════
   GapHub — Voice UI Patch  (voice_ui_patch.js)
   این فایل رو بعد از app.js لود کن.
   renderVcUsers، updateVcMuteBtn و چند تابع دیگه رو override می‌کنه.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── renderVcUsers ─────────────────────────────────────────── */
  window.renderVcUsers = function (users) {
    const container = document.getElementById('vcParticipants');
    const empty     = document.getElementById('vcEmpty');
    const countEl   = document.getElementById('vcMemberCount');
    if (!container) return;

    // Update member count badge
    if (countEl) countEl.textContent = users.length + ' نفر';

    if (!users.length) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    container.innerHTML = users.map(function (u) {
      var isMe   = u.id === (window.me && window.me.id);
      var lm     = !!(window.localMutes && window.localMutes[u.id]);
      var vol    = (window.localVolumes && window.localVolumes[u.id] != null)
                    ? window.localVolumes[u.id] : 1;
      var speaking = u.speaking && !lm;
      var muted    = u.muted || lm;

      // Avatar content
      var avatarInner;
      if (u.avatarUrl) {
        avatarInner = '<img src="' + u.avatarUrl + '" alt="' + u.username + '">';
      } else if (u.avatar) {
        avatarInner = u.avatar;
      } else {
        avatarInner = (u.username || '?')[0].toUpperCase();
      }

      // Share badge (shown when this user is sharing screen)
      var shareBadge = (window.currentSharerUserId === u.id)
        ? '<span class="vc-share-badge">در حال اشتراک</span>'
        : '';

      // Waveform when speaking
      var waveform = speaking
        ? '<div class="vc-wave"><span></span><span></span><span></span><span></span><span></span></div>'
        : '';

      // Vol row (other users) or "شما" tag (self)
      var bottom = isMe
        ? '<div class="vc-me-tag">شما</div>'
        : '<div class="vc-vol-row">' +
            '<button id="lm-' + u.id + '" class="lmute-btn' + (lm ? ' muted' : '') + '" ' +
              'onclick="toggleLocalMute(\'' + u.id + '\')">' +
              (lm ? '🔇' : '🔊') +
            '</button>' +
            '<input type="range" class="vol-slider" min="0" max="100" ' +
              'value="' + Math.round(vol * 100) + '" ' +
              'oninput="setLocalVolume(\'' + u.id + '\',this.value/100)">' +
            '<span id="vl-' + u.id + '" class="vol-lbl">' + Math.round(vol * 100) + '%</span>' +
          '</div>';

      return (
        '<div class="vc-card' + (speaking ? ' speaking' : '') + '">' +
          shareBadge +
          '<div class="vc-avatar' +
            (speaking ? ' speaking' : '') +
            (muted    ? ' muted'    : '') + '" ' +
            'data-uid="' + u.id + '" ' +
            'style="background:linear-gradient(135deg,' + u.color + ',' + u.color + 'bb);' +
            (lm ? 'filter:grayscale(.8);opacity:.5' : '') + '">' +
            avatarInner +
          '</div>' +
          '<div class="vc-name">' + u.username + (muted ? ' 🔇' : '') + '</div>' +
          waveform +
          bottom +
        '</div>'
      );
    }).join('');
  };

  /* ── Mute button visual sync ──────────────────────────────── */
  // Called whenever isMuted changes (extends toggleVcMic)
  var _origToggleVcMic = window.toggleVcMic;
  window.toggleVcMic = function () {
    if (_origToggleVcMic) _origToggleVcMic();
    _syncMuteBtn();
  };

  function _syncMuteBtn() {
    var btn  = document.getElementById('vcMuteBtn');
    var mic  = document.querySelector('#vcMuteBtn .vc-icon-mic');
    var micOff = document.querySelector('#vcMuteBtn .vc-icon-micoff');
    if (!btn) return;
    var muted = !!window.isMuted;
    btn.classList.toggle('muted', muted);
    if (mic)    mic.classList.toggle('hidden',  muted);
    if (micOff) micOff.classList.toggle('hidden', !muted);
  }

  /* ── Deafen button visual sync ────────────────────────────── */
  var _origToggleDeafen = window.toggleDeafen;
  window.toggleDeafen = function () {
    if (_origToggleDeafen) _origToggleDeafen();
    var btn = document.getElementById('deafenBtn');
    if (btn) btn.classList.toggle('muted', !!window.isDeafened);
  };

  /* ── Screen share button sync ─────────────────────────────── */
  // Patch startScreenShare / stopScreenShare button label
  var _origStart = window.startScreenShare;
  window.startScreenShare = function () {
    if (_origStart) _origStart();
    _syncShareBtn(true);
  };
  var _origStop = window.stopScreenShare;
  window.stopScreenShare = function () {
    if (_origStop) _origStop();
    _syncShareBtn(false);
  };

  function _syncShareBtn(active) {
    var btn   = document.getElementById('screenShareBtn');
    var label = btn && btn.querySelector('.vc-btn-label');
    if (!btn) return;
    btn.classList.toggle('sharing', active);
    if (label) label.textContent = active ? 'توقف اشتراک' : 'اشتراک‌گذاری';
  }

  /* ── Screen sharer name ───────────────────────────────────── */
  // Hook into socket screen_share_started to update the label
  document.addEventListener('DOMContentLoaded', function () {
    // Patch after socket is ready (app.js sets window.socket)
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
  });

  /* ── Fullscreen & pin helpers ────────────────────────────── */
  window.vcToggleFullscreen = function () {
    var area = document.getElementById('screenShareArea');
    if (!area) return;
    if (!document.fullscreenElement) {
      area.requestFullscreen && area.requestFullscreen();
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  };

  window.vcTogglePin = function () {
    var btn = document.getElementById('vcScreenPinBtn');
    if (btn) btn.classList.toggle('active');
  };

})();
