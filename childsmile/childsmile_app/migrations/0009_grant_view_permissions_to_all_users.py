# 0009_grant_view_permissions_to_all_users.py
'''
after running  0008, we need to grant view permissions to all users
guideline for this migration is this insert statement
INSERT INTO childsmile_app_permissions (role_id, resource, action) VALUES ((SELECT id FROM childsmile_app_role WHERE role_name='Technical Coordinator'), 'childsmile_app_staff', 'VIEW');
need to check if the role exists in the permissions table with resource childsmile_app_staff and action VIEW
if not exists, then insert the record

also do same for all tables in the database - give view permissions to all roles
childsmile_app_children           | 
childsmile_app_feedback           
childsmile_app_general_v_feedback 
childsmile_app_general_volunteer  
childsmile_app_healthy            
childsmile_app_matures            
childsmile_app_pending_tutor      
childsmile_app_permissions        
childsmile_app_possiblematches    
childsmile_app_role               
childsmile_app_signedup           
childsmile_app_staff              
childsmile_app_task_types         
childsmile_app_tasks              
childsmile_app_tutor_feedback     
childsmile_app_tutors             
childsmile_app_tutorships                            
'''
from django.db import migrations

def grant_view_permissions_to_all_roles(apps, schema_editor):
    Role = apps.get_model('childsmile_app', 'Role')
    Permissions = apps.get_model('childsmile_app', 'Permissions')
    roles = Role.objects.all()
    resources = ['childsmile_app_staff', 'childsmile_app_children', 'childsmile_app_feedback', 'childsmile_app_general_v_feedback', 'childsmile_app_general_volunteer', 'childsmile_app_healthy', 'childsmile_app_matures', 'childsmile_app_pending_tutor', 'childsmile_app_permissions', 'childsmile_app_possiblematches', 'childsmile_app_role', 'childsmile_app_signedup', 'childsmile_app_task_types', 'childsmile_app_tasks', 'childsmile_app_tutor_feedback', 'childsmile_app_tutors', 'childsmile_app_tutorships']
    for role in roles:
        for resource in resources:
            if not Permissions.objects.filter(role_id=role.id, resource=resource, action='VIEW').exists():
                Permissions.objects.create(role_id=role.id, resource=resource, action='VIEW')

                print(f"Granted VIEW permission for role {role.id} on resource {resource}")
class Migration(migrations.Migration):
    
        dependencies = [
            ('childsmile_app', '0008_alter_child_id_to_bigint'),
        ]
    
        operations = [
            migrations.RunPython(grant_view_permissions_to_all_roles),
        ]