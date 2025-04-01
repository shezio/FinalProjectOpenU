/* toastUtils.js */
import { toast } from 'react-toastify';

export const showErrorToast = (t, key, error) => {
  // Translate the error message if it matches a known key
  const errorMessage = t(error.response?.data?.detail || error.message);

  // Combine the translated error message with the context
  toast.error(`${t(key)} - ${errorMessage}`);
};