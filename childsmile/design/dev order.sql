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
INSERT INTO childsmile_app_role (role_name) VALUES ('Technical Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Volunteer Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Families Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Tutors Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Matures Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Healthy Kids Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('General Volunteer');
INSERT INTO childsmile_app_role (role_name) VALUES ('Tutor');
```

#### Permissions Table - columns: role_id, resource, action
```sql

### System Administrator - has CREATE, UPDATE, DELETE, VIEW permissions for all tables
## Table: role
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_role', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_role', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_role', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_role', 'VIEW');
```

## Table: permissions
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_permissions', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_permissions', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_permissions', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_permissions', 'VIEW');
```

## Table: staff
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_staff', 'VIEW');
```

## Table: signedup
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_signedup', 'VIEW');
```

## Table: general_volunteer
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_volunteer', 'VIEW');
```

## Table: pending_tutor
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_pending_tutor', 'VIEW');
```

## Table: tutors
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutors', 'VIEW');
```

## Table: children
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_children', 'VIEW');
```

## Table: tutorships
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutorships', 'VIEW');
```

## Table: matures
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_matures', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_matures', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_matures', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_matures', 'VIEW');
```

## Table: healthy
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_healthy', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_healthy', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_healthy', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_healthy', 'VIEW');
```

## Table: feedback
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_feedback', 'VIEW');
```

## Table: tasks
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tasks', 'VIEW');
```

## Table: task_types
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_task_types', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_task_types', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_task_types', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_task_types', 'VIEW');
```

## Table: tutor_feedback
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutor_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutor_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutor_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_tutor_feedback', 'VIEW');
```

## Table: general_v_feedback
```sql
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_v_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_v_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_v_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='System Administrator'), 'childsmile_app_general_v_feedback', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_general_v_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_v_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_v_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_general_v_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='General Volunteer'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_matures', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_matures', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_matures', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_healthy', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_healthy', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_healthy', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_tutor_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutor_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutor_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tutor_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutor'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_staff', 'VIEW');

-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_tutor_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tutor_feedback', 'VIEW');

-- childsmile_app_general_v_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_general_v_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_task_types', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_task_types', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_task_types', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_staff', 'VIEW');

-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_volunteer', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_volunteer', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_volunteer', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_general_v_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_v_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_v_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_v_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_general_v_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Volunteer Coordinator'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Families Coordinator'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_staff', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_staff', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_staff', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_staff', 'VIEW');

-- childsmile_app_signedup
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_signedup', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_signedup', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_signedup', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_general_volunteer
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_general_volunteer', 'VIEW');

-- childsmile_app_pending_tutor
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_pending_tutor', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_pending_tutor', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_pending_tutor', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_pending_tutor', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutors', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutors', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutors', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutorships', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutorships', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutorships', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_matures', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_feedback', 'VIEW');

-- childsmile_app_tutor_feedback
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutor_feedback', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutor_feedback', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutor_feedback', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tutor_feedback', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Tutors Coordinator'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_signedup', 'VIEW');

-- childsmile_app_tutors
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_matures
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_matures', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_matures', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_matures', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_matures', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Matures Coordinator'), 'childsmile_app_task_types', 'VIEW');
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
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_tutors', 'VIEW');

-- childsmile_app_children
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_children', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_children', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_children', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_children', 'VIEW');

-- childsmile_app_tutorships
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_tutorships', 'VIEW');

-- childsmile_app_healthy
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_healthy', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_healthy', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_healthy', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_healthy', 'VIEW');

-- childsmile_app_tasks
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_tasks', 'CREATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_tasks', 'UPDATE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_tasks', 'DELETE');
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_tasks', 'VIEW');

