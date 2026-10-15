/* Popover clip guard. Menus/popovers are absolutely positioned under their trigger; inside a
   scrolling rail, table, card or dialog body they were CUT OFF by the overflow ancestor (Manual
   data entry folder menu). When a popover opens and any part of it falls outside a clipping
   ancestor or the viewport, it is lifted to position:fixed at the trigger, flipped above when
   there is no room below, and clamped into the viewport. Popovers that fit are left untouched. */
(function () {
  var SEL = ".ff-cv-pop,.dtab-menu,.njdt-pop,.an-pop,.an-setmenu,.ratn-col-pop,.ratn-bm-pop,.exp-pop,.ctx-menu,.oc-menu,[data-pop-guard]";
  var live = new Set();
  function clipRect(el) {
    var r = { t: 0, l: 0, b: window.innerHeight, r: window.innerWidth };
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        var pr = p.getBoundingClientRect();
        r = { t: Math.max(r.t, pr.top), l: Math.max(r.l, pr.left), b: Math.min(r.b, pr.bottom), r: Math.min(r.r, pr.right) };
      }
    }
    return r;
  }
  function place(el) {
    var a = el.__pgAnchor; if (!a || !a.isConnected || !el.isConnected) { live.delete(el); return; }
    var ar = a.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vh = window.innerHeight, vw = window.innerWidth;
    var below = vh - ar.bottom - 8, above = ar.top - 8;
    var top = (h + 6 <= below || below >= above) ? ar.bottom + 6 : ar.top - 6 - h;
    top = Math.max(8, Math.min(top, vh - h - 8));
    var left = el.__pgRight ? ar.right - w : ar.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    el.style.top = top + "px"; el.style.left = left + "px";
    var got = el.getBoundingClientRect(); // a transformed ancestor re-bases position:fixed
    if (Math.abs(got.top - top) > 0.5 || Math.abs(got.left - left) > 0.5) {
      el.style.top = (2 * top - got.top) + "px"; el.style.left = (2 * left - got.left) + "px";
    }
  }
  function check(el) {
    if (!el.isConnected || el.__pgAnchor) return;
    var r = el.getBoundingClientRect(), c = clipRect(el);
    if (r.top >= c.t - 1 && r.left >= c.l - 1 && r.bottom <= c.b + 1 && r.right <= c.r + 1) return;
    var anchor = el.offsetParent || el.parentElement; if (!anchor) return;
    var ar = anchor.getBoundingClientRect();
    el.__pgAnchor = anchor;
    el.__pgRight = Math.abs(r.right - ar.right) < Math.abs(r.left - ar.left);
    el.style.width = el.offsetWidth + "px";
    el.style.position = "fixed"; el.style.right = "auto"; el.style.bottom = "auto"; el.style.margin = "0";
    el.style.zIndex = "3200";
    live.add(el); place(el);
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches(SEL)) requestAnimationFrame(function () { check(node); });
    node.querySelectorAll && node.querySelectorAll(SEL).forEach(function (n) { requestAnimationFrame(function () { check(n); }); });
  }
  function start() {
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(scan); }); }).observe(document.body, { childList: true, subtree: true });
    var re = function () { live.forEach(place); };
    window.addEventListener("scroll", re, true); window.addEventListener("resize", re);
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
