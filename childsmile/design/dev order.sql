### Development Order
1. **Roles and Permissions**: These are foundational for managing access control.
2. **Staff**: Essential for user management.
3. **SignedUp**: To manage individuals who sign up for the program.
4. **General_Volunteer** and **Pending_Tutor**: To manage volunteers and tutors.
5. **Tutors**: To manage tutor-specific details.
6. **Children**: To manage child-specific details.
7. **Tutorships**: To manage the relationship between tutors and children.
8. **Matures** and **Healthy**: To manage mature and healthy children.
9. **Feedback**: To manage feedback from staff.
10. **Tasks**: To manage tasks assigned to staff.

### Sample Inserts
Here are the sample inserts for each table, with texts in Hebrew:


### Table names in db after the django migrations are:
- childsmile_app_role
- childsmile_app_permissions
- childsmile_app_staff
- childsmile_app_signedup
- childsmile_app_general_volunteer
- childsmile_app_pending_tutor
- childsmile_app_tutors
- childsmile_app_children
- childsmile_app_tutorships
- childsmile_app_matures
- childsmile_app_healthy
- childsmile_app_feedback
- childsmile_app_tutor_feedback
- childsmile_app_general_v_feedback
- childsmile_app_tasks
- childsmile_app_task_types

#### Role Table -
### ROLES  רכז מתנדבים ,רכז משפחות,רכז חונכים,רכז בוגרים
רכז בריאים,רכז טכני ,מנהל מערכתת,מתנדב,חונך
```sql
INSERT INTO childsmile_app_role (role_name) VALUES ('System Administrator');
INSERT INTO childsmile_app_role (role_name) VALUES ('General Volunteer');
INSERT INTO childsmile_app_role (role_name) VALUES ('Tutor');
INSERT INTO childsmile_app_role (role_name) VALUES ('Technical Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Volunteer Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Families Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Tutors Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Matures Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Healthy Kids Coordinator');
```

#### Permissions Table
```sql

### System Administrator - has CREATE, UPDATE, DELETE, VIEW permissions for all tables
## Table: role
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_role', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_role', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_role', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_role', 'VIEW');
```

## Table: permissions
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_permissions', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_permissions', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_permissions', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_permissions', 'VIEW');
```

## Table: staff
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_staff', 'VIEW');
```

## Table: signedup
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_signedup', 'VIEW');
```

## Table: general_volunteer
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_volunteer', 'VIEW');
```

## Table: pending_tutor
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_pending_tutor', 'VIEW');
```

## Table: tutors
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutors', 'VIEW');
```

## Table: children
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_children', 'VIEW');
```

## Table: tutorships
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutorships', 'VIEW');
```

## Table: matures
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_matures', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_matures', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_matures', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_matures', 'VIEW');
```

## Table: healthy
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_healthy', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_healthy', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_healthy', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_healthy', 'VIEW');
```

## Table: feedback
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_feedback', 'VIEW');
```

## Table: tasks
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tasks', 'VIEW');
```

## Table: task_types
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_task_types', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_task_types', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_task_types', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_task_types', 'VIEW');
```

## Table: tutor_feedback
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutor_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutor_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutor_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_tutor_feedback', 'VIEW');
```

## Table: general_v_feedback
```sql
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_v_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_v_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_v_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('System Administrator', 'childsmile_app_general_v_feedback', 'VIEW');
```

### General Volunteer role: 
- has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: NONE
- childsmile_app_signedup: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_general_volunteer: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_pending_tutor: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutors: VIEW
- childsmile_app_children: NONE
- childsmile_app_tutorships: NONE
- childsmile_app_matures: NONE
- childsmile_app_healthy: NONE
- childsmile_app_feedback: CREATE, UPDATE, VIEW
- childsmile_app_tutor_feedback: NONE
- childsmile_app_general_v_feedback: CREATE, UPDATE, VIEW
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

```sql
-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_general_v_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_v_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_v_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_general_v_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('General Volunteer', 'childsmile_app_task_types', 'VIEW');
```

### Tutor role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: NONE
- childsmile_app_signedup: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_general_volunteer: VIEW
- childsmile_app_pending_tutor: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutors: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_children: UPDATE, VIEW
- childsmile_app_tutorships: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_matures: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_healthy: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_feedback: CREATE, UPDATE, VIEW
- childsmile_app_tutor_feedback: CREATE, UPDATE, VIEW
- childsmile_app_general_v_feedback: NONE
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

```sql
-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_matures', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_matures', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_matures', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_healthy', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_healthy', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_healthy', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_tutor_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutor_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutor_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tutor_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutor', 'childsmile_app_task_types', 'VIEW');
```

