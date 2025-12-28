import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Important for session cookies!
});
const isProd = process.env.NODE_ENV === 'production';
axios.defaults.withCredentials = true;

if (isProd) {
  axiosInstance.interceptors.request.use(config => {
    const match = document.cookie.match(/csrftoken=([\w-]+)/);
    const csrfToken = match ? match[1] : '';
    if (csrfToken) config.headers['X-CSRFToken'] = csrfToken;
    return config;
  });
}

// Response interceptor to handle session expiry / logged out from another device
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if it's an authentication error (403 with specific message)
    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.detail || error.response.data?.error || '';
      
      // Check if user was logged out (session expired or invalidated)
      const isAuthError = status === 403 && errorMessage.toLowerCase().includes('credentials');

      // Don't redirect if already on login page or if it's a login request
      const isLoginRequest = error.config?.url?.includes('login') || 
                            error.config?.url?.includes('verify-totp') ||
                            error.config?.url?.includes('google');
      
      // Check if on root/login page (works for both HashRouter and BrowserRouter)
      const currentPath = window.location.hash 
        ? window.location.hash.replace('#', '')  // HashRouter: /#/ -> /
        : window.location.pathname;               // BrowserRouter: /
      const isOnLoginPage = currentPath === '/' || currentPath === '';
      
      if (isAuthError && !isLoginRequest && !isOnLoginPage) {
        // Dispatch a custom event that index.js listens to for the toast
        window.dispatchEvent(new CustomEvent('session-expired', {
          detail: { 
            message: 'התנתקת מהמערכת עקב התחברות ממכשיר אחר',
            messageEn: 'You have been logged out due to login from another device'
          }
        }));
        
        // Clear any local storage
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
        
        // Call logout endpoint to clear server-side session (fire and forget, don't wait)
        axios.post(`${process.env.REACT_APP_API_URL}/api/logout/`, {}, { withCredentials: true })
          .catch(() => {}); // Ignore any errors from logout
        
        // Redirect to login after a short delay (to show the toast)
        // Use correct path for both dev (BrowserRouter) and prod (HashRouter)
        setTimeout(() => {
          if (isProd) {
            window.location.href = '/#/';  // HashRouter in production
          } else {
            window.location.href = '/';     // BrowserRouter in development
          }
        }, 2000);
        
        // Mark as handled to prevent other error handlers from showing duplicate toasts
        error.handled = true;
        
        // Return a resolved promise to prevent error propagation (no error toast, no console errors)
        return new Promise(() => {}); // Never resolves - silently swallows the error
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;