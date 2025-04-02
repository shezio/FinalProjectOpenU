/* task_utils.js */
import axios from '../axiosConfig';  // Import the configured Axios instance
import i18n from '../i18n';

export const getStaff = async () => {
  try {
    const response = await axios.get('/api/staff/');
    console.log('Staff API response:', response.data); // Log the response for debugging
    const staff = response.data?.staff || [];
    return staff.map((user) => ({
      value: user.id,
      label: `${user.first_name} ${user.last_name} - ${i18n.t(user.role)}`, // Translate the role
    }));
  } catch (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
};

export const getChildren = async () => {
  const response = await axios.get('/api/children/');
  return response.data.children.map((child) => ({
    value: child.id,
    label: `${child.first_name} ${child.last_name} - ${child.tutoring_status}`,
  }));
};

export const getTutors = async () => {
  try {
    const response = await axios.get('/api/tutors/');
    console.log('Tutors API response:', response.data); // Log the response for debugging
    const tutors = response.data.tutors || [];
    return tutors.map((tutor) => ({
      value: tutor.id,
      label: `${tutor.first_name} ${tutor.last_name} - ${tutor.tutorship_status}`,
    }));
  } catch (error) {
    console.error('Error fetching tutors:', error);
    return [];
  }
};

export const getChildFullName = (childId, childrenOptions) => {
  console.log('getChildFullName called with:', { childId, childrenOptions });
  const child = childrenOptions.find((child) => child.value === childId);
  console.log('Found child:', child);
  return child ? child.label.split(' - ')[0] : '---';
};

export const getTutorFullName = (tutorId, tutorsOptions) => {
  console.log('getTutorFullName called with:', { tutorId, tutorsOptions });
  const tutor = tutorsOptions.find((tutor) => tutor.value === tutorId);
  console.log('Found tutor:', tutor);
  return tutor ? tutor.label.split(' - ')[0] : '---';
};