/*
 * Settings bridge.
 * Reads Wallpaper Engine user properties when running inside Wallpaper Engine,
 * URL query params when running in a normal browser (dev harness).
 */
(function () {
  'use strict';

  window.WSW = window.WSW || {};

  var settings = {
    backgroundColor: 'rgb(15, 18, 26)',
    motionEnabled: true,
    speed: 8,             // px/sec at layer factor 1
    directionDeg: 90,     // 0=up, 90=right, 180=down, 270=left (content motion)
    wanderEnabled: true,
    density: 1.0,
    objectScale: 1.0,
    parallaxEnabled: true,
    panEnabled: true,
    stirEnabled: false,
    stirStrength: 1.0,
    searchQuery: '',
    interactionEnabled: true,
    cardsEnabled: true,
    hoverCardsEnabled: false,  // dwell-to-card; click is the default path
    showBlocksUi: false,
    lowPowerEnabled: false,
    debugOverlay: false,
    fpsLimit: 0           // 0 = uncapped, set by Wallpaper Engine
  };

  var listeners = [];

  function notify(keys) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](keys); } catch (e) { /* keep other listeners alive */ }
    }
  }

  WSW.settings = settings;
  WSW.onSettingsChanged = function (cb) { listeners.push(cb); };

  /* NaN-safe number parsing: garbage input keeps the current value. */
  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function colorPropToCss(value) {
    var parts = String(value).split(' ').map(function (c) {
      return Math.max(0, Math.min(255, Math.round(parseFloat(c) * 255)));
    });
    return 'rgb(' + parts.join(', ') + ')';
  }

  /* ---- Wallpaper Engine bridge ---- */

  // The shipped default background; while the user hasn't customized it,
  // the WE scheme color (darkened) tints the cosmos to match their theme.
  var DEFAULT_BG = 'rgb(15, 18, 26)';
  var userBg = DEFAULT_BG;
  var schemeBg = null;

  function schemeToDarkCss(value) {
    var parts = String(value).split(' ').map(function (c) {
      return Math.max(0, Math.min(255, Math.round(parseFloat(c) * 255 * 0.24)));
    });
    return 'rgb(' + parts.join(', ') + ')';
  }

  function effectiveBg() {
    return (userBg === DEFAULT_BG && schemeBg) ? schemeBg : userBg;
  }

  window.wallpaperPropertyListener = {
    applyUserProperties: function (props) {
      var changed = [];
      function set(key, value) { settings[key] = value; changed.push(key); }

      if (props.schemecolor) {
        schemeBg = schemeToDarkCss(props.schemecolor.value);
        set('backgroundColor', effectiveBg());
      }
      if (props.bgcolor) {
        userBg = colorPropToCss(props.bgcolor.value);
        set('backgroundColor', effectiveBg());
      }
      if (props.motionenabled) set('motionEnabled', !!props.motionenabled.value);
      if (props.speed) set('speed', num(props.speed.value, settings.speed));
      if (props.direction) set('directionDeg', num(props.direction.value, settings.directionDeg));
      if (props.wander) set('wanderEnabled', !!props.wander.value);
      if (props.density) set('density', num(props.density.value, settings.density));
      if (props.objectscale) set('objectScale', num(props.objectscale.value, settings.objectScale));
      if (props.parallax) set('parallaxEnabled', !!props.parallax.value);
      if (props.pan) set('panEnabled', !!props.pan.value);
      if (props.stir) set('stirEnabled', !!props.stir.value);
      if (props.stirstrength) set('stirStrength', num(props.stirstrength.value, settings.stirStrength));
      if (props.searchquery) set('searchQuery', String(props.searchquery.value || '').trim());
      if (props.interaction) set('interactionEnabled', !!props.interaction.value);
      if (props.cards) set('cardsEnabled', !!props.cards.value);
      if (props.hovercards) set('hoverCardsEnabled', !!props.hovercards.value);
      if (props.showblocks) set('showBlocksUi', !!props.showblocks.value);
      if (props.lowpower) set('lowPowerEnabled', !!props.lowpower.value);
      if (props.debugoverlay) set('debugOverlay', !!props.debugoverlay.value);

      if (changed.length) notify(changed);
    },
    applyGeneralProperties: function (props) {
      if (props.fps !== undefined) {
        settings.fpsLimit = parseFloat(props.fps) || 0;
        notify(['fpsLimit']);
      }
    }
  };

  /* ---- Browser dev overrides via URL params ---- */
  (function applyUrlOverrides() {
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
    var map = {
      speed: function (v) { settings.speed = num(v, settings.speed); },
      direction: function (v) { settings.directionDeg = num(v, settings.directionDeg); },
      density: function (v) { settings.density = num(v, settings.density); },
      scale: function (v) { settings.objectScale = num(v, settings.objectScale); },
      parallax: function (v) { settings.parallaxEnabled = v !== '0'; },
      wander: function (v) { settings.wanderEnabled = v !== '0'; },
      pan: function (v) { settings.panEnabled = v !== '0'; },
      stir: function (v) { settings.stirEnabled = v !== '0'; },
      stirstrength: function (v) { settings.stirStrength = num(v, settings.stirStrength); },
      motion: function (v) { settings.motionEnabled = v !== '0'; },
      q: function (v) { settings.searchQuery = v; },
      interaction: function (v) { settings.interactionEnabled = v !== '0'; },
      cards: function (v) { settings.cardsEnabled = v !== '0'; },
      hovercards: function (v) { settings.hoverCardsEnabled = v !== '0'; },
      blocksui: function (v) { settings.showBlocksUi = v !== '0'; },
      lowpower: function (v) { settings.lowPowerEnabled = v !== '0'; },
      debug: function (v) { settings.debugOverlay = v !== '0'; },
      fps: function (v) { settings.fpsLimit = parseFloat(v) || 0; }
    };
    q.forEach(function (value, key) {
      if (map[key]) map[key](value);
    });
  })();

  /* 'd' toggles the debug overlay when testing in a browser */
  window.addEventListener('keydown', function (e) {
    if (e.key === 'd' || e.key === 'D') {
      settings.debugOverlay = !settings.debugOverlay;
      notify(['debugOverlay']);
    }
  });
})();
