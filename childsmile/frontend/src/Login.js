import React, { useState, useRef } from 'react';
import axios from './axiosConfig';
import Header from './Header';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showTotpInput, setShowTotpInput] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Move the refs to top level - FIXED!
  const inputRefs = [
    useRef(), useRef(), useRef(),
    useRef(), useRef(), useRef()
  ];

  // Email validation
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError(t('Please enter your email address'));
      return;
    }
    
    if (!isValidEmail(email.trim())) {
      setError(t('Please enter a valid email address'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/auth/login-email/', { 
        email: email.trim().toLowerCase() 
      });
      
      setSuccess(t('Login code was sent to the address: ') + email);
      setShowTotpInput(true);
      
    } catch (err) {
      console.error('Email login error:', err);
      setError(t(err.response?.data?.error || 'Failed to send login code'));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerification = async (e) => {
    e.preventDefault();
    
    if (!totpCode.trim()) {
      setError(t('Please enter the verification code'));
      return;
    }
    
    if (totpCode.trim().length !== 6) {
      setError(t('Verification code must be 6 digits'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/auth/verify-totp/', {
        email: email.trim().toLowerCase(),
        code: totpCode.trim()
      });
      
      // Store user info like regular login
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('origUsername', response.data.username);
      
      // Get permissions
      const permissionsResponse = await axios.get('/api/permissions/');
      localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));
      
      // Get staff data
      const staffResponse = await axios.get('/api/staff/');
      const staffs = (staffResponse.data.staff || []).map(s => ({
        id: s.id,
        username: s.username,
        roles: s.roles || [],
      }));
      localStorage.setItem('staff', JSON.stringify(staffs));
      
      // Navigate to tasks
      navigate('/tasks');
      
    } catch (err) {
      console.error('TOTP verification error:', err);
      setError(t(err.response?.data?.error || 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/accounts/google/login/';
  };

  const resetLogin = () => {
    setShowTotpInput(false);
    setTotpCode('');
    setError('');
    setSuccess('');
  };

  // Add this function for handling TOTP input
  const handleTotpInputChange = (index, value) => {
    // Only allow single digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = totpCode.split('');
    while (newCode.length < 6) newCode.push('');
    newCode[index] = digit;
    
    setTotpCode(newCode.join(''));
    
    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleTotpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  // TOTP Input Boxes - FIXED: no useRef inside function
  const renderTOTPInputBoxes = () => {
    const codeArray = totpCode.split('');
    while (codeArray.length < 6) codeArray.push('');

    return (
      <div className="totp-input-container">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={codeArray[index] || ''}
            onChange={(e) => handleTotpInputChange(index, e.target.value)}
            onKeyDown={(e) => handleTotpKeyDown(index, e)}
            onPaste={(e) => {
              e.preventDefault();
              const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              setTotpCode(pastedData);
              const nextFocusIndex = Math.min(pastedData.length, 5);
              inputRefs[nextFocusIndex].current?.focus();
            }}
            disabled={loading}
            className="totp-digit-input"
            autoComplete="off"
            autoFocus={index === 0}
          />
        ))}
      </div>
    );
  };

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const email = urlParams.get('email');
    
    if (error) {
      switch (error) {
        case 'no_email':
          setError(t('Unable to get email from Google account'));
          break;
        case 'unauthorized':
          setError(t("Access denied. Email ") + email + t(" is not authorized to access this system"));
          break;
        case 'auth_failed':
          setError(t('Google login was cancelled or failed'));
          break;
        default:
          setError(t('Google login failed'));
      }
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [t]);

  return (
    <div className="login-main-content">
      <Header />
      <span className="amit-title">{t("Amit's Smile")}</span>
      
      {!showTotpInput ? (
        // Email Input Phase
        <form onSubmit={handleEmailLogin}>
          <input
            type="text"
            placeholder={t("Please enter your email address")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <div className="login-buttons">
            <button type="submit" disabled={loading}>
              {loading ? t('Sending...') : t("Login with an email account")}
            </button>
            <button type="button" onClick={handleGoogleLogin} className="google-btn">
              <svg className="google-icon" viewBox="0 0 24 24" width="40" height="40">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("Login with a Google account")}
            </button>
          </div>
          <span>{t("או")}</span>
          <button type="button" onClick={() => navigate("/register")}>
            {t("הירשם")}
          </button>
        </form>
      ) : (
        // TOTP Code Input Phase
        <div className="totp-verification-section">
          <p style = {{fontSize: '26px', fontFamily: 'Rubik', alignItems: 'center'}}>{t('Please enter the 6-digit code sent to your email')}</p>
          <form onSubmit={handleTotpVerification}>
            {renderTOTPInputBoxes()}
            
            <div className="login-buttons">
              <button type="submit" disabled={loading || totpCode.length !== 6}>
                {loading ? t('Verifying...') : t("Verify Code")}
              </button>
              <button type="button" onClick={resetLogin}>
                {t("← Back to Email")}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
    </div>
  );
};

export default Login;