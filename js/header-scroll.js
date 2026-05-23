/* ============================================================
 * Sinov AI — header scroll-state toggle
 *
 * Adds a small UX flourish: when the page is scrolled away from
 * the top, the sticky .sn-header picks up a more opaque background
 * and a soft elevation shadow. At the very top, it stays in the
 * subtle frosted-glass state. The visual difference is intentional
 * but quiet — it signals "you're scrolling" without being noisy.
 *
 * Scope:
 *   Loaded by admin.html, index.html, login.html (all pages that
 *   render the global .sn-header). Exam.html uses its own chrome
 *   and is intentionally untouched.
 *
 * Why a scroll listener and not IntersectionObserver:
 *   IO with a 1px sentinel works too, but for a single global
 *   navbar a passive scroll listener throttled with rAF is just
 *   as performant and noticeably easier to debug. Chrome fires
 *   `scroll` at ~60 Hz on a passive listener; rAF coalesces to
 *   one paint frame, so we end up doing at most one classList
 *   toggle per frame.
 *
 * Threshold (8px):
 *   Anything > 0 would technically be "scrolled", but a few px
 *   of accidental jitter from touchpads / momentum scrolling can
 *   flip the state visibly on idle. 8px gives a tiny dead zone
 *   that feels intentional without making the user scroll far.
 *
 * Accessibility:
 *   Users with `prefers-reduced-motion: reduce` get an instant
 *   swap with no fade — handled by a media query in styles.css,
 *   not here. (Same pattern as the existing Round 3 overrides.)
 * ============================================================ */
(function initHeaderScrollState() {
  "use strict";

  const SCROLL_THRESHOLD_PX = 8;
  const SCROLLED_CLASS = "is-scrolled";

  // Gracefully bail if there's no global header on this page.
  // (e.g. if this script is ever included on a future page that
  // doesn't render .sn-header — silent no-op, no console noise.)
  const header = document.querySelector(".sn-header");
  if (!header) return;

  let scheduled = false;

  function applyScrollState() {
    scheduled = false;
    const scrolled = window.scrollY > SCROLL_THRESHOLD_PX;
    // toggle() with a force argument is a no-op when the class
    // is already in the requested state, so this is cheap to call
    // every frame.
    header.classList.toggle(SCROLLED_CLASS, scrolled);
  }

  function onScroll() {
    // rAF throttle: queue at most one update per paint frame.
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(applyScrollState);
  }

  // passive: true tells the browser we won't preventDefault() —
  // lets it keep scroll responsive on touch devices.
  window.addEventListener("scroll", onScroll, { passive: true });

  // Apply initial state at load time. Covers the case where the
  // page loads already mid-scroll (e.g. browser restoring scroll
  // position after a refresh).
  applyScrollState();
})();
