/* toastUtils.js */
import { toast } from 'react-toastify';

export const showErrorToast = (t, key, error) => {
  console.log('showErrorToast called with:', t, key, error); // Debug log

  // Translate the error message if it matches a known key
  const errorMessage = t(error.response?.data?.detail || error.message);

  // Combine the translated error message with the context
  // if the key is empty - use the error message directly
  const messageToShow = key ? `${t(key)} - ${t(errorMessage)}` : t(errorMessage);
  toast.error(messageToShow);
};

export const showErrorApprovalToast = (t, error, roleName) => {
  console.log('showErrorApprovalToast called with:', t, error, roleName); // Debug log

  // Extract the error message from the response or fallback to a generic error message
  const errorMessage = error.response?.data?.error || error.message;

  // Check if the error message matches the specific case
  if (errorMessage === "This role has already approved this tutorship") {
    // Show a yellow toast with the role name included
    const translatedMessage = t('A user with Role: {{roleName}} has already approved this tutorship', { roleName });
    toast.warn(translatedMessage); // Use `warn` for a yellow toast
  } else {
    // Show a red toast for other errors
    toast.error(t(errorMessage)); // Use `error` for a red toast
  }
};