import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../axiosConfig';
import '../styles/notificationBell.css';

const TYPE_ICONS = {
  birthday_today:     '🎂',
  birthday_this_week: '🎂',
  birthday_next_week: '🎂',
  custom_auto:        '⚡',
  manual:             '📢',
};

const NotificationBell = () => {
  const [messages,   setMessages]   = useState([]);
  const [open,       setOpen]       = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const hideTimer   = useRef(null);
  const panelRef    = useRef(null);
  const trackRef    = useRef(null);
  const offsetRef   = useRef(0);        // scroll offset in px
  const animFrameRef = useRef(null);
  const lastTsRef   = useRef(null);
  const speedRef    = useRef(1);        // current speed multiplier
  const lastWheelRef = useRef(0);       // timestamp of last wheel event

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications/');
      setMessages(res.data.results || []);
      setLoaded(true);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, Number(process.env.REACT_APP_BELL_POLL_MS) || 300000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const activeMessages = messages.filter(m => m.is_active);

  // ── JS-driven scroll ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open || activeMessages.length === 0) return;

    const BASE_SPEED = 30;   // px/s at normal (speed=1)
    const IDLE_DECAY_MS = 2000;

    const tick = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      offsetRef.current += BASE_SPEED * speedRef.current * dt;

      const track = trackRef.current;
      if (track) {
        const half = track.scrollHeight / 2;
        // wrap around in both directions
        if (offsetRef.current >= half) offsetRef.current -= half;
        if (offsetRef.current < 0)     offsetRef.current += half;
        track.style.transform = `translateY(-${offsetRef.current}px)`;
      }

      // After 2 s of idle wheel, decay speed back to 1
      const idleSince = ts - lastWheelRef.current;
      if (idleSince > IDLE_DECAY_MS) {
        if (speedRef.current < 1) {
          speedRef.current = Math.min(1, speedRef.current + dt * 1.5); // ramp back up from reverse
        } else if (speedRef.current > 1) {
          speedRef.current = Math.max(1, speedRef.current - dt * 2);   // slow back down from fast
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      lastTsRef.current = null;
    };
  }, [open, activeMessages.length]);

  // Wheel: scroll DOWN = faster forward, scroll UP = slow / reverse
  // Speed range: -6 (fast backward) … 1 (normal) … 10 (fast forward)
  const handleWheel = (e) => {
    e.preventDefault();
    lastWheelRef.current = performance.now();
    const delta = e.deltaY * 0.04;                           // scale wheel delta
    speedRef.current = Math.max(-6, Math.min(10, speedRef.current + delta));
  };

  const openPanel = () => { clearTimeout(hideTimer.current); setOpen(true); };
  const scheduleClose = () => { hideTimer.current = setTimeout(() => setOpen(false), 3000); };
  const closeNow = () => { clearTimeout(hideTimer.current); setOpen(false); };

  // Double the list for seamless infinite scroll
  const scrollItems = activeMessages.length > 0
    ? [...activeMessages, ...activeMessages]
    : [];

  return (
    <div className="notif-bell-wrap" onMouseEnter={openPanel} onMouseLeave={scheduleClose}>
      {/* ── Bell button ── */}
      <button className="notif-bell-btn" onClick={() => open ? closeNow() : openPanel()} title="מרכז העדכונים">
        🔔
        {loaded && activeMessages.length > 0 && (
          <span className="notif-bell-count">{activeMessages.length}</span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          className="notif-bell-panel"
          ref={panelRef}
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={scheduleClose}
          onWheel={handleWheel}
        >
          <div className="notif-bell-panel-header">
            <span className="notif-bell-panel-title">🔔 עדכונים</span>
            <button className="notif-bell-close" onClick={closeNow}>✕</button>
          </div>

          {activeMessages.length === 0 ? (
            <div className="notif-bell-empty">אין עדכונים כרגע</div>
          ) : (
            <div className="notif-bell-scroll-wrap">
              <div className="notif-bell-scroll-track" ref={trackRef}>
                {scrollItems.map((msg, idx) => (
                  <div key={`${msg.id}-${idx}`} className="notif-bell-item">
                    <span className="notif-bell-item-icon">{TYPE_ICONS[msg.message_type] || '📢'}</span>
                    <div className="notif-bell-item-body">
                      <div className="notif-bell-item-title">{msg.title}</div>
                      <div className="notif-bell-item-text">{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
