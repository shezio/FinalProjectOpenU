import React, { useEffect, useState, useMemo } from 'react';
import axios from '../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const isProd = process.env.NODE_ENV === 'production';

const GoogleSuccess = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('מכינים חיוך...');
  
  // Generate stable star positions only once
  const starPositions = useMemo(() => 
    [...Array(12)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 60,
      size: Math.random() * 8 + 4,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2
    })), []);

  useEffect(() => {
    const setupGoogleSession = async () => {
      try {
        // Animate progress while loading
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + Math.random() * 8, 90));
        }, 500);

        const loginAnimationDelay = isProd ? 2500 : 500;
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

  // Majestic full-screen login experience - "Reaching for the Stars"
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(180deg, #0d1b2a 0%, #1b263b 40%, #415a77 70%, #778da9 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      alignItems: 'center',
      zIndex: 9999,
      direction: 'rtl',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      
      {/* Twinkling stars in the sky */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
        {starPositions.map((star, i) => (
          <svg
            key={i}
            style={{
              position: 'absolute',
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`
            }}
            viewBox="0 0 24 24"
            fill="#ffd700"
          >
            <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" />
          </svg>
        ))}
        
        {/* The magical main star */}
        <svg
          style={{
            position: 'absolute',
            left: '50%',
            top: '15%',
            transform: 'translateX(-50%)',
            width: '80px',
            height: '80px',
            animation: 'mainStarGlow 3s ease-in-out infinite',
            filter: 'drop-shadow(0 0 20px #ffd700)'
          }}
          viewBox="0 0 24 24"
          fill="#ffd700"
        >
          <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" />
        </svg>
      </div>
      
      {/* Gentle hills/ground */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '25%',
        background: 'linear-gradient(180deg, #2d4a3e 0%, #1a2f27 100%)',
        borderRadius: '100% 100% 0 0 / 30% 30% 0 0'
      }} />

      {loading && !error ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          zIndex: 10,
          marginBottom: '15%'
        }}>
          
          {/* Adult and child holding hands, reaching for stars */}
          <div style={{
            position: 'relative',
            width: '280px',
            height: '220px',
            marginBottom: '40px'
          }}>
            {/* Adult and Child SVG */}
            <svg
              viewBox="0 0 200 160"
              style={{
                width: '100%',
                height: '100%',
                animation: 'gentleFloat 3s ease-in-out infinite'
              }}
            >
              {/* Adult figure */}
              {/* Head */}
              <circle cx="60" cy="35" r="18" fill="#f5d0c5" />
              {/* Hair */}
              <ellipse cx="60" cy="28" rx="16" ry="10" fill="#4a3728" />
              {/* T-shirt body - light blue like the NPO shirts */}
              <path 
                d="M42 52 L42 95 Q42 100 47 100 L73 100 Q78 100 78 95 L78 52 Q70 48 60 48 Q50 48 42 52" 
                fill="#7DD3FC"
              />
              {/* T-shirt sleeves */}
              <path d="M42 52 Q35 55 30 65 L38 68 Q42 60 42 55" fill="#7DD3FC" />
              <path d="M78 52 Q85 55 90 65 L82 68 Q78 60 78 55" fill="#7DD3FC" />
              {/* Arms - skin tone */}
              <path d="M30 65 Q25 75 28 85" stroke="#f5d0c5" strokeWidth="8" strokeLinecap="round" fill="none" />
              {/* Reaching arm up */}
              <path 
                d="M90 65 Q100 50 105 30" 
                stroke="#f5d0c5" 
                strokeWidth="8" 
                strokeLinecap="round" 
                fill="none"
                style={{ animation: 'adultReach 3s ease-in-out infinite' }}
              />
              {/* Legs/pants */}
              <rect x="47" y="100" width="10" height="35" rx="3" fill="#3b5998" />
              <rect x="63" y="100" width="10" height="35" rx="3" fill="#3b5998" />
              {/* Shoes */}
              <ellipse cx="52" cy="137" rx="7" ry="4" fill="#2d2d2d" />
              <ellipse cx="68" cy="137" rx="7" ry="4" fill="#2d2d2d" />
              
              {/* Child figure */}
              {/* Head */}
              <circle cx="130" cy="65" r="14" fill="#f5d0c5" />
              {/* Hair - cute style */}
              <ellipse cx="130" cy="58" rx="12" ry="8" fill="#6b4423" />
              {/* T-shirt body - same light blue */}
              <path 
                d="M118 78 L118 110 Q118 114 122 114 L138 114 Q142 114 142 110 L142 78 Q136 75 130 75 Q124 75 118 78" 
                fill="#7DD3FC"
              />
              {/* T-shirt sleeves */}
              <path d="M118 78 Q113 80 110 87 L115 89 Q117 83 118 80" fill="#7DD3FC" />
              <path d="M142 78 Q147 80 150 87 L145 89 Q143 83 142 80" fill="#7DD3FC" />
              {/* Arm reaching up */}
              <path 
                d="M150 87 Q158 70 162 50" 
                stroke="#f5d0c5" 
                strokeWidth="6" 
                strokeLinecap="round" 
                fill="none"
                style={{ animation: 'childArmReach 3s ease-in-out infinite' }}
              />
              {/* Hand holding adult's hand */}
              <path d="M110 87 Q100 90 95 88" stroke="#f5d0c5" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* Legs/pants */}
              <rect x="122" y="114" width="7" height="22" rx="2" fill="#3b5998" />
              <rect x="133" y="114" width="7" height="22" rx="2" fill="#3b5998" />
              {/* Shoes */}
              <ellipse cx="125.5" cy="137" rx="5" ry="3" fill="#2d2d2d" />
              <ellipse cx="136.5" cy="137" rx="5" ry="3" fill="#2d2d2d" />
              
              {/* Holding hands connection */}
              <ellipse cx="92" cy="86" rx="8" ry="6" fill="#f5d0c5" />
              
              {/* Star being reached for */}
              <g style={{ animation: 'reachStar 3s ease-in-out infinite', transformOrigin: '140px 25px' }}>
                <path 
                  d="M140 10 L143 20 L154 21 L146 28 L148 38 L140 32 L132 38 L134 28 L126 21 L137 20 Z" 
                  fill="#ffd700"
                  style={{ filter: 'drop-shadow(0 0 12px #ffd700)' }}
                />
              </g>
              
              {/* Small sparkles around them */}
              <circle cx="50" cy="45" r="2" fill="#ffd700" style={{ animation: 'sparkle 2s ease-in-out 0s infinite' }} />
              <circle cx="160" cy="55" r="2" fill="#ffd700" style={{ animation: 'sparkle 2s ease-in-out 0.5s infinite' }} />
              <circle cx="100" cy="30" r="2" fill="#ffd700" style={{ animation: 'sparkle 2s ease-in-out 1s infinite' }} />
            </svg>
          </div>
          
          {/* Progress indicator - growing seedling style */}
          <div style={{
            width: '280px',
            marginBottom: '30px'
          }}>
            {/* Track */}
            <div style={{
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Fill with gradient */}
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4ade80 0%, #fbbf24 50%, #ffd700 100%)',
                borderRadius: '3px',
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 15px rgba(74, 222, 128, 0.5)'
              }} />
            </div>
          </div>
          
          {/* Brand name with elegant typography */}
          <h1 style={{ 
            color: '#fff', 
            marginBottom: '12px',
            fontWeight: '300',
            fontSize: '32px',
            letterSpacing: '4px',
            textShadow: '0 2px 20px rgba(255, 215, 0, 0.3)'
          }}>
            חיוך של ילד
          </h1>
          
          {/* Status message - warm and personal */}
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            fontWeight: '300',
            marginBottom: '20px',
            letterSpacing: '1px'
          }}>
            {statusText}
          </p>
          
          {/* Soft breathing dots */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#ffd700',
                  borderRadius: '50%',
                  animation: `breathe 1.4s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.7
                }}
              />
            ))}
          </div>
          
        </div>
      ) : error ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          zIndex: 10,
          marginBottom: '20%'
        }}>
          {/* Sad cloud */}
          <svg width="120" height="80" viewBox="0 0 120 80" style={{ marginBottom: '30px' }}>
            <ellipse cx="60" cy="50" rx="45" ry="25" fill="#6b7280" />
            <circle cx="30" cy="45" r="20" fill="#6b7280" />
            <circle cx="90" cy="45" r="18" fill="#6b7280" />
            <circle cx="55" cy="35" r="22" fill="#6b7280" />
            {/* Sad face */}
            <circle cx="45" cy="50" r="3" fill="#374151" />
            <circle cx="75" cy="50" r="3" fill="#374151" />
            <path d="M50 62 Q60 58 70 62" stroke="#374151" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          <h1 style={{ color: '#fca5a5', marginBottom: '15px', fontSize: '28px', fontWeight: '300' }}>
            {t('משהו השתבש...')}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px', marginBottom: '15px', textAlign: 'center', maxWidth: '300px' }}>
            {error}
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
            {t('חוזרים לדף הכניסה...')}
          </p>
        </div>
      ) : null}
      
      {/* Refined CSS animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes mainStarGlow {
          0%, 100% { 
            transform: translateX(-50%) scale(1); 
            filter: drop-shadow(0 0 20px #ffd700);
          }
          50% { 
            transform: translateX(-50%) scale(1.1); 
            filter: drop-shadow(0 0 40px #ffd700) drop-shadow(0 0 60px #ffed4a);
          }
        }
        
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        
        @keyframes adultReach {
          0%, 100% { d: path('M90 65 Q100 50 105 30'); }
          50% { d: path('M90 65 Q102 48 108 25'); }
        }
        
        @keyframes childArmReach {
          0%, 100% { d: path('M150 87 Q158 70 162 50'); }
          50% { d: path('M150 87 Q160 68 165 45'); }
        }
        
        @keyframes reachStar {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
            opacity: 0.9;
          }
          50% { 
            transform: scale(1.15) rotate(10deg); 
            opacity: 1;
          }
        }
        
        @keyframes sparkle {
          0%, 100% { 
            opacity: 0; 
            transform: scale(0.5);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.2);
          }
        }
        
        @keyframes breathe {
          0%, 100% { 
            opacity: 0.4; 
            transform: scale(0.8);
          }
          50% { 
            opacity: 1; 
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default GoogleSuccess;