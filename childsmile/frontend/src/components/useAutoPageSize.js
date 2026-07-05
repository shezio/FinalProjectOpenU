import { useState, useEffect, useLayoutEffect } from "react";

/**
 * Adaptive page size: pick how many table rows fit in the viewport so the page
 * never needs vertical scrolling. Works on desktop and mobile.
 *
 * Strategy (stable, no oscillation):
 *  - On mount / resize / dataset change, set a GENEROUS estimate (over-scan) from
 *    the viewport height and a minimum row height.
 *  - After the render, measure the ACTUAL rendered row heights and shrink pageSize
 *    to the exact number of rows that fit above the reserved bottom area. Because we
 *    only ever shrink to the measured fit (never probe-grow), it converges and stays put.
 *
 * @param {React.RefObject<HTMLTableSectionElement>} tbodyRef ref on the <tbody>.
 * @param {Object}  opts
 * @param {number}  opts.min         minimum rows per page (default 2)
 * @param {number}  opts.max         maximum rows per page (default 40)
 * @param {number}  opts.minRow      smallest plausible row height in px (default 40)
 * @param {*}       opts.recomputeKey value that, when changed, re-measures (e.g. filtered list)
 * @returns {number} pageSize
 */
export default function useAutoPageSize(tbodyRef, { min = 2, max = 40, minRow = 40, recomputeKey } = {}) {
  // Space below the table body to keep clear: pagination row + page padding, and on
  // mobile the fixed bottom nav bar too.
  const reservedFor = () => (typeof window !== "undefined" && window.innerWidth <= 767 ? 170 : 120);

  const estimate = () => {
    if (typeof window === "undefined") return min;
    const vh = window.innerHeight || 800;
    const isMobile = window.innerWidth <= 767;
    const top =
      tbodyRef && tbodyRef.current
        ? tbodyRef.current.getBoundingClientRect().top
        : isMobile ? 180 : 320; // fallback before the table has mounted
    const avail = Math.max(0, vh - top - reservedFor());
    return Math.max(min, Math.min(max, Math.floor(avail / minRow) || min));
  };

  const [pageSize, setPageSize] = useState(estimate);

  // Re-estimate (generous) on viewport changes.
  useEffect(() => {
    const onResize = () => setPageSize(estimate());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-estimate (generous) when the visible dataset changes (rows may be shorter/taller).
  useEffect(() => {
    setPageSize(estimate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recomputeKey]);

  // Shrink to the exact number of rows that fit — guarantees no vertical scroll.
  useLayoutEffect(() => {
    const tbody = tbodyRef && tbodyRef.current;
    if (!tbody || tbody.rows.length === 0) return;
    const vh = window.innerHeight || 800;
    const top = tbody.getBoundingClientRect().top;
    const avail = Math.max(0, vh - top - reservedFor());
    let used = 0;
    let fit = 0;
    for (let i = 0; i < tbody.rows.length; i++) {
      used += tbody.rows[i].offsetHeight;
      if (used <= avail) fit++;
      else break;
    }
    if (fit >= 1 && fit < tbody.rows.length) {
      setPageSize((prev) => (fit < prev ? Math.max(min, fit) : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, recomputeKey]);

  return pageSize;
}