-- childsmile_app_task_types
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Healthy Kids Coordinator'), 'childsmile_app_task_types', 'VIEW');
```

### now that we created the roles and permissions, i need inserts to all other tables.
i must keep the order of the tables, because of the foreign keys

### childsmile_app_staff - Insert example of a staff member - 1 record per role
childsmile_app_staff
table schema 
    staff_id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    username character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password character varying(255) COLLATE pg_catalog."default" NOT NULL,
    role_id integer NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    first_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    last_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT childsmile_app_staff_pkey PRIMARY KEY (staff_id),
    CONSTRAINT childsmile_app_staff_email_key UNIQUE (email),
    CONSTRAINT childsmile_app_staff_username_key UNIQUE (username),
    CONSTRAINT childsmile_app_staff_role_id_24c33eeb_fk_childsmile_app_role_id FOREIGN KEY (role_id)
        REFERENCES public.childsmile_app_role (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED

### name fields, must be in Hebrew,
### password must be hashed, but i need to know the hashing algorithm so i can test login functionality
### created_at must be the current timestamp
INSERT INTO childsmile_app_role (role_name) VALUES ('System Administrator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Technical Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Volunteer Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Families Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Tutors Coordinator'); 
INSERT INTO childsmile_app_role (role_name) VALUES ('Matures Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('Healthy Kids Coordinator');
INSERT INTO childsmile_app_role (role_name) VALUES ('General Volunteer');
INSERT INTO childsmile_app_role (role_name) VALUES ('Tutor');

i cannot know the IDs of the roles as its created by Django, so i need to use a select in every insert to get the ID of the role.
the names of each role are for starters, we can change them later if needed.
insert "ליאם אביבי" as the system administrator
insert "אילה קריץ" as the technical coordinator
insert "טל לנגרמן" as the volunteer coordinator
insert "ליה צוהר" as the families coordinator
insert "יובל ברגיל" as the tutors coordinator
insert "נבו גיבלי" as the matures coordinator
insert "אור גולן" as the healthy kids coordinator
insert "אביגיל גרינברג" as a general volunteer
insert "אורי כהן" as a tutor

use a select in evert insert to ensure the correct role_id is used.


```sql
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('admin', '111', (SELECT id FROM childsmile_app_role WHERE role_name = 'System Administrator'), 'sysadminmini@mail.com', 'admini', 'strator', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('ליאם_אביבי', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'System Administrator'), 'sysadmin@mail.com', 'ליאם', 'אביבי', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('אילה_קריץ', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Technical Coordinator'), 'tech@mail.com', 'אילה', 'קריץ', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('טל_לנגרמן', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Volunteer Coordinator'), 'volun@mail.com', 'טל', 'לנגרמן', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('ליה_צוהר', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Families Coordinator'), 'family@mail.com', 'ליה', 'צוהר', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('יובל_ברגיל', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutors Coordinator'), 'tutors@mail.com', 'יובל', 'ברגיל', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('נבו_גיבלי', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Matures Coordinator'), 'matures@mail.com', 'נבו', 'גיבלי', current_timestamp);
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)    
VALUES ('אור_גולן', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Healthy Kids Coordinator'), 'healthy@mail.com', 'אור', 'גולן', current_timestamp);

--- select to see results of previous inserts
SELECT * FROM childsmile_app_staff;
```

----------------------------TODO: USE CURSOR TO INSERT INTO childsmile_app_staff with an obejct of the whole transaction to be able to use the ID of the signedup table
when we DEV the code in BE so to refer the correct record in the referred tables--------------------------------------------------------------------



### childsmile_app_signedup - Insert example of a signed up volunteer - 3 records - they do not want to be tutors
## after that need to insert to all the related tables - childsmile_app_general_volunteer, childsmile_app_staff - using the data from the signedup table

INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('אורי_כהן', '1234', (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor'), 'urico@mail.com', 'אורי', 'כהן', current_timestamp);
Table schema
    id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    first_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    surname character varying(255) COLLATE pg_catalog."default" NOT NULL,
    age integer NOT NULL,
    gender boolean NOT NULL,
    phone character varying(20) COLLATE pg_catalog."default" NOT NULL,
    city character varying(255) COLLATE pg_catalog."default" NOT NULL,
    comment text COLLATE pg_catalog."default",
    email character varying(254) COLLATE pg_catalog."default",
    want_tutor boolean NOT NULL,
    CONSTRAINT childsmile_app_signedup_pkey PRIMARY KEY (id)
```sql
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('אביגיל', 'גרינברג', 25, TRUE, '052-1234567', 'תל אביב', '', 'aviga@mail.com', FALSE);
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('דוד','מנחם', 30, FALSE, '052-1234567', 'ירושלים', '', 'davim@mail.com', FALSE);
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('חוני', 'המעגל', 19, FALSE, '052-1234567', 'חיפה', '', 'circle@mail.com', FALSE);
```

### insert into staff table respecting the foreign key constraint and using the data from childsmile_app_signedup
```sql
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'General Volunteer') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'אביגיל' AND surname = 'גרינברג';
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'General Volunteer') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'דוד' AND surname = 'מנחם';
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'General Volunteer') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'חוני' AND surname = 'המעגל';
```


### insert to childsmile_app_general_volunteer respecting the foreign key constraint and using the data from childsmile_app_signedup
### general_volunteer schema
    id_id integer NOT NULL,
    staff_id integer NOT NULL,
    signupdate date NOT NULL,
    comments text COLLATE pg_catalog."default",
    CONSTRAINT childsmile_app_general_volunteer_pkey PRIMARY KEY (id_id),
    CONSTRAINT childsmile_app_gener_id_id_0f1642ef_fk_childsmil FOREIGN KEY (id_id)
        REFERENCES public.childsmile_app_signedup (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_gener_staff_id_ad1c342d_fk_childsmil FOREIGN KEY (staff_id)
        REFERENCES public.childsmile_app_staff (staff_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
```sql
INSERT INTO childsmile_app_general_volunteer (id_id, staff_id, signupdate, comments)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'אביגיל' AND surname = 'גרינברג') AS id_id,
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'אביגיל' AND last_name = 'גרינברג') AS staff_id,
    current_date AS signupdate,
    '' AS comments
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'אביגיל' AND surname = 'גרינברג');
INSERT INTO childsmile_app_general_volunteer (id_id, staff_id, signupdate, comments)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'דוד' AND surname = 'מנחם') AS id_id,
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'דוד' AND last_name = 'מנחם') AS staff_id,
    current_date AS signupdate,
    '' AS comments
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'דוד' AND surname = 'מנחם');
INSERT INTO childsmile_app_general_volunteer (id_id, staff_id, signupdate, comments)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'חוני' AND surname = 'המעגל') AS id_id,
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'חוני' AND last_name = 'המעגל') AS staff_id,
    current_date AS signupdate,
    '' AS comments
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'חוני' AND surname = 'המעגל');
```

### now we will insert into pending tutor similar to the way we did with general volunteer
### this means we will insert into childsmile_app_signedup, childsmile_app_staff, childsmile_app_pending_tutor
### we will use the data from childsmile_app_signedup to insert into childsmile_app_staff and childsmile_app_pending_tutor
```sql
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('אורי', 'כהן', 20, TRUE, '052-1234567', 'תל אביב', '', 'urico@mail.com', TRUE);
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('שלהבת', 'רווח', 30, FALSE, '052-9234567', 'ירושלים', '', 'shaler@mail.com', TRUE);
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('גיל', 'ורהפטיג', 19, FALSE, '052-8234567', 'חיפה', '', 'gilva@mail.com', TRUE);
```
## insert into staff table respecting the foreign key constraint and using the data from childsmile_app_signedup
```sql
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'אורי' AND surname = 'כהן';
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'שלהבת' AND surname = 'רווח';
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'גיל' AND surname = 'ורהפטיג';
```

## insert into childsmile_app_pending_tutor respecting the foreign key constraint and using the data from childsmile_app_signedup
## table schema
    pending_tutor_id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    id_id integer NOT NULL,
    pending_status character varying(255) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT childsmile_app_pending_tutor_pkey PRIMARY KEY (pending_tutor_id),
    CONSTRAINT childsmile_app_pendi_id_id_f8d114a6_fk_childsmil FOREIGN KEY (id_id)
        REFERENCES public.childsmile_app_signedup (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
```sql
INSERT INTO childsmile_app_pending_tutor (id_id, pending_status)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'אורי' AND surname = 'כהן') AS id_id,
    'ממתין' AS pending_status
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'אורי' AND surname = 'כהן');
INSERT INTO childsmile_app_pending_tutor (id_id, pending_status)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'שלהבת' AND surname = 'רווח') AS id_id,
    'ממתין' AS pending_status
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'שלהבת' AND surname = 'רווח');
INSERT INTO childsmile_app_pending_tutor (id_id, pending_status)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'גיל' AND surname = 'ורהפטיג') AS id_id,
    'ממתין' AS pending_status
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'גיל' AND surname = 'ורהפטיג');
```

### just to be clear  - all inserts are used also to brainstorm the process of the application
### so we can see that we undrestand the process and the data flow
### which means we now have a general volunteer and a tutor waiting for approval
### so we need another set of inserts to create pending tutors
### but then we will need to approve the tutor which means an insert into childsmile_app_tutors
### with tutoring status from the enum 'אין_חניך'
### and then delete the pending tutor record
### so the flow is - insert signedup, insert staff, insert pending tutor, update pending_tutor pending_status, insert tutor, delete pending tutor
### we will create a new tutor named "נועה רוזנבלום" and approve her
###  tutors tables schema
    id_id integer NOT NULL,
    staff_id integer NOT NULL,
    tutorship_status character varying(255) COLLATE pg_catalog."default" NOT NULL,
    preferences text COLLATE pg_catalog."default",
    tutor_email character varying(254) COLLATE pg_catalog."default",
    relationship_status character varying(255) COLLATE pg_catalog."default",
    tutee_wellness character varying(255) COLLATE pg_catalog."default",
    CONSTRAINT childsmile_app_tutors_pkey PRIMARY KEY (id_id),
    CONSTRAINT childsmile_app_tutor_id_id_8d3a8a63_fk_childsmil FOREIGN KEY (id_id)
        REFERENCES public.childsmile_app_signedup (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_tutor_staff_id_f4b4ad42_fk_childsmil FOREIGN KEY (staff_id)
        REFERENCES public.childsmile_app_staff (staff_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
```sql
--- Create a new tutor named "נועה רוזנבלום" and approve her
-- insert signedup
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('נועה', 'רוזנבלום', 22, TRUE, '052-1234567', 'חברון', '', 'noar@mail.com', TRUE);
-- insert staff
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'נועה' AND surname = 'רוזנבלום';
-- insert pending tutor
INSERT INTO childsmile_app_pending_tutor (id_id, pending_status)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'נועה' AND surname = 'רוזנבלום') AS id_id,
    'ממתין' AS pending_status
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'נועה' AND surname = 'רוזנבלום');
-- update pending tutor
UPDATE childsmile_app_pending_tutor
SET pending_status = 'מאושר'
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'נועה' AND surname = 'רוזנבלום');
-- insert tutor
INSERT INTO childsmile_app_tutors (id_id, staff_id, tutorship_status, preferences, tutor_email, relationship_status, tutee_wellness)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'נועה' AND surname = 'רוזנבלום') AS id_id,
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'נועה' AND last_name = 'רוזנבלום') AS staff_id,
    'אין_חניך' AS tutorship_status,
    '' AS preferences,
    (select email from childsmile_app_staff where first_name = 'נועה' AND last_name = 'רוזנבלום') AS tutor_email,
    '' AS relationship_status,
    '' AS tutee_wellness
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'נועה' AND surname = 'רוזנבלום');
-- delete pending tutor
DELETE FROM childsmile_app_pending_tutor
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'נועה' AND surname = 'רוזנבלום');

