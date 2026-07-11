/*
 * Block list: hide specific items (by cutoutId) or whole categories
 * (title-keyword terms). Persisted in localStorage; managed/reverted via an
 * in-wallpaper overlay because Wallpaper Engine's settings bridge is
 * read-only and quick-adds cannot be written into the WE panel.
 */
(function () {
  'use strict';

  window.WSW = window.WSW || {};

  var STORE_KEY = 'wsw-blocks-v1';

  var blocks = { items: [], terms: [] }; // items: {id, title}; terms: {term}
  var itemIds = {};
  var panel = null;

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.items) && Array.isArray(data.terms)) blocks = data;
      }
    } catch (e) { /* corrupted store: start clean */ }
    reindex();
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(blocks)); } catch (e) { /* full */ }
  }

  function reindex() {
    itemIds = {};
    blocks.items.forEach(function (it) { itemIds[it.id] = true; });
  }

  function isBlocked(obj) {
    if (!obj) return false;
    if (obj.cutoutId !== undefined && itemIds[obj.cutoutId]) return true;
    var title = (obj.title || '').toLowerCase();
    for (var i = 0; i < blocks.terms.length; i++) {
      if (title.indexOf(blocks.terms[i].term) !== -1) return true;
    }
    return false;
  }

  /* "Wolf spider" -> "spider"; "Punch (drink)" -> "punch" */
  function categoryTerm(title) {
    var t = String(title || '').replace(/\(.*?\)/g, ' ').trim();
    var words = t.split(/[\s\-–—_/,]+/).filter(Boolean);
    if (!words.length) return null;
    var w = words[words.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    return w.length >= 3 ? w : null;
  }

  function changed() {
    reindex();
    save();
    if (WSW.world && WSW.world.purgeBlocked) WSW.world.purgeBlocked();
    render();
  }

  /* ---- manager overlay ---- */

  function build() {
    panel = document.createElement('div');
    panel.id = 'blocks';
    panel.hidden = true;
    document.body.appendChild(panel);
    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-kind]');
      if (!btn) return;
      e.stopPropagation();
      if (btn.dataset.kind === 'term') {
        blocks.terms = blocks.terms.filter(function (t) { return t.term !== btn.dataset.value; });
      } else {
        blocks.items = blocks.items.filter(function (it) { return String(it.id) !== btn.dataset.value; });
      }
      changed();
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render() {
    if (!panel || panel.hidden) return;
    var html = '<div class="blocks-title">Blocked</div>';
    if (!blocks.terms.length && !blocks.items.length) {
      html += '<div class="blocks-empty">Nothing blocked. Use the ✕ on an item card.</div>';
    }
    if (blocks.terms.length) {
      html += '<div class="blocks-section">Categories</div>';
      blocks.terms.forEach(function (t) {
        html += '<div class="blocks-row"><span>“' + esc(t.term) + '”</span>' +
          '<button type="button" data-kind="term" data-value="' + esc(t.term) + '" title="Unblock">✕</button></div>';
      });
    }
    if (blocks.items.length) {
      html += '<div class="blocks-section">Items</div>';
      blocks.items.forEach(function (it) {
        html += '<div class="blocks-row"><span>' + esc(it.title || ('#' + it.id)) + '</span>' +
          '<button type="button" data-kind="item" data-value="' + esc(it.id) + '" title="Unblock">✕</button></div>';
      });
    }
    panel.innerHTML = html;
  }

  function applyVisibility() {
    if (!panel) return;
    panel.hidden = !WSW.settings.showBlocksUi;
    render();
  }

  WSW.blocks = {
    start: function () {
      load();
      build();
      applyVisibility();
      WSW.onSettingsChanged(function (keys) {
        if (keys.indexOf('showBlocksUi') !== -1) applyVisibility();
      });
    },
    isBlocked: isBlocked,
    categoryTerm: categoryTerm,
    blockItem: function (obj) {
      if (!obj || obj.cutoutId === undefined || itemIds[obj.cutoutId]) return;
      blocks.items.push({ id: obj.cutoutId, title: obj.title || '' });
      changed();
    },
    blockTerm: function (term) {
      term = String(term || '').toLowerCase().trim();
      if (!term || blocks.terms.some(function (t) { return t.term === term; })) return;
      blocks.terms.push({ term: term });
      changed();
    },
    counts: function () {
      return { items: blocks.items.length, terms: blocks.terms.length };
    }
  };
})();
