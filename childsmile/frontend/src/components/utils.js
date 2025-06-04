/* utils.js */
import axios from '../axiosConfig';  // Import the configured Axios instance
import i18n from '../i18n';

export const getStaff = async () => {
  try {
    const response = await axios.get('/api/staff/');
    console.log('Staff API response:', response.data); // Log the response for debugging
    const staff = response.data?.staff || [];
    return staff.map((user) => ({
      value: user.id,
      label: `${user.first_name} ${user.last_name} - ${user.roles.map((role) => i18n.t(role)).join(', ')}`, // Translate each role name
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


export const getPendingTutors = async () => {
  try {
    const response = await axios.get('/api/get_pending_tutors/');
    console.log('Pending Tutors API response:', response.data); // Log the response for debugging
    const pendingTutors = response.data.pending_tutors || [];
    return pendingTutors.map((tutor) => ({
      value: tutor.id, // Use the primary key of the Pending_Tutor table
      label: `${tutor.first_name} ${tutor.surname} - ${tutor.pending_status}`,
    }));
  } catch (error) {
    console.error('Error fetching pending tutors:', error);
    return [];
  }
};

export const getGeneralVolunteersNotPending = async () => {
  try {
    const response = await axios.get('/api/get_general_volunteers_not_pending/');
    console.log('General Volunteers Not Pending API response:', response.data);
    const volunteers = response.data.general_volunteers || [];
    return volunteers.map((volunteer) => ({
      value: volunteer.id,
      label: `${volunteer.first_name} ${volunteer.last_name} - ${volunteer.email}`,
    }));
  } catch (error) {
    console.error('Error fetching general volunteers not pending:', error);
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

export const getPendingTutorFullName = (tutorId, pendingTutorsOptions) => {
  console.log('getPendingTutorFullName called with:', { tutorId, pendingTutorsOptions });

  // Handle null or undefined tutorId
  if (!tutorId) {
    console.log('DEBUG: tutorId is null or undefined.');
    return '---';
  }

  const fullName = `${tutorId.first_name} ${tutorId.surname}`.trim();

  const tutor = pendingTutorsOptions.find((t) => {
    const labelName = t.label.split(' - ')[0].trim(); // extract 'first_name surname'
    return labelName === fullName;
  });

  console.log('Found pending tutor:', tutor);

  return tutor ? tutor.label.split(' - ')[0] : '---';
};



export const hasViewPermissionForReports = () => {
  const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
  const reportTables = [
    'children', // Corrected table name
    'tutorships', // Corrected table name
    'tutors', // Corrected table name
    'possiblematches', // Corrected table name
    'general_v_feedback', // Corrected table name
    'tutor_feedback', // Corrected table name
    'feedback', // Corrected table name
  ];

  // Check if the user has VIEW permission for any of the report tables
  return reportTables.some((table) =>
    permissions.some(
      (permission) =>
        permission.resource === `childsmile_app_${table}` &&
        permission.action === 'VIEW'
    )
  );
};

/* similarly to the above function, need a function that check for specific table name for view permission. generic function that takes table name as parameter and return true or false. */
export const hasViewPermissionForTable = (tableName) => {
  const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
  return permissions.some(
    (permission) =>
      permission.resource === `childsmile_app_${tableName}` &&
      permission.action === 'VIEW'
  );
};

export const hasCreatePermissionForTable = (tableName) => {
  const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
  return permissions.some(
    (permission) =>
      permission.resource === `childsmile_app_${tableName}` &&
      permission.action === 'CREATE'
  );
};

export const hasUpdatePermissionForTable = (tableName) => {
  const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
  return permissions.some(
    (permission) =>
      permission.resource === `childsmile_app_${tableName}` &&
      permission.action === 'UPDATE'
  );
};

export const hasDeletePermissionForTable = (tableName) => {
  const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
  return permissions.some(
    (permission) =>
      permission.resource === `childsmile_app_${tableName}` &&
      permission.action === 'DELETE'
  );
};

// Check if the user has all required permissions - get an array of resource and action as parameter
export const hasAllPermissions = (requiredPermissions) => {
    const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
    return requiredPermissions.every((required) =>
      permissions.some(
        (permission) =>
          permission.resource === required.resource &&
          permission.action === required.action
      )
    );
  };


  // Check if the user has all required permissions - get an array of resource and action as parameter
export const hasSomePermissions = (requiredPermissions) => {
    const permissions = JSON.parse(localStorage.getItem('permissions')) || [];
    return requiredPermissions.some((required) =>
      permissions.some(
        (permission) =>
          permission.resource === required.resource &&
          permission.action === required.action
      )
    );
  };

  // Helper to determine if a staff member is a Tutor or General Volunteer
export const isTutorOrGeneralVolunteer = (staff) => staff.label.includes("חונך") || staff.label.includes("מתנדב כללי");