-- select all above tables to see the results every step of the way
SELECT * FROM childsmile_app_signedup;
SELECT * FROM childsmile_app_staff;
SELECT * FROM childsmile_app_pending_tutor;
SELECT * FROM childsmile_app_tutors;
```
--- Create a new tutor named "אביטל גולדשטיין" and approve her
-- insert signedup
```sql
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('אביטל', 'גולדשטיין', 22, TRUE, '053-9876543', 'עכו', '', 'avigold@mail.com', TRUE);
-- insert staff
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'אביטל' AND surname = 'גולדשטיין';
-- insert pending tutor
INSERT INTO childsmile_app_pending_tutor (id_id, pending_status)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'אביטל' AND surname = 'גולדשטיין') AS id_id,
    'ממתין' AS pending_status
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'אביטל' AND surname = 'גולדשטיין');
-- update pending tutor
UPDATE childsmile_app_pending_tutor
SET pending_status = 'מאושר'
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אביטל' AND surname = 'גולדשטיין');
-- insert tutor
INSERT INTO childsmile_app_tutors (id_id, staff_id, tutorship_status, preferences, tutor_email, relationship_status, tutee_wellness)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'אביטל' AND surname = 'גולדשטיין') AS id_id,
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'אביטל' AND last_name = 'גולדשטיין') AS staff_id,
    'אין_חניך' AS tutorship_status,
    '' AS preferences,
    (select email from childsmile_app_staff where first_name = 'אביטל' AND last_name = 'גולדשטיין') AS tutor_email,
    '' AS relationship_status,
    '' AS tutee_wellness
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'אביטל' AND surname = 'גולדשטיין');
-- delete pending tutor
DELETE FROM childsmile_app_pending_tutor
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אביטל' AND surname = 'גולדשטיין');
```

### now as some 'rest' needed lol, i want to insert data into tasks table but 1st we need to insert into task_types
### task_types schema
    id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    task_type character varying(255) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT childsmile_app_task_types_pkey PRIMARY KEY (id),
    CONSTRAINT childsmile_app_task_types_task_type_key UNIQUE (task_type)

### These are the 1st task types we will insert
                    ('Candidate Interview for Tutoring', 'Candidate Interview for Tutoring'),
                    ('Adding a Tutor', 'Adding a Tutor'),
                    ('Matching a Tutee', 'Matching a Tutee'),
                    ('Adding a Family', 'Adding a Family'),
                    ('Family Status Check', 'Family Status Check'),
                    ('Family Update', 'Family Update'),
                    ('Family Deletion', 'Family Deletion'),
                    ('Adding a Healthy Member', 'Adding a Healthy Member'),
                    ('Reviewing a Mature Individual', 'Reviewing a Mature Individual'),
                    ('Tutoring', 'Tutoring'),
                    ('Tutoring Feedback', 'Tutoring Feedback'),
                    ('Reviewing Tutor Feedback', 'Reviewing Tutor Feedback'),
                    ('General Volunteer Feedback', 'General Volunteer Feedback'),
                    ('Reviewing General Volunteer Feedback', 'Reviewing General Volunteer Feedback'),
                    ('Feedback Report Generation', 'Feedback Report Generation')
type should be in Hebrew
```sql
INSERT INTO childsmile_app_task_types (task_type) VALUES ('ראיון מועמד לחונכות');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('הוספת חונך');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('התאמת חניך');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('הוספת משפחה');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('בדיקת מצב משפחה');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('עדכון משפחה');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('מחיקת משפחה');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('הוספת בריא');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('סקירת בוגר');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('חונכות');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('משוב חונך');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('סקירת משוב חונך');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('משוב מתנדב כללי');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('סקירת משוב מתנדב כללי');
INSERT INTO childsmile_app_task_types (task_type) VALUES ('יצירת דוח משוב');
```
### now we can insert into tasks table
    task_id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    description text COLLATE pg_catalog."default" NOT NULL,
    due_date date NOT NULL,
    status character varying(255) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    assigned_to_id integer NOT NULL,
    related_child_id integer,
    related_tutor_id integer,
    task_type_id integer NOT NULL,
    CONSTRAINT childsmile_app_tasks_pkey PRIMARY KEY (task_id),
    CONSTRAINT childsmile_app_tasks_assigned_to_id_f6c2927f_fk_childsmil FOREIGN KEY (assigned_to_id)
        REFERENCES public.childsmile_app_staff (staff_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_tasks_related_child_id_4b83f3da_fk_childsmil FOREIGN KEY (related_child_id)
        REFERENCES public.childsmile_app_children (child_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_tasks_related_tutor_id_b1f0f8a1_fk_childsmil FOREIGN KEY (related_tutor_id)
        REFERENCES public.childsmile_app_tutors (id_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_tasks_task_type_id_6488db31_fk_childsmil FOREIGN KEY (task_type_id)
        REFERENCES public.childsmile_app_task_types (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
```sql
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('ראיון מועמד לחונכות', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'יובל' AND last_name = 'ברגיל'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'ראיון מועמד לחונכות'));
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('הוספת חונך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'יובל' AND last_name = 'ברגיל'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'הוספת חונך'));
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('התאמת חניך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'יובל' AND last_name = 'ברגיל'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'התאמת חניך'));
-- הוספת משפחה - Adding a Family - ליה צוהר
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('הוספת משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'ליה' AND last_name = 'צוהר'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'הוספת משפחה'));
-- בדיקת מצב משפחה - Family Status Check - ליה צוהר 
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('בדיקת מצב משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'ליה' AND last_name = 'צוהר'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'בדיקת מצב משפחה'));
-- עדכון משפחה - Family Update - ליה צוהר
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('עדכון משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'ליה' AND last_name = 'צוהר'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'עדכון משפחה'));
-- מחיקת משפחה - Family Deletion - ליה צוהר
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('מחיקת משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'ליה' AND last_name = 'צוהר'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'מחיקת משפחה'));
-- הוספת בריא - Adding a Healthy Member - אור גולן
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('הוספת בריא', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'אור' AND last_name = 'גולן'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'הוספת בריא'));
-- סקירת בוגר - Reviewing a Mature Individual - נבו גיבלי   
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('סקירת בוגר', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'נבו' AND last_name = 'גיבלי'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'סקירת בוגר'));
-- חונכות - Tutoring - task for an approved tutor
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('חונכות', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'נועה' AND last_name = 'רוזנבלום'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'חונכות'));
-- משוב חונך - Tutoring Feedback - task for an approved tutor
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('משוב חונך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'נועה' AND last_name = 'רוזנבלום'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'משוב חונך'));
-- סקירת משוב חונך - Reviewing Tutor Feedback - task for a coordinator
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('סקירת משוב חונך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'יובל' AND last_name = 'ברגיל'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'סקירת משוב חונך'));
-- משוב מתנדב כללי - General Volunteer Feedback - task for a general volunteer
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('משוב מתנדב כללי', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'אביגיל' AND last_name = 'גרינברג'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'משוב מתנדב כללי'));
-- סקירת משוב מתנדב כללי - Reviewing General Volunteer Feedback - task for a coordinator -- טל לנגרמן
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('סקירת משוב מתנדב כללי', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'טל' AND last_name = 'לנגרמן'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'סקירת משוב מתנדב כללי'));
-- יצירת דוח משוב - Feedback Report Generation - task for a coordinator -- טל לנגרמן
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('יצירת דוח משוב', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'טל' AND last_name = 'לנגרמן'), (SELECT id FROM childsmile_app_task_types WHERE task_type = 'יצירת דוח משוב'));
-- replicate all tasks above for user admin
-- ראיון מועמד לחונכות - Candidate Interview for Tutoring
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('ראיון מועמד לחונכות', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'ראיון מועמד לחונכות'));

-- הוספת חונך - Adding a Tutor
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('הוספת חונך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'הוספת חונך'));

-- התאמת חניך - Matching a Tutee
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('התאמת חניך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'התאמת חניך'));

-- הוספת משפחה - Adding a Family
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('הוספת משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'הוספת משפחה'));

-- בדיקת מצב משפחה - Family Status Check
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('בדיקת מצב משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'בדיקת מצב משפחה'));

-- עדכון משפחה - Family Update
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('עדכון משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'עדכון משפחה'));

-- מחיקת משפחה - Family Deletion
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('מחיקת משפחה', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'מחיקת משפחה'));

-- הוספת בריא - Adding a Healthy Member
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('הוספת בריא', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'הוספת בריא'));

-- סקירת בוגר - Reviewing a Mature Individual
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('סקירת בוגר', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'סקירת בוגר'));

-- חונכות - Tutoring
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('חונכות', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'חונכות'));

-- משוב חונך - Tutoring Feedback
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('משוב חונך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'משוב חונך'));

-- סקירת משוב חונך - Reviewing Tutor Feedback
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('סקירת משוב חונך', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'סקירת משוב חונך'));

-- משוב מתנדב כללי - General Volunteer Feedback
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('משוב מתנדב כללי', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'משוב מתנדב כללי'));

-- סקירת משוב מתנדב כללי - Reviewing General Volunteer Feedback
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('סקירת משוב מתנדב כללי', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'סקירת משוב מתנדב כללי'));