### Technical Coordinator role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_signedup: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_general_volunteer: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_pending_tutor: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutors: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_children: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutorships: VIEW
- childsmile_app_matures: VIEW
- childsmile_app_healthy: VIEW
- childsmile_app_feedback: VIEW
- childsmile_app_tutor_feedback: VIEW
- childsmile_app_general_v_feedback: VIEW
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: CREATE, UPDATE, DELETE, VIEW

Sure! Here are the SQL insert statements for the `Technical Coordinator` role based on the permissions you provided:

```sql
-- childsmile_app_staff
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_staff', 'VIEW');

-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_tutor_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tutor_feedback', 'VIEW');

-- childsmile_app_general_v_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_general_v_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_task_types', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_task_types', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_task_types', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Technical Coordinator', 'childsmile_app_task_types', 'VIEW');
```

### Volunteer Coordinator role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_signedup: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_general_volunteer: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_pending_tutor: VIEW
- childsmile_app_tutors: VIEW
- childsmile_app_children: NONE
- childsmile_app_tutorships: NONE
- childsmile_app_matures: NONE
- childsmile_app_healthy: NONE
- childsmile_app_feedback: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutor_feedback: NONE
- childsmile_app_general_v_feedback: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

Sure! Here are the SQL insert statements for the `Volunteer Coordinator` role based on the permissions you provided:

```sql
-- childsmile_app_staff
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_staff', 'VIEW');

-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_general_v_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_v_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_v_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_v_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_general_v_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Volunteer Coordinator', 'childsmile_app_task_types', 'VIEW');
```

### Families Coordinator role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: NONE
- childsmile_app_signedup: VIEW
- childsmile_app_general_volunteer: VIEW
- childsmile_app_pending_tutor: VIEW
- childsmile_app_tutors: VIEW
- childsmile_app_children: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutorships: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_matures: VIEW
- childsmile_app_healthy: VIEW
- childsmile_app_feedback: NONE
- childsmile_app_tutor_feedback: NONE
- childsmile_app_general_v_feedback: NONE
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

Sure! Here are the SQL insert statements for the `Families Coordinator` role based on the permissions you provided:

```sql
-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Families Coordinator', 'childsmile_app_task_types', 'VIEW');
```

### Tutors Coordinator role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_signedup: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_general_volunteer: VIEW
- childsmile_app_pending_tutor: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutors: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_children: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutorships: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_matures: VIEW
- childsmile_app_healthy: VIEW
- childsmile_app_feedback: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutor_feedback: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_general_v_feedback: NONE
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

Sure! Here are the SQL insert statements for the `Tutors Coordinator` role based on the permissions you provided:

```sql
-- childsmile_app_staff
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_staff', 'VIEW');

-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_tutor_feedback
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutor_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutor_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutor_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tutor_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Tutors Coordinator', 'childsmile_app_task_types', 'VIEW');
```

### Matures Coordinator role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: NONE
- childsmile_app_signedup: VIEW
- childsmile_app_general_volunteer: NONE
- childsmile_app_pending_tutor: NONE
- childsmile_app_tutors: VIEW
- childsmile_app_children: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutorships: VIEW
- childsmile_app_matures: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_healthy: NONE
- childsmile_app_feedback: NONE
- childsmile_app_tutor_feedback: NONE
- childsmile_app_general_v_feedback: NONE
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

Sure! Here are the SQL insert statements for the `Matures Coordinator` role based on the permissions you provided:

```sql
-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_matures', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_matures', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_matures', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_matures', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Matures Coordinator', 'childsmile_app_task_types', 'VIEW');
```

### Healthy Kids Coordinator role has permissions as follows:
- childsmile_app_role: NONE
- childsmile_app_permissions: NONE
- childsmile_app_staff: NONE
- childsmile_app_signedup: NONE
- childsmile_app_general_volunteer: NONE
- childsmile_app_pending_tutor: NONE
- childsmile_app_tutors: VIEW
- childsmile_app_children: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_tutorships: VIEW
- childsmile_app_matures: NONE
- childsmile_app_healthy: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_feedback: NONE
- childsmile_app_tutor_feedback: NONE
- childsmile_app_general_v_feedback: NONE
- childsmile_app_tasks: CREATE, UPDATE, DELETE, VIEW
- childsmile_app_task_types: VIEW

Sure! Here are the SQL insert statements for the `Healthy Kids Coordinator` role based on the permissions you provided:

```sql
-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role, resource, action) VALUES ('Healthy Kids Coordinator', 'childsmile_app_task_types', 'VIEW');
```