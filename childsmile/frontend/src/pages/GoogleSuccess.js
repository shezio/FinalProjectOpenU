import React, { useEffect, useState, useRef } from 'react';
import axios from '../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const isProd = process.env.NODE_ENV === 'production';

// Drop your animated anime loop here (SeaArt / Kling / Veo image-to-video export).
// MP4 (H.264) is preferred; WebM optional. The still image is the instant poster
// + fallback, so the screen looks right even before the video exists.
const VIDEO_SOURCES = [
  { src: '/assets/login/hero.mp4', type: 'video/mp4' },
];
const POSTER = '/assets/login/hero.jpg';

const GoogleSuccess = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('מכינים חיוך...');
  const [videoOk, setVideoOk] = useState(false);
  const [active, setActive] = useState('A');
  const vidA = useRef(null);
  const vidB = useRef(null);
  const firedRef = useRef({ A: false, B: false });
  const CROSSFADE = 0.6;

  // Two stacked players crossfade into each other at the loop point, so the end
  // dissolves into the start via opacity (no cut, no fade-through-black).
  const handleLoopFade = (key) => (e) => {
    const v = e.currentTarget;
    const d = v.duration || 0;
    if (!d) return;
    if (v.currentTime < 0.12) firedRef.current[key] = false; // reset once it (re)starts
    if (key === active && !firedRef.current[key] && d - v.currentTime <= CROSSFADE) {
      firedRef.current[key] = true;
      const other = key === 'A' ? vidB.current : vidA.current;
      if (other) {
        try { other.currentTime = 0; } catch (_) { /* noop */ }
        const p = other.play();
        if (p && p.catch) p.catch(() => {});
      }
      setActive(key === 'A' ? 'B' : 'A');
    }
  };
  const handleEndedReset = (e) => {
    const v = e.currentTarget;
    try { v.pause(); v.currentTime = 0; } catch (_) { /* noop */ }
  };

  useEffect(() => {
    const setupGoogleSession = async () => {
      try {
        // Animate progress while loading
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + Math.random() * 8, 90));
        }, 5000);

        const loginAnimationDelay = 5000;
        setStatusText('מכינים חיוך...');
        await new Promise(resolve => setTimeout(resolve, loginAnimationDelay));

        setProgress(20);
        setStatusText('מתחברים...');

        // Call the new API to setup session for Google user
        const response = await axios.post('/api/google-login-success/');

        if (response.data.user_id) {
          await new Promise(resolve => setTimeout(resolve, loginAnimationDelay));

          setProgress(40);
          setStatusText('אוספים את הכוכבים...');

          // Store user info like regular login
          localStorage.setItem('username', response.data.username);
          localStorage.setItem('origUsername', response.data.username);

          // Get permissions
          const permissionsResponse = await axios.get('/api/permissions/');
          localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));
          await new Promise(resolve => setTimeout(resolve, loginAnimationDelay));

          setProgress(70);
          setStatusText('מכינים קסם...');

          // Get staff data
          const staffResponse = await axios.get('/api/staff/');
          const staffs = (staffResponse.data.staff || []).map(s => ({
            id: s.id,
            username: s.username,
            roles: s.roles || [],
          }));
          localStorage.setItem('staff', JSON.stringify(staffs));

          await new Promise(resolve => setTimeout(resolve, loginAnimationDelay));

          setProgress(100);
          setStatusText('הכל מוכן ✨');

          clearInterval(progressInterval);

          // Final delay to show completion
          await new Promise(resolve => setTimeout(resolve, loginAnimationDelay));

          // Navigate to tasks
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Google login setup failed:', error);
        setError(error.response?.data?.error || t('Login failed. Please try again.'));
        setTimeout(() => navigate('/'), 3000);
      } finally {
        console.log('🔄 Google login process completed.');
      }
    };

    setupGoogleSession();
  }, [navigate, t]);

  return (
    <div className="lv-stage">
      {/* Static anime frame — instant, and the fallback if the video isn't there */}
      <img className={`lv-poster ${videoOk ? 'is-hidden' : ''}`} src={POSTER} alt="" aria-hidden="true" />

      {/* Two stacked players crossfade at the loop (opacity dissolve, no black) */}
      <video
        ref={vidA}
        className="lv-video"
        style={{ opacity: videoOk && active === 'A' ? 1 : 0 }}
        autoPlay
        muted
        playsInline
        poster={POSTER}
        onLoadedData={() => setVideoOk(true)}
        onError={() => setVideoOk(false)}
        onTimeUpdate={handleLoopFade('A')}
        onEnded={handleEndedReset}
      >
        {VIDEO_SOURCES.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
      <video
        ref={vidB}
        className="lv-video"
        style={{ opacity: videoOk && active === 'B' ? 1 : 0 }}
        muted
        playsInline
        onTimeUpdate={handleLoopFade('B')}
        onEnded={handleEndedReset}
      >
        {VIDEO_SOURCES.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>

      {/* Legibility overlays (title only — the scene itself carries the motion) */}
      <div className="lv-scrim" />
      <div className="lv-vignette" />

      <div className="lv-ui">
        {!error ? (
          <>
            <h1 className="lv-brand">חיוך של ילד</h1>
            <div className="lv-bar"><div className="lv-bar-fill" style={{ width: `${progress}%` }} /></div>
            <p className="lv-status" key={statusText}>{statusText}</p>
          </>
        ) : (
          <>
            <h1 className="lv-brand lv-err">{t('משהו השתבש...')}</h1>
            <p className="lv-status">{error}</p>
            <p className="lv-sub">{t('חוזרים לדף הכניסה...')}</p>
          </>
        )}
      </div>

      <style>{`
        .lv-stage {
          position: fixed; inset: 0; z-index: 9999; overflow: hidden;
          direction: rtl; background: #0b0e18;
          font-family: 'Rubik', 'Segoe UI', Tahoma, sans-serif;
        }
        .lv-poster, .lv-video {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center;
        }
        /* poster shows for a split second before the video is ready; keep it static
           (same scale/frame as the video) so the hand-off doesn't visibly shift */
        .lv-poster { transition: opacity 0.6s ease; }
        .lv-poster.is-hidden { opacity: 0; }
        .lv-video { opacity: 0; transition: opacity 0.6s ease; }

        .lv-scrim {
          position: absolute; inset: 0; z-index: 4; pointer-events: none;
          background:
            linear-gradient(to top, rgba(6,8,16,0.82) 0%, rgba(6,8,16,0.38) 26%, rgba(6,8,16,0) 52%),
            linear-gradient(to bottom, rgba(6,8,16,0.34) 0%, rgba(6,8,16,0) 22%);
        }
        .lv-vignette {
          position: absolute; inset: 0; z-index: 4; pointer-events: none;
          background: radial-gradient(120% 100% at 50% 44%, transparent 54%, rgba(4,6,14,0.5) 100%);
        }
        .lv-ui {
          position: absolute; left: 0; right: 0; bottom: 9%; z-index: 10; pointer-events: none;
          display: flex; flex-direction: column; align-items: center;
        }
        .lv-brand {
          margin: 0 0 18px; font-size: 46px; font-weight: 700; letter-spacing: 8px; color: #fff6e8;
          text-shadow: 0 2px 34px rgba(0,0,0,0.65), 0 0 24px rgba(255,200,130,0.4);
          animation: lvRise 1s cubic-bezier(0.2,0.7,0.2,1) both, lvGlow 5s ease-in-out infinite;
        }
        .lv-err { color: #ffdede; animation: lvRise 1s ease both; }
        .lv-bar { width: 300px; height: 5px; border-radius: 4px; background: rgba(255,255,255,0.22); overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.45); }
        .lv-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #ffe1a0, #ffb86b); box-shadow: 0 0 16px rgba(255,214,138,0.9); transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }
        .lv-status { margin: 15px 0 0; color: #fdeed7; font-size: 18px; font-weight: 300; letter-spacing: 1px; text-align: center; max-width: 340px; text-shadow: 0 1px 12px rgba(0,0,0,0.75); animation: lvFade 0.5s ease both; }
        .lv-sub { margin: 9px 0 0; color: rgba(255,255,255,0.6); font-size: 14px; }

        @keyframes lvRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lvGlow { 0%, 100% { text-shadow: 0 2px 34px rgba(0,0,0,0.65), 0 0 20px rgba(255,200,130,0.35); } 50% { text-shadow: 0 2px 34px rgba(0,0,0,0.65), 0 0 34px rgba(255,214,150,0.65); } }
        @keyframes lvFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) { .lv-poster, .lv-brand { animation: none !important; } }
        @media (max-width: 520px) { .lv-brand { font-size: 33px; letter-spacing: 4px; } .lv-bar { width: 240px; } }
      `}</style>
    </div>
  );
};

export default GoogleSuccess;