-- יצירת דוח משוב - Feedback Report Generation
INSERT INTO childsmile_app_tasks (description, due_date, status, created_at, updated_at, assigned_to_id, task_type_id)
VALUES ('יצירת דוח משוב', '2021-12-31', 'לא הושלמה', current_timestamp, current_timestamp, 
(SELECT staff_id FROM childsmile_app_staff WHERE username = 'admin'), 
(SELECT id FROM childsmile_app_task_types WHERE task_type = 'יצירת דוח משוב'));
```

### now we will insert into childsmile_app_children - these are not tutors or volunteers but sick children
### must not use any names we used already
### we will insert 9 children - 3 unhealthy ages 10,11,12, 3 healthy ages 12,13,14, 3 mature individuals ages 18,19,20
### table schema  childsmile_app_children
    child_id integer NOT NULL,
    childfirstname character varying(255) COLLATE pg_catalog."default" NOT NULL,
    childsurname character varying(255) COLLATE pg_catalog."default" NOT NULL,
    registrationdate date NOT NULL,
    lastupdateddate date NOT NULL,
    gender boolean NOT NULL,
    responsible_coordinator character varying(255) COLLATE pg_catalog."default" NOT NULL,
    city character varying(255) COLLATE pg_catalog."default" NOT NULL,
    child_phone_number character varying(20) COLLATE pg_catalog."default" NOT NULL,
    treating_hospital character varying(255) COLLATE pg_catalog."default" NOT NULL,
    date_of_birth date NOT NULL,
    medical_diagnosis character varying(255) COLLATE pg_catalog."default",
    diagnosis_date date,
    marital_status character varying(50) COLLATE pg_catalog."default" NOT NULL,
    num_of_siblings integer NOT NULL,
    details_for_tutoring text COLLATE pg_catalog."default" NOT NULL,
    additional_info text COLLATE pg_catalog."default",
    tutoring_status character varying(50) COLLATE pg_catalog."default" NOT NULL,
    current_medical_state character varying(255) COLLATE pg_catalog."default",
    when_completed_treatments date,
    father_name character varying(255) COLLATE pg_catalog."default",
    father_phone character varying(20) COLLATE pg_catalog."default",
    mother_name character varying(255) COLLATE pg_catalog."default",
    mother_phone character varying(20) COLLATE pg_catalog."default",
    street_and_apartment_number character varying(255) COLLATE pg_catalog."default",
    expected_end_treatment_by_protocol date,
    has_completed_treatments boolean,
    CONSTRAINT childsmile_app_children_pkey PRIMARY KEY (child_id)
```sql
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments) 
VALUES ( 352233211, 'אביגיל', 'גולדשטיין', current_timestamp, current_timestamp, TRUE, 'ליה צוהר', 'עכו', '050-3334567', 'רמבם', '2015-01-01', 'לוקמיה', '2021-12-31', 'נשואים', 2, 'פרטים לחונכות', 'מידע נוסף', 'למצוא_חונך', 'התחיל כימותרפיה', NULL, 'אהרון', '050-1234567', 'צילה', '050-7654321', 'יוסף גדיש 12', '2023-12-31', FALSE);
-- now insert 2 more sick children
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments)
VALUES ( 352233212, 'אביתר', 'אזולאי', current_timestamp, current_timestamp, FALSE, 'ליה צוהר', 'רמת גן', '050-3324561', 'שיבא', '2014-01-01', 'לימפומה', '2021-12-31', 'גרושים', 3, '', '', 'לא_רוצים', 'התחיל כימותרפיה', NULL, 'אזר', '050-1234567', 'שרה', '050-7654321', 'ביאליק 32', '2023-12-31', FALSE);
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments)
VALUES ( 352233213, 'אפרים', 'ביטון', current_timestamp, current_timestamp, FALSE, 'ליה צוהר', 'חולון', '050-3331567', 'שניידר', '2013-01-01', 'מדובלסטומה', '2021-12-31', 'אין', 4, '', '', 'למצוא_חונך_בעדיפות_גבוה', 'התחיל כימותרפיה', NULL, 'אברהם', '050-1234567', 'שרה', '050-7654321', 'סוקולוב 50', '2023-12-31', FALSE);

