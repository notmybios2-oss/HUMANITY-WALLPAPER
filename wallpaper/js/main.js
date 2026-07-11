/* Boot sequence: settings are already loaded; start feed, world, debug. */
(function () {
  'use strict';

  function boot() {
    WSW.blocks.start();
    WSW.feed.start();
    WSW.cards.start();
    WSW.world.start();
    WSW.hints.start();
    WSW.debug.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
