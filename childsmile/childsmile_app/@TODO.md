@TODO
fix the following issues:
need more than one date filters set on feedback reports



i wanna add 2 columns in task_type

we GET the task types when getting tasks
this is alreday done
we also get the permissions of the user when he logs in

we NEED to 2 new columns
resource, action
and fill them with the reosuce relavnt to the task

so we need 
migration with insertion of specific values  - for each type, model update, view of get_user_tasks, fill the task types that are shown in the tasktypes dropdown according the permissions of the logged in user

SO every user sees, can create or edit only the types he is allowed to

lets go slow

# 0018_add_res_act_to_task_types.py
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0017_add_approval_to_tutoships"),
    ]

    operations = [
        migrations.AddField(

        ),
        migrations.AddField(

        ),
    ]

    before u answer any of the rest lets do the migration
