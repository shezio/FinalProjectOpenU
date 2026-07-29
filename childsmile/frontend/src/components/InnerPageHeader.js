import React, { useLayoutEffect, useRef } from "react";
import "../styles/innerpageheader.css";
import logo from "../assets/logo.png";
import amitImg from "../assets/amit.jpg";
import qrCode from "../assets/qr-code.jpg";

// Smallest the title is ever shrunk to (keeps very long distribution names on
// one line while staying readable). Realistic names fit well above this.
const MIN_TITLE_FONT_PX = 16;
// Breathing room kept between the title and each header asset.
const TITLE_SAFE_MARGIN_PX = 20;

// use title prop to set the title of the page
const InnerPageHeader = ({ title }) => {
  const headerRef = useRef(null);
  const titleRef = useRef(null);

  // The title is absolutely centered with `white-space: nowrap` and a fixed
  // font-size, so a LONG title (e.g. a long voucher distribution name) overflows
  // and slides BEHIND the left assets (photo/quote) and the logo. We ONLY step
  // in when that happens: short titles (every other page) are left exactly as
  // the CSS renders them, and on mobile the title is `display:none` so this is a
  // no-op there. For an overflowing title we recentre it into the real clear gap
  // between the two assets and shrink the font so it fits on ONE line.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const titleEl = titleRef.current;
    if (!header || !titleEl) return;

    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      // Reset every inline override so we measure the pristine stylesheet size
      // (respects the responsive media queries) and so titles that fit stay 100%
      // as the CSS defines them — no change to other pages.
      titleEl.style.removeProperty("font-size");
      titleEl.style.removeProperty("white-space");
      titleEl.style.removeProperty("left");
      titleEl.style.removeProperty("transform");
      titleEl.style.whiteSpace = "nowrap";

      // Mobile hides the title (display:none) → scrollWidth 0 → nothing to do.
      const naturalWidth = titleEl.scrollWidth;
      if (!naturalWidth) return;

      const leftAsset = header.querySelector(".top-left");
      const rightAsset = header.querySelector(".logo");
      if (!leftAsset || !rightAsset) return;
      const leftRect = leftAsset.getBoundingClientRect();
      const rightRect = rightAsset.getBoundingClientRect();
      // If the assets aren't laid out as the usual side row (0-width, e.g. an
      // unexpected/flattened layout), don't guess — leave the title alone.
      if (leftRect.width === 0 || rightRect.width === 0) return;

      const headerRect = header.getBoundingClientRect();
      const centerX = headerRect.left + headerRect.width / 2;
      const leftEdge = leftRect.right;
      const rightEdge = rightRect.left;

      // Does the DEFAULT (viewport-centred) title already clear both assets? If
      // so leave it completely untouched — this is the path every short title on
      // every other page takes.
      const symHalf = Math.min(centerX - leftEdge, rightEdge - centerX) - TITLE_SAFE_MARGIN_PX;
      if (naturalWidth <= symHalf * 2) return;

      // Where the title sits by default (CSS `left:50%` of its containing block).
      // Measured in the viewport so the recentre below is immune to containing
      // block / padding / browser-zoom quirks.
      const defaultRect = titleEl.getBoundingClientRect();
      const defaultCenterX = defaultRect.left + defaultRect.width / 2;

      // Overflowing title: use the FULL clear gap between the assets (wider than
      // the symmetric span) and recentre the title inside it.
      const gapLeft = leftEdge + TITLE_SAFE_MARGIN_PX;
      const gapRight = rightEdge - TITLE_SAFE_MARGIN_PX;
      const availWidth = gapRight - gapLeft;
      if (availWidth <= 0) return;

      if (naturalWidth > availWidth) {
        const basePx = parseFloat(window.getComputedStyle(titleEl).fontSize) || 64;
        // Proportional first guess, then correct DOWN a few px — letter-spacing
        // is fixed (doesn't scale with font-size) so the guess runs a touch wide.
        // `important` beats the media-query `.title { font-size: … !important }`.
        let size = Math.max(MIN_TITLE_FONT_PX, Math.min(basePx, Math.floor((basePx * availWidth) / naturalWidth)));
        titleEl.style.setProperty("font-size", `${size}px`, "important");
        let guard = 60;
        while (titleEl.scrollWidth > availWidth && size > MIN_TITLE_FONT_PX && guard-- > 0) {
          size -= 1;
          titleEl.style.setProperty("font-size", `${size}px`, "important");
        }
      }

      // Nudge the (still centred) title to the real gap midpoint via a transform
      // delta only — CSS `left:50%` stays intact, and shrinking doesn't move the
      // centre, so this stays correct at any zoom level.
      const gapCenterX = (gapLeft + gapRight) / 2;
      const shiftPx = Math.round(gapCenterX - defaultCenterX);
      titleEl.style.transform = `translateX(calc(-50% + ${shiftPx}px))`;
    };

    fit();
    window.addEventListener("resize", fit);
    // Re-fit once the custom (Rubik) font finishes loading — the fallback font
    // has different metrics, so the first measure can be off until it swaps in.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }
    return () => {
      cancelled = true;
      window.removeEventListener("resize", fit);
    };
  }, [title]);

  return (
    <>
      {/* פס ירוק עליון */}
      <div className="header" ref={headerRef}>
        {/* צד שמאל – תמונת עמית, הציטוט, וה-QR Code */}
        <div className="top-left">
          <img src={amitImg} alt="Amit" className="amit-img" />
          <div className="quote">
            הרבה אנשים אומרים שהם רוצים להצליח אבל לא כולם מוכנים לשלם את המחיר
            <br />
            שצריך כדי להצליח
          </div>
          <a
            className="qr-code-link"
            href="https://www.instagram.com/remember.amit.bunzel?igsh=YjFxNDBtaWNxMDdt"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="עמוד ההנצחה של עמית בונצל באינסטגרם"
          >
            <img src={qrCode} alt="QR Code" className="qr-code" />
          </a>
        </div>

        {/* צד ימין – הלוגו והכותרת יחד */}
        <div className="right-header">
          <img src={logo} alt="חיוך של ילד" className="logo" />
          <h1 className="title" ref={titleRef}>{title}</h1>
        </div>
      </div>
    </>
  );
};

export default InnerPageHeader;