--- now 3 healthy children - it means insert to childsmile_app_children' then add to childsmile_app_healthy then update the childsmile_app_children with tutoring status לא רלוונטי
-- and dont use only Askenazi names this is starting to feel racist Mr github copilot
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments)
VALUES ( 352233214, 'אבירם', 'מנגיסטה', current_timestamp, current_timestamp, FALSE, 'ליה צוהר', 'דימונה', '058-3334507', 'סורוקה', '2013-01-01', 'ניורובלסטומה', '2021-12-31', 'פרודים', 2, '', '', 'למצוא_חונך', 'התחיל הקרנות', NULL, 'אברהם', '050-1234567', 'אסתר', '050-7654321', 'המלאכה 3', '2023-12-31', FALSE);
-- now update children table in all fields that would state that the child is healthy
UPDATE childsmile_app_children
SET medical_diagnosis = 'אין',
    tutoring_status = 'לא רלוונטי',
    current_medical_state = 'בריא',
    when_completed_treatments = '2024-01-01',
    expected_end_treatment_by_protocol = '2023-12-31',
    responsible_coordinator = 'אור גולן',
    has_completed_treatments = TRUE
WHERE child_id = 352233214;
-- now insert into childsmile_app_healthy all the details of the healthy child now that we updated the children table
/*
    child_id_id integer NOT NULL,  - select from childsmile_app_children
    street_and_apartment_number character varying(255) COLLATE pg_catalog."default", select city from childsmile_app_children
    father_name character varying(255) COLLATE pg_catalog."default", - 
    father_phone character varying(20) COLLATE pg_catalog."default",
    mother_name character varying(255) COLLATE pg_catalog."default",
    mother_phone character varying(20) COLLATE pg_catalog."default",
    CONSTRAINT childsmile_app_healthy_pkey PRIMARY KEY (child_id_id),
    CONSTRAINT childsmile_app_healt_child_id_id_42cdc6e4_fk_childsmil FOREIGN KEY (child_id_id)
        REFERENCES public.childsmile_app_children (child_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
*/
INSERT INTO childsmile_app_healthy (child_id_id, street_and_apartment_number, father_name, father_phone, mother_name, mother_phone)
SELECT 
    child_id,
    street_and_apartment_number,
    father_name,
    father_phone,
    mother_name,
    mother_phone
