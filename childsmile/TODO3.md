admin new mail

update public.childsmile_app_staff
set email = 'gowocij683@memeazon.com'
where email = 'sysadminmini@mail.com'




also need to consider which of the fields above should be indexed for performance when querying the logs later on - and also which are really necessary to store vs which might be optional or redundant. - and which might be unsecure to store 

# Actions to audit:
AUDIT_ACTIONS = [
    # Authentication
    'USER_LOGIN',
    'USER_LOGIN_FAILED', 
    'USER_LOGOUT',
    'TOTP_VERIFICATION',
    'GOOGLE_OAUTH_LOGIN',
    
    # Staff management
    'CREATE_STAFF',
    'UPDATE_STAFF', 
    'DELETE_STAFF',
    'ASSIGN_ROLE',
    'REMOVE_ROLE',
    
    # Volunteer/Child management
    'CREATE_VOLUNTEER',
    'UPDATE_VOLUNTEER',
    'DELETE_VOLUNTEER',
    'APPROVE_VOLUNTEER',
    'REJECT_VOLUNTEER',
    
    'CREATE_CHILD',
    'UPDATE_CHILD',
    'DELETE_CHILD',
    
    # Task management
    'CREATE_TASK',
    'UPDATE_TASK',
    'DELETE_TASK',
    'ASSIGN_TASK',
    'COMPLETE_TASK',
    
    # Sensitive operations
    'EXPORT_DATA',
    'BULK_UPDATE',
    'PERMISSION_CHANGE',
    'SYSTEM_CONFIG_CHANGE',
    
    # Security events
    'ACCESS_DENIED',
    'SUSPICIOUS_ACTIVITY',
    'PASSWORD_RESET',
]

# Actions NOT to audit:
SKIP_AUDIT_ACTIONS = [
    'GET_STAFF_LIST',
    'GET_VOLUNTEER_LIST', 
    'GET_CHILDREN_LIST',
    'GET_TASK_LIST',
    'GET_PERMISSIONS',
    'HEALTH_CHECK',
    'STATIC_FILE_ACCESS',
]


