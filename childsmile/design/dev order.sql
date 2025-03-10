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

``` now that we created the roles and permissions, i need inserts to all other tables.
i must keep the order of the tables, because of the foreign keys. ```

Sure! Here are the SQL insert statements for the remaining tables in the correct order to maintain the foreign key constraints:
### childsmile_app_staff - Insert example of a staff member - 1 record per role

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
    email AS tutor_email,
    '' AS relationship_status,
    '' AS tutee_wellness
WHERE EXISTS (SELECT 1 FROM childsmile_app_signedup WHERE first_name = 'נועה' AND surname = 'רוזנבלום');
-- delete pending tutor
DELETE FROM childsmile_app_pending_tutor
WHERE id_id = (SELECT id FROM childsmile_app_signedup WHERE first_name = 'נועה' AND surname = 'רוזנבלום');
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
    email AS tutor_email,
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
```