FROM childsmile_app_children
WHERE child_id = 352233214;
-- now insert 3 mature individuals - 1st they will be inserted into childsmile_app_children as sick, then we insert or update to childsmile_app_mature every 
-- child with date_of_birth is >= 16 years ago from current date
-- insert 3 kids named רחמים אלעזר,רותם סהר, רוני יוסף בני 18 19 20
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments)
VALUES ( 352233215, 'רחמים', 'אלעזר', current_timestamp, current_timestamp, FALSE, 'ליה צוהר', 'חיפה', '050-3334567', 'רמבם', '2007-01-01', 'לוקמיה', '2021-12-31', 'אין', 10, 'פרטים לחונכות', 'מידע נוסף', 'למצוא_חונך', 'התחיל כימותרפיה', NULL, '', '', '', '', 'זאב שוהם 12', '2023-12-31', FALSE);
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments)
VALUES ( 352233216, 'רותם', 'סהר', current_timestamp, current_timestamp, FALSE, 'ליה צוהר', 'אשדוד', '050-3334567', 'אסותא', '2006-01-01', 'לוקמיה', '2021-12-31', 'נשואים', 10, 'פרטים לחונכות', 'מידע נוסף', 'למצוא_חונך', 'התחיל כימותרפיה', NULL, 'אבי', '052-1232267', 'אילנה', '050-7654999', 'יצחק שדה 12', '2023-12-31', FALSE);

-- now insert 3 mature individuals - select all children with date_of_birth >= 16 years ago from current date - if not already in childsmile_app_mature
-- matures table scheme is
/*
    "timestamp" timestamp with time zone NOT NULL,
    child_id integer NOT NULL,
    full_address character varying(255) COLLATE pg_catalog."default" NOT NULL,
    current_medical_state character varying(255) COLLATE pg_catalog."default",
    when_completed_treatments date,
    parent_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    parent_phone character varying(20) COLLATE pg_catalog."default" NOT NULL,
    additional_info text COLLATE pg_catalog."default",
    general_comment text COLLATE pg_catalog."default",
    CONSTRAINT childsmile_app_matures_pkey PRIMARY KEY (child_id),
    CONSTRAINT childsmile_app_matur_child_id_ecabdd74_fk_childsmil FOREIGN KEY (child_id)
        REFERENCES public.childsmile_app_children (child_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
*/
INSERT INTO childsmile_app_matures (timestamp, child_id, full_address, current_medical_state, when_completed_treatments, parent_name, parent_phone, additional_info, general_comment)
SELECT 
    current_timestamp,
    child_id,
    street_and_apartment_number,
    current_medical_state,
    when_completed_treatments,
    CASE 
        WHEN father_name IS NOT NULL THEN father_name 
        ELSE mother_name 
    END AS parent_name,
    CASE 
        WHEN father_phone IS NOT NULL THEN father_phone 
        ELSE mother_phone 
    END AS parent_phone,
    additional_info,
    ''
FROM childsmile_app_children
WHERE EXTRACT(YEAR FROM AGE(current_date, date_of_birth))::int >= 16 
AND child_id NOT IN (SELECT child_id FROM childsmile_app_matures);
```
@todo - create tutorships, then create feedbacks, then create feedback reports - then we will be able to start DEVING the app from front to back
### now we will insert into childsmile_app_tutorships
### for that we need a match - a tutor and a child - with same gender, same city or up to 15 KM away
### we need a tutor with אין_חניך status and a child with למצוא_חונך status or למצוא_חונך_בעדיפות_גבוה status or למצוא_חונך_אין_באיזור_שלו status
### we will insert 3 tutorships
### need to make sure to insert into all the related tables in the correct order and update where needed
### the order is - insert new signedup, insert new staff, insert new pending tutor, update pending tutor, insert new tutor, delete pending tutor, insert new child that has the appropriate status, insert new tutorship
```sql
-- insert new signedup
INSERT INTO childsmile_app_signedup (first_name, surname, age, gender, phone, city, comment, email, want_tutor)
VALUES ('אלעזר', 'בוזגלו', 20, FALSE, '050-3334567', 'עכו', '','elazbu@mail.com', TRUE);
-- insert new staff
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
SELECT 
    CONCAT(first_name, '_', surname) AS username,
    '1234' AS password,
    (SELECT id FROM childsmile_app_role WHERE role_name = 'Tutor') AS role_id,
    email,
    first_name,
    surname,
    current_timestamp
