/*
 * Mask decoding + hit testing.
 * API masks are { w, h, b } where b is base64 of a row-major, MSB-first,
 * continuously packed 1-bit-per-cell bitmap (verified against image alpha).
 * Used so hover follows the visible cutout shape, not its bounding box.
 */
(function () {
  'use strict';

  window.WSW = window.WSW || {};

  function decode(mask) {
    if (!mask || !mask.b || !mask.w || !mask.h) return null;
    try {
      var bin = atob(mask.b);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (bytes.length * 8 < mask.w * mask.h) return null; // malformed
      return { w: mask.w, h: mask.h, bytes: bytes };
    } catch (e) {
      return null;
    }
  }

  function bit(m, x, y) {
    var idx = y * m.w + x;
    return (m.bytes[idx >> 3] >> (7 - (idx & 7))) & 1;
  }

  /*
   * u, v in [0,1] across the object rect. Masks are coarse (max ~40 cells),
   * so also accept a hit in any direct neighbor cell to keep hover stable
   * near shape edges.
   */
  function hit(decoded, u, v) {
    if (!decoded) return true; // no mask: treat whole rect as solid
    var x = Math.min(decoded.w - 1, Math.max(0, Math.floor(u * decoded.w)));
    var y = Math.min(decoded.h - 1, Math.max(0, Math.floor(v * decoded.h)));
    if (bit(decoded, x, y)) return true;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= decoded.w || ny >= decoded.h) continue;
        if (bit(decoded, nx, ny)) return true;
      }
    }
    return false;
  }

  WSW.mask = { decode: decode, hit: hit, _bit: bit };
})();
