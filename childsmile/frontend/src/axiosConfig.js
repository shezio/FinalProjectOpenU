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
  axios.interceptors.request.use(config => {
    const match = document.cookie.match(/csrftoken=([\w-]+)/);
    const csrfToken = match ? match[1] : '';
    if (csrfToken) config.headers['X-CSRFToken'] = csrfToken;
    return config;
  });
}

export default axiosInstance;