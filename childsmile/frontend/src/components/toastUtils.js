/* toastUtils.js */
import { toast } from 'react-toastify';

let errorToastPromise = null;

export const showErrorToast = (t, key, error) => {
  // If we're already creating a toast, return the existing promise
  if (errorToastPromise) {
    return errorToastPromise;
  }

  // Create a new promise for this toast creation
  errorToastPromise = new Promise((resolve) => {
    try {
      const errorMessage = t(
        error.response?.data?.error || 
        error.response?.data?.detail || 
        error.message
      );

      const messageToShow = key ? `${t(key)} - ${errorMessage}` : errorMessage;
      
      // Dismiss ALL toasts to ensure clean slate
      toast.dismiss();
      
      // Use setTimeout with 0ms to defer to next event loop - ensures dismiss completes
      setTimeout(() => {
        // Create toast without toastId to prevent duplicates across multiple containers
        toast.error(messageToShow, { 
          autoClose: 10000,
          onClose: () => {
            errorToastPromise = null;
            resolve();
          }
        });
      }, 0);
    } catch (err) {
      console.error('Error in showErrorToast:', err);
      errorToastPromise = null;
      resolve();
    }
  });

  return errorToastPromise;
};

export const showWarningToast = (t, key, error) => {
  console.log('showWarningToast called with:', t, key, error); // Debug log

  // Translate the error message if it matches a known key
  const errorMessage = t(error.response?.data?.detail || error.message);

  // Combine the translated error message with the context
  // if the key is empty - use the error message directly
  // if the error message is empty and the key is not, show the key as a warning
  if (!errorMessage && key) {
    toast.warn(t(key));
  } else if (errorMessage) {
    const messageToShow = key ? `${t(key)} - ${t(errorMessage)}` : t(errorMessage);
    toast.warn(messageToShow);
  } else {
    toast.warn(t('An unknown warning occurred'));
  }
};

export const feedbackShowErrorToast = (t, key, error) => {
  console.log('feedbackShowErrorToast called with:', t, key, error); // Debug log

  // Extract the error message from the response or fallback to a generic error message
  const errorMessage = error.response?.data?.detail || error.message;
  // Special case: if the error is about the current user not being an active tutor, show only that message
  if (key.includes("not found in active tutors") && key.includes("cannot create feedback")) {
    toast.error(t(key));
    return;
  }

  // Otherwise, show the combined message as before
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