/*
 * Ambient hints:
 * - "Loading the cosmos…" while nothing has appeared yet (slow fade in/out)
 * - one-time first-run hint teaching the two interactions
 * Both styled in the same quiet spirit as the item cards.
 */
(function () {
  'use strict';

  window.WSW = window.WSW || {};

  var ONBOARD_KEY = 'wsw-onboarded-v1';
  var FORCE = /[?&]onboard=1/.test(window.location.search);
  var HINT_VISIBLE_MS = 9000;

  var loadingEl = null;
  var hintEl = null;

  function firstObjectVisible() {
    return !!document.querySelector('img.ws-obj.loaded');
  }

  function startLoading() {
    loadingEl = document.createElement('div');
    loadingEl.id = 'loading';
    loadingEl.textContent = 'Loading the cosmos…';
    document.body.appendChild(loadingEl);
    // Slow fade in, but only if loading is actually taking a moment.
    setTimeout(function () {
      if (!firstObjectVisible() && loadingEl) loadingEl.classList.add('visible');
    }, 700);

    var poll = setInterval(function () {
      if (!firstObjectVisible()) return;
      clearInterval(poll);
      if (loadingEl) {
        loadingEl.classList.remove('visible'); // slow fade out
        setTimeout(function () { loadingEl.remove(); loadingEl = null; }, 3000);
      }
      scheduleOnboarding();
    }, 250);
  }

  function scheduleOnboarding() {
    var seen = false;
    try { seen = !!localStorage.getItem(ONBOARD_KEY); } catch (e) { /* no storage */ }
    if (seen && !FORCE) return;
    setTimeout(showHint, 2500); // let the cosmos settle first
  }

  function showHint() {
    try { localStorage.setItem(ONBOARD_KEY, String(Date.now())); } catch (e) { /* best effort */ }
    hintEl = document.createElement('div');
    hintEl.id = 'onboard';
    hintEl.innerHTML =
      '<span class="onboard-part">Left-click an item to know everything about it</span>' +
      '<span class="onboard-sep">·</span>' +
      '<span class="onboard-part">Hold and drag to steer the cosmos</span>';
    document.body.appendChild(hintEl);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hintEl.classList.add('visible'); });
    });
    setTimeout(function () {
      if (!hintEl) return;
      hintEl.classList.remove('visible');
      setTimeout(function () { hintEl.remove(); hintEl = null; }, 3000);
    }, HINT_VISIBLE_MS);
  }

  WSW.hints = { start: startLoading };
})();
