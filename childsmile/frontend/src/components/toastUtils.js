/* toastUtils.js */
import { toast } from 'react-toastify';

export const showErrorToast = (t, key, error) => {
  console.log('showErrorToast called with:', t, key, error); // Debug log

  // Translate the error message if it matches a known key
  const errorMessage = t(error.response?.data?.detail || error.message);

  // Combine the translated error message with the context
  // if the key is empty - use the error message directly
  const messageToShow = key ? `${t(key)} - ${errorMessage}` : errorMessage;
  toast.error(messageToShow);
};