FROM childsmile_app_signedup
WHERE first_name = 'אלעזר' AND surname = 'בוזגלו';
-- insert pending tutor
INSERT INTO childsmile_app_pending_tutor (id_id, pending_status)
SELECT 
    (select id from childsmile_app_signedup where first_name = 'אלעזר' AND surname = 'בוזגלו') AS id_id,
    'ממתין' AS pending_status
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו');
-- update pending tutor
UPDATE childsmile_app_pending_tutor
SET pending_status = 'מאושר'
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו');
-- insert tutor
INSERT INTO childsmile_app_tutors (id_id, staff_id, tutorship_status, preferences, tutor_email, relationship_status, tutee_wellness)
SELECT 
    (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו') AS id_id,
    (SELECT staff_id FROM childsmile_app_staff WHERE first_name = 'אלעזר' AND last_name = 'בוזגלו') AS staff_id,
    'אין_חניך' AS tutorship_status,
    '' AS preferences,
    (SELECT email FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו') AS tutor_email,
    '' AS relationship_status,
    '' AS tutee_wellness
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו');
-- delete pending tutor
DELETE FROM childsmile_app_pending_tutor
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו');
-- insert new child - at the age of 8
INSERT INTO childsmile_app_children (child_id, childfirstname, childsurname, registrationdate, lastupdateddate, gender, responsible_coordinator, city, child_phone_number, treating_hospital, date_of_birth, medical_diagnosis, diagnosis_date, marital_status, num_of_siblings, details_for_tutoring, additional_info, tutoring_status, current_medical_state, when_completed_treatments, father_name, father_phone, mother_name, mother_phone, street_and_apartment_number, expected_end_treatment_by_protocol, has_completed_treatments)
VALUES(3522332129, 'שמעון','כהן', current_timestamp, current_timestamp, FALSE, 'ליה צוהר', 'עכו', '052-3834567', 'אסותא חיפה', '2017-01-01', 'לוקמיה', '2021-12-31', 'נשואים', 2, 'פרטים לחונכות', 'מידע נוסף', 'למצוא_חונך', 'התחיל כימותרפיה', NULL, 'דני', '050-1034567', 'מאשה', '050-7454321', 'ביאליק 44', '2023-12-31', FALSE);
-- insert new possible matches
INSERT INTO childsmile_app_possiblematches (child_id, tutor_id, child_full_name, tutor_full_name, child_city, tutor_city,child_age, tutor_age, distance_between_cities, grade, is_used)
SELECT 
    child.child_id,
    tutor.id_id,
    CONCAT(child.childfirstname, ' ', child.childsurname),
    CONCAT(signedup.first_name, ' ', signedup.surname),
    child.city,
    signedup.city,
    -- insert calculated child age using date_of_birth
    EXTRACT(YEAR FROM AGE(current_date, date_of_birth))::int,
    -- get tutor age from signedup table
    signedup.age,
    0,
    100,
    FALSE
FROM childsmile_app_children child
JOIN childsmile_app_signedup signedup ON child.city = signedup.city AND child.gender = signedup.gender
JOIN childsmile_app_tutors tutor ON signedup.id = tutor.id_id
GROUP BY tutor.id_id, child.child_id, child.childfirstname, child.childsurname, signedup.first_name, signedup.surname, child.city, signedup.city, signedup.age;
/*consider indexing when coding BE
CREATE INDEX idx_child_city ON childsmile_app_children (city);
CREATE INDEX idx_child_gender ON childsmile_app_children (gender);
CREATE INDEX idx_signedup_city ON childsmile_app_signedup (city);
CREATE INDEX idx_signedup_gender ON childsmile_app_signedup (gender);
CREATE INDEX idx_tutor_id ON childsmile_app_tutors (id_id);
*/
--Select to get all data from both tables with the id keys
--Select Query to show all data of child and tutor
SELECT 
    pm.match_id,
    pm.child_id,
    pm.tutor_id,
    pm.child_full_name,
    pm.tutor_full_name,
    pm.child_city,
    pm.tutor_city,
    pm.child_age,
    pm.tutor_age,
    pm.distance_between_cities,
    pm.grade,
    pm.is_used,
    child.registrationdate,
    child.lastupdateddate,
    child.gender AS child_gender,
    child.responsible_coordinator,
    child.child_phone_number,
    child.treating_hospital,
    child.date_of_birth,
    child.medical_diagnosis,
    child.diagnosis_date,
    child.marital_status,
    child.num_of_siblings,
    child.details_for_tutoring,
    child.additional_info AS child_additional_info,
    child.tutoring_status,
    child.current_medical_state,
    child.when_completed_treatments,
    child.father_name,
    child.father_phone,
    child.mother_name,
    child.mother_phone,
    child.street_and_apartment_number,
    child.expected_end_treatment_by_protocol,
    child.has_completed_treatments,
    tutor.tutorship_status,
    tutor.preferences,
    tutor.tutor_email
FROM childsmile_app_possiblematches pm
JOIN childsmile_app_children child ON pm.child_id = child.child_id
JOIN childsmile_app_tutors tutor ON pm.tutor_id = tutor.id_id;
-- insert new tutorship all lines we want to insert from the possible matches table
/* table scheme
CREATE TABLE IF NOT EXISTS public.childsmile_app_tutorships
(
    id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    child_id integer NOT NULL,
    tutor_id integer NOT NULL,
    CONSTRAINT childsmile_app_tutorships_pkey PRIMARY KEY (id),
    CONSTRAINT childsmile_app_tutor_child_id_c85fcc79_fk_childsmil FOREIGN KEY (child_id)
        REFERENCES public.childsmile_app_children (child_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_tutor_tutor_id_f57132cc_fk_childsmil FOREIGN KEY (tutor_id)
        REFERENCES public.childsmile_app_tutors (id_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
)
*/
INSERT INTO childsmile_app_tutorships (child_id, tutor_id)
SELECT 
    pm.child_id,
    pm.tutor_id
FROM childsmile_app_possiblematches pm
WHERE is_used = FALSE
and pm.child_id = 3522332129 AND pm.tutor_id = (SELECT id_id FROM childsmile_app_tutors WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו'));
-- update possible matches
UPDATE childsmile_app_possiblematches
SET is_used = TRUE
WHERE child_id = 3522332129 AND tutor_id = (SELECT id_id FROM childsmile_app_tutors WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו'));
-- update childsmile_app_children with tutoring status יש_חונך, responsible_coordinator יובל ברגיל
UPDATE childsmile_app_children
SET tutoring_status = 'יש_חונך',
    responsible_coordinator = 'יובל ברגיל'
WHERE child_id = 3522332129;
-- update childsmile_app_tutors with tutoring status יש_חניך, relationship_status using marital_status, tutee_wellness using current_medical_state
UPDATE childsmile_app_tutors
SET tutorship_status = 'יש_חניך',
    relationship_status = (SELECT marital_status FROM childsmile_app_children WHERE child_id = 3522332129),
    tutee_wellness = (SELECT current_medical_state FROM childsmile_app_children WHERE child_id = 3522332129)
WHERE id_id = (SELECT id_id FROM childsmile_app_tutors WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'אלעזר' AND surname = 'בוזגלו'));
```
### now we need feedback from a tutor and feedback from a general volunteer
### we will insert 2 feedbacks each
### we will insert 2 feedback reports of a tutor so insert feedback table and tutorfeedback table
### we will insert 1 feedback report of a general volunteer so insert feedback table and generalvolunteerfeedback table
```sql
-- insert feedback from a tutor
/* table schemes
CREATE TABLE IF NOT EXISTS public.childsmile_app_feedback
(
    feedback_id integer NOT NULL GENERATED BY DEFAULT AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "timestamp" timestamp with time zone NOT NULL,
    event_date timestamp with time zone NOT NULL,
    staff_id integer NOT NULL,
    description text COLLATE pg_catalog."default" NOT NULL,
    exceptional_events text COLLATE pg_catalog."default",
    anything_else text COLLATE pg_catalog."default",
    comments text COLLATE pg_catalog."default",
    CONSTRAINT childsmile_app_feedback_pkey PRIMARY KEY (feedback_id),
    CONSTRAINT childsmile_app_feedb_staff_id_7b92dfbd_fk_childsmil FOREIGN KEY (staff_id)
        REFERENCES public.childsmile_app_staff (staff_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
) 
CREATE TABLE IF NOT EXISTS public.childsmile_app_general_v_feedback
(
    feedback_id_id integer NOT NULL,
    volunteer_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    volunteer_id integer NOT NULL,
    CONSTRAINT childsmile_app_general_v_feedback_pkey PRIMARY KEY (feedback_id_id),
    CONSTRAINT childsmile_app_gener_feedback_id_id_2f8585ab_fk_childsmil FOREIGN KEY (feedback_id_id)
        REFERENCES public.childsmile_app_feedback (feedback_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_gener_volunteer_id_c0260bb4_fk_childsmil FOREIGN KEY (volunteer_id)
        REFERENCES public.childsmile_app_general_volunteer (id_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
)
CREATE TABLE IF NOT EXISTS public.childsmile_app_tutor_feedback
(
    feedback_id_id integer NOT NULL,
    tutee_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    tutor_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    tutor_id integer NOT NULL,
    is_it_your_tutee boolean NOT NULL,
    is_first_visit boolean NOT NULL,
    CONSTRAINT childsmile_app_tutor_feedback_pkey PRIMARY KEY (feedback_id_id),
    CONSTRAINT childsmile_app_tutor_feedback_id_id_2664fba4_fk_childsmil FOREIGN KEY (feedback_id_id)
        REFERENCES public.childsmile_app_feedback (feedback_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT childsmile_app_tutor_tutor_id_dc401869_fk_childsmil FOREIGN KEY (tutor_id)
        REFERENCES public.childsmile_app_tutors (id_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
)

we will use django's sesssion framework to get the staff_id of the tutor and the volunteer
from django.contrib.auth import authenticate, login
from django.shortcuts import redirect
from myapp.models import Permissions

def user_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            # Retrieve and store permissions in session
            permissions = Permissions.objects.filter(role=user.role).values_list('resource', 'action')
            request.session['permissions'] = list(permissions)
            return redirect('home')
    return render(request, 'login.html')
def some_view(request):
    if 'permissions' in request.session:
        permissions = request.session['permissions']
        if ('childsmile_app_feedback', 'CREATE') in permissions:
            # User has permission to create feedback
            # Proceed with creating feedback
            pass
    else:
        # Handle case where permissions are not found in session
        pass
*/
INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments)
VALUES (current_timestamp, 
-- one week before today
current_date - interval '7 days',
%(staff_id)s, 
-- some long text for description -  at least 200 words
'החונכות הייתה ממש טובה הפעם הרגשתי שלחניך היה ממש טוב', 'היה שמח', 'פעם הבאה גלידה', '');
-- insert tutor feedback
INSERT INTO childsmile_app_tutor_feedback (feedback_id_id, tutee_name, tutor_name, tutor_id, is_it_your_tutee, is_first_visit)
VALUES (
 (SELECT feedback_id FROM childsmile_app_feedback WHERE staff_id = %(staff_id)s AND "timestamp" = (SELECT MAX("timestamp") FROM childsmile_app_feedback WHERE staff_id = %(staff_id)s)),
-- get the exact tutor since we might have more than one tutor with the same name
-- we will ensure its the tutor that filled up the feedback by using the staff_id from the feedback
 (SELECT CONCAT(childfirstname, ' ', childsurname) FROM childsmile_app_children WHERE child_id = (SELECT child_id FROM childsmile_app_tutorships WHERE tutor_id = (SELECT id_id FROM childsmile_app_tutors WHERE staff_id = %(staff_id)s))),
-- tutor name from childsmile_app_tutors 
(SELECT CONCAT(first_name, ' ', last_name) FROM childsmile_app_staff WHERE staff_id = %(staff_id)s),
-- tutor id from childsmile_app_tutors
(SELECT id_id FROM childsmile_app_tutors WHERE staff_id = %(staff_id)s),
-- is it your tutee
TRUE,
-- is it first visit
FALSE);
-- now insert feedback from a general volunteer
INSERT INTO childsmile_app_feedback ("timestamp", event_date, staff_id, description, exceptional_events, anything_else, comments)
VALUES (current_timestamp,
-- one week before today
current_date - interval '7 days',
%(staff_id)s,
-- some long text for description -  at least 200 words
'היה אירוע מרגש','היה שמח', 'פעם הבאה גלידה', '');
-- insert general volunteer feedback
INSERT INTO childsmile_app_general_v_feedback (feedback_id_id, volunteer_name, volunteer_id)
VALUES (
 (SELECT feedback_id FROM childsmile_app_feedback WHERE staff_id = %(staff_id)s AND "timestamp" = (SELECT MAX("timestamp") FROM childsmile_app_feedback WHERE staff_id = %(staff_id)s)),
-- get the exact volunteer since we might have more than one volunteer with the same name
-- we will ensure its the volunteer that filled up the feedback by using the staff_id from the feedback
 (SELECT CONCAT(first_name, ' ', last_name) FROM childsmile_app_staff WHERE staff_id = %(staff_id)s),
-- volunteer id from childsmile_app_general_volunteer
(SELECT id_id FROM childsmile_app_general_volunteer WHERE staff_id = %(staff_id)s));
```