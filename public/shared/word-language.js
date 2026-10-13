/* word-language.js  (update 48)
 * ONE shared client helper for every letter word game. It adds a "Word language" section to the
 * game's Settings drawer (just above "Strict fit") with the 7 modes:
 *   English / Bahasa Indonesia / Bahasa Melayu (Malaysia) /
 *   English + Indonesian / English + Bahasa Melayu / Bahasa Melayu + Indonesian / all three.
 *
 * Each game page calls, every time it renders a state:
 *     WordLanguage.update(state.game, (mode) => <send "set word language" to this game's server>)
 * The server owns the choice (it is remembered), so the dropdown just mirrors what the server says.
 * It also hides word-length choices longer than the chosen language has words for.
 *
 * update 67: it also gives EVERY game that calls update() the 🌏 Languages button (toolbar, right after 💡) with the same popup
 * SHIFTLE has: three tick switches (English / Bahasa Indonesia / Bahasa Melayu), one or several, "Apply language".
 * Games that already ship their own button (id="languageBtn": SHIFTLE, WORDLE, BETWEENDLE) are left alone.
 */
(function () {
  'use strict';
  if (window.WordLanguage) return;

  var select = null;
  var noteEl = null;
  var sendFn = null;
  var lastOptionsKey = '';
  var lastMax = null;

  var FLAGS = { en: '🇬🇧', id: '🇮🇩', ms: '🇲🇾' };
  function flagsFor(id) {
    return id.split('-').map(function (p) { return p === 'all' ? '🇬🇧🇮🇩🇲🇾' : (FLAGS[p] || ''); }).join('');
  }

  function buildSection() {
    var anchor = document.getElementById('strictFitToggle');
    if (!anchor) return false;
    var host = anchor.closest('.drawerSection') || anchor.closest('.host-card');
    if (!host) return false;
    var lengthSelect = document.getElementById('wordLengthSelect');
    var selectClass = (lengthSelect && lengthSelect.className) || 'selectInput';

    var wrap = document.createElement('div');
    wrap.id = 'wordLanguageSection';
    var isCard = host.classList.contains('host-card');
    wrap.className = isCard ? 'host-card' : 'drawerSection';

    var title = document.createElement(isCard ? 'div' : 'h4');
    if (isCard) title.className = 'host-card-title';
    title.textContent = isCard ? '🌏 Word language' : 'Word language';
    wrap.appendChild(title);

    var row = document.createElement('div');
    row.className = isCard ? 'host-card-row' : 'row';
    select = document.createElement('select');
    select.id = 'wordLanguageSelect';
    select.className = selectClass;
    select.setAttribute('aria-label', 'Word language');
    row.appendChild(select);
    wrap.appendChild(row);

    noteEl = document.createElement('p');
    noteEl.className = isCard ? 'mini-note' : 'sectionNote';
    if (isCard) noteEl.style.cssText = 'margin:6px 2px 0;font-size:12px;opacity:.8;line-height:1.4;';
    noteEl.textContent = 'Pick the language of the secret words AND of the guesses the game accepts. Mixed modes give every language a fair share of the rounds. Your choice is remembered; a round that is running restarts in the new language.';
    wrap.appendChild(noteEl);

    host.parentNode.insertBefore(wrap, host);

    select.addEventListener('change', function () {
      if (sendFn) sendFn(select.value);
    });
    return true;
  }

  function fillOptions(options) {
    var key = options.map(function (o) { return o.id; }).join(',');
    if (key === lastOptionsKey) return;
    lastOptionsKey = key;
    select.innerHTML = '';
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = flagsFor(o.id) + '  ' + o.label;
      select.appendChild(opt);
    });
  }

  // hide word-length choices that the chosen language has no words for
  function limitLengthSelects(max) {
    if (!max || max === lastMax) return;
    lastMax = max;
    ['wordLengthSelect', 'lengthMinSelect', 'lengthMaxSelect'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      Array.prototype.forEach.call(sel.options, function (opt) {
        var tooLong = Number(opt.value) > max;
        opt.hidden = tooLong;
        opt.disabled = tooLong;
      });
      if (Number(sel.value) > max) sel.value = String(max);
    });
  }

  function describe(info) {
    if (!info) return '';
    var bits = [];
    bits.push(info.secretWords.toLocaleString() + ' secret words, up to ' + info.maxLength + ' letters.');
    var usesId = /id|all/.test(info.mode);
    var usesMs = /ms|all/.test(info.mode);
    if (usesId) bits.push('Indonesian guess list: ' + info.idGuessWords.toLocaleString() + ' words (' + info.idSource + ').');
    if (usesMs) bits.push('Malay guess list: ' + info.msGuessWords.toLocaleString() + ' words (' + info.msSource + ').');
    return bits.join(' ');
  }


  // ---------------------------------------------------------------- 🌏 Languages popup (update 67)
  var pop = null; // { btn, overlay, boxes, info, warn }
  var popSend = null;
  var LANG_PARTS = [
    { part: 'en', label: '🇬🇧 English' },
    { part: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { part: 'ms', label: '🇲🇾 Bahasa Melayu (Malaysia)' }
  ];
  function partsOfMode(mode) {
    var m = String(mode || 'en');
    return m === 'all' ? ['en', 'id', 'ms'] : m.split('-');
  }
  function modeFromParts(parts) {
    var has = function (p) { return parts.indexOf(p) !== -1; };
    var n = parts.length;
    if (n === 3) return 'all';
    if (n === 1) return parts[0];
    if (has('en') && has('id')) return 'en-id';
    if (has('en') && has('ms')) return 'en-ms';
    return 'ms-id';
  }
  function pickedParts() {
    return pop.boxes.filter(function (b) { return b.box.checked; }).map(function (b) { return b.part; });
  }
  function injectPopupCss() {
    if (document.getElementById('wlpopCss')) return;
    var st = document.createElement('style');
    st.id = 'wlpopCss';
    st.textContent =
      '.wlpopOverlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,12,4,.55);padding:0}' +
      '.wlpopOverlay[hidden]{display:none}' +
      '.wlpopModal{width:100%;max-width:440px;max-height:90vh;overflow:auto;background:var(--panel,var(--theme-card,#fff));color:var(--text,var(--theme-ink,#222));border:1px solid var(--border,rgba(0,0,0,.2));border-radius:18px 18px 0 0;padding:16px 16px 18px;box-shadow:0 -10px 30px rgba(0,0,0,.35);font-family:inherit}' +
      '@media(min-width:560px){.wlpopOverlay{align-items:center}.wlpopModal{border-radius:18px}}' +
      '.wlpopHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
      '.wlpopHead h3{margin:0;font-size:18px;color:var(--heading,inherit)}' +
      '.wlpopClose{border:1px solid var(--border,rgba(0,0,0,.2));background:transparent;color:inherit;border-radius:10px;width:32px;height:32px;font-size:15px;cursor:pointer}' +
      '.wlpopNote{font-size:12px;opacity:.75;margin:6px 0 10px;line-height:1.4}' +
      '.wlpopRow{position:relative;display:flex;align-items:center;gap:10px;padding:10px 4px;font-size:15px;cursor:pointer;border-bottom:1px solid var(--border,rgba(0,0,0,.12))}' +
      '.wlpopRow input{position:absolute;opacity:0;width:0;height:0}' +
      '.wlpopTrack{position:relative;flex:0 0 auto;width:38px;height:22px;border-radius:999px;background:rgba(60,40,20,.3);transition:background .15s}' +
      '.wlpopTrack i{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}' +
      '.wlpopRow input:checked+.wlpopTrack{background:var(--gold,#ffb100)}' +
      '.wlpopRow input:checked+.wlpopTrack i{transform:translateX(16px);background:#241a05}' +
      '.wlpopRow input:focus-visible+.wlpopTrack{outline:2px solid var(--gold,#ffb100);outline-offset:2px}' +
      '.wlpopWarn{color:#e5484d;font-weight:700}' +
      '.wlpopApply{display:block;width:100%;margin-top:12px;padding:11px;border:none;border-radius:12px;font-weight:800;font-size:14px;background:var(--gold,#ffb100);color:#241a05;cursor:pointer}';
    document.head.appendChild(st);
  }
  function buildPopup() {
    if (pop) return true;
    if (document.getElementById('languageBtn')) return false; // this game ships its own popup (SHIFTLE / WORDLE / BETWEENDLE)
    var hint = document.getElementById('hintBtn');
    if (!hint || !hint.parentNode) return false;
    injectPopupCss();

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'languageBtn';
    btn.title = 'Languages';
    btn.setAttribute('aria-label', 'Choose game languages');
    if (hint.classList.contains('iconBtn')) {
      btn.className = 'iconBtn';
      btn.textContent = '🌏';
    } else {
      btn.className = hint.className; // e.g. CROSSDLE's "btn btn-ghost" hint button
      btn.textContent = '🌏 Languages';
    }
    hint.parentNode.insertBefore(btn, hint.nextSibling);

    var overlay = document.createElement('div');
    overlay.className = 'wlpopOverlay';
    overlay.hidden = true;
    var rows = LANG_PARTS.map(function (l) {
      return '<label class="wlpopRow"><input type="checkbox" data-part="' + l.part + '" /><span class="wlpopTrack"><i></i></span><span>' + l.label + '</span></label>';
    }).join('');
    overlay.innerHTML =
      '<div class="wlpopModal" role="dialog" aria-label="Languages to play">' +
      '<div class="wlpopHead"><h3>Languages to play</h3><button type="button" class="wlpopClose" aria-label="Close">✕</button></div>' +
      '<p class="wlpopNote">Tick one language, or several to mix them. Secret words AND accepted guesses use the languages you pick; mixed rounds give every ticked language a fair share.</p>' +
      rows +
      '<p class="wlpopNote" data-role="info"></p>' +
      '<p class="wlpopNote wlpopWarn" data-role="warn" hidden>Pick at least one language.</p>' +
      '<button type="button" class="wlpopApply">Apply language</button>' +
      '<p class="wlpopNote">A round that is already running restarts in the new language. Your choice is remembered.</p>' +
      '</div>';
    document.body.appendChild(overlay);

    pop = {
      btn: btn,
      overlay: overlay,
      info: overlay.querySelector('[data-role="info"]'),
      warn: overlay.querySelector('[data-role="warn"]'),
      boxes: Array.prototype.map.call(overlay.querySelectorAll('input[data-part]'), function (box) { return { part: box.getAttribute('data-part'), box: box }; })
    };
    var close = function () { overlay.hidden = true; };
    btn.addEventListener('click', function () { syncPopup(lastGame); overlay.hidden = false; });
    overlay.querySelector('.wlpopClose').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    pop.boxes.forEach(function (b) {
      b.box.addEventListener('change', function () { pop.warn.hidden = pickedParts().length > 0; });
    });
    overlay.querySelector('.wlpopApply').addEventListener('click', function () {
      var parts = pickedParts();
      if (!parts.length) { pop.warn.hidden = false; return; }
      if (popSend) popSend(modeFromParts(parts));
      close();
    });
    return true;
  }
  var lastGame = null;
  function syncPopup(game) {
    if (!pop || !game || !game.wordLanguage) return;
    if (pop.overlay.hidden) { // never overwrite ticks while the popup is open
      var parts = partsOfMode(game.wordLanguage);
      pop.boxes.forEach(function (b) { b.box.checked = parts.indexOf(b.part) !== -1; });
      pop.warn.hidden = true;
    }
    var info = game.wordLanguageInfo;
    pop.info.textContent = info ? 'Now playing: ' + info.label + ' — ' + info.secretWords.toLocaleString() + ' secret words, up to ' + info.maxLength + ' letters.' : '';
    pop.btn.title = 'Languages: ' + (info ? info.short : game.wordLanguage);
  }

  window.WordLanguage = {
    update: function (game, send) {
      try {
        if (!game || !game.wordLanguages) return;
        if (typeof send === 'function') { sendFn = send; popSend = send; }
        lastGame = game;
        if (buildPopup()) syncPopup(game);
        if (!select && !buildSection()) return;
        fillOptions(game.wordLanguages);
        if (game.wordLanguage && select.value !== game.wordLanguage) select.value = game.wordLanguage;
        if (game.wordLanguageInfo && noteEl) {
          var extra = describe(game.wordLanguageInfo);
          var base = 'Pick the language of the secret words AND of the guesses the game accepts. Mixed modes give every language a fair share of the rounds. Your choice is remembered; a round that is running restarts in the new language.';
          noteEl.textContent = extra ? base + ' Now: ' + extra : base;
        }
        limitLengthSelects(game.maxWordLength);
      } catch (e) {
        if (window.console) console.warn('[WordLanguage]', e);
      }
    }
  };
})();
