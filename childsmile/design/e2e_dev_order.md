now we dev the tasks flow
currently we have GET api/tasks

we need to dev POST to create a task
we need to dev PUT to update a task
we need to dev DELETE to delete a task
we need to dev that the filter in UI shows only the tasks we want to see

1. create a task - views.py should have a new function to create a task
this is how GET looks like
```python
@csrf_exempt
@api_view(['GET'])
def get_user_tasks(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'detail': 'Authentication credentials were not provided.'}, status=403)

    # שימוש במטמון כדי להימנע מקריאות חוזרות
    cache_key = f'user_tasks_{user_id}'
    tasks_data = cache.get(cache_key)

    if not tasks_data:
        tasks = Tasks.objects.filter(assigned_to_id=user_id).select_related('task_type', 'assigned_to')
        tasks_data = [
            {
                'id': task.task_id,
                'description': task.description,
                'due_date': task.due_date.strftime('%d/%m/%Y'),
                'due_date_hebrew': get_hebrew_date(task.due_date),
                'status': task.status,
                'created': task.created_at.strftime('%d/%m/%Y'),
                'created_hebrew': get_hebrew_date(task.created_at),
                'updated': task.updated_at.strftime('%d/%m/%Y'),
                'updated_hebrew': get_hebrew_date(task.updated_at),
                'assignee': task.assigned_to.username,  # Fetch the username of the assignee
                'child': task.related_child_id,
                'tutor': task.related_tutor_id,
                'type': task.task_type_id,
            }
            for task in tasks
        ]
        cache.set(cache_key, tasks_data, timeout=300)  # שמירה במטמון ל-5 דקות

    # שליפת סוגי המשימות רק פעם אחת ולא לכל משימה
    task_types_data = cache.get('task_types_data')
    if not task_types_data:
        task_types = Task_Types.objects.all()
        task_types_data = [{'id': t.id, 'name': t.task_type} for t in task_types]
        cache.set('task_types_data', task_types_data, timeout=300)

    return JsonResponse({'tasks': tasks_data, 'task_types': task_types_data})
####################################################################################################
```
so we need to add a new function to views.py
```python
@csrf_exempt
@api_view(['POST'])
def create_task(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'detail': 'Authentication credentials were not provided.'}, status=403)

    data = json.loads(request.body)
    task = Tasks.objects.create(
        description=data['description'],
        due_date=data['due_date'],
        status="לא הושלמה",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        # the user selected by the dropdown from all the users in the system
        assigned_to_id=data['assigned_to'],
        related_child_id=data['child'],
        related_tutor_id=data['tutor'],
        task_type_id=data['type'],
    )

    return JsonResponse({'task_id': task.task_id})
```
and the url.py should have a new path
for get we have this
    path('api/tasks/', get_user_tasks, name='get_user_tasks'),
so we need to add this
```python
    path('api/tasks/create/', create_task, name='create_task'),
```
and in the frontend we have a new button to create a task but we need to make it work
this is all we have for now on this button
```html
          <div className="create-task">
            <button disabled={loading}>צור משימה חדשה</button>  {/* Disable button while loading */}
          </div>
```
we need to add a function to the button that will open a modal with the form to create a task
and will ask the user to fill the form and then will send the data to the server
and then will close the modal and refresh the tasks list
javascript
  const createTask = () => {
    // Open the modal
    // Wait for the user to fill the form
    // Send the data to the server
    // Close the modal
    // Refresh the tasks list
  }
the code of that modal should be in the same file as the button

need to add the css for the modal
```css
.modal {
  display: none;
  position: fixed;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
  background-color: #fefefe;
  margin: 15% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
}

.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
```

need to add the javascript to open the modal, show the form for creating a task, and handle the submission of the form to the server.
the fields that will be available to fill in the 
description= free text
        due_date=using a date selector 
        status=will be dont automatically by the BE so FE will not be able to set it since no need
        created_at=will be dont automatically by the BE so FE will not be able to set it since no need
        updated_at=will be dont automatically by the BE so FE will not be able to set it since no need
        assigned_to_id=user should be able to select user from the list of users  - dropdown will show all users in the system
        and on the user logged it will show "אני" - this will be the default selection
        the dropdown will allow user selection and will be populated from the backend and will have a search functionality since we might have a lot of users
        each user will have its role with a hyphen next to him
        roles will be translated in UI  - neeed to add to i18n file the list of all roles and translate them
        the user in UI will be firstname SPACE lastname and not the username
        related_child_id=dropdown will show all children from DB, firstname SPACE lastname hyphen tutoring_status 
        related_tutor_id=dropdown will show all tutors from DB, firstname SPACE lastname hyphen tutorship_status
        task_type_id=dropdown will show all task types from DB, name of the task type only 
remember that the dropdowns should be searchable
remember that the dropdowns should be populated from the backend
remember that the dropdowns should be translated in UI
remember that we use axios to send the data to the server
```
  const createTask = () => {
    // Open the modal
    document.getElementById('create-task-modal').style.display = 'block';
    // Wait for the user to fill the form
    // Send the data to the server
    // Close the modal
    // Refresh the tasks list
  }

  const submitTask = () => {
    const description = document.getElementById('description').value;
    const due_date = document.getElementById('due_date').value;
    const assigned_to = document.getElementById('assigned_to').value;
    const child = document.getElementById('child').value;
    const tutor = document.getElementById('tutor').value;
    const type = document.getElementById('type').value;

    axios.post('/api/tasks/create/', {
      description,
      due_date,
      assigned_to,
      child,
      tutor,
      type,
    }).then((response) => {
      // Close the modal
      document.getElementById('create-task-modal').style.display = 'none';
      // Refresh the tasks list
    });
  }
```
create the form that the user will see including the GET requests needed to fill the dropdowns
api call to get all users
```python
@csrf_exempt
@api_view(['GET'])
def get_users(request): 
# get all users from the DB by selecting staff table, i need first name, last name, and role name by join from role table
# since we only have role_id in staff table
  users = Staff.objects.select_related('role').all()
  users_data = [{'id': u.id, 'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'role': u.role.role_name} for u in users]
  return JsonResponse({'users': users_data})
```
need to have api calls to get all tutors and another to get all children
```python
@csrf_exempt
@api_view(['GET'])
def get_children(request):
    # get all children from the DB, i need first name, last name, and tutoring status
    children = Child.objects.all()
    children_data = [{'id': c.id, 'first_name': c.first_name, 'last_name': c.last_name, 'tutoring_status': c.tutoring_status} for c in children]
    return JsonResponse({'children': children_data})

@csrf_exempt
@api_view(['GET'])
def get_tutors(request):
    # get all tutors from the DB, i need first name, last name, and tutorship status
    tutors = Staff.objects.filter(role_id=(Role.objects.get(role_name='tutor').id))
    tutors_data = [{'id': t.id, 'first_name': t.first_name, 'last_name': t.last_name, 'tutorship_status': t.tutorship_status} for t in tutors]
    return JsonResponse({'tutors': tutors_data})
```
need to add the new paths to the urls.py
```python
    path('api/staff/', get_staff, name='get_staff'),
    path('api/children/', get_children, name='get_children'),
    path('api/tutors/', get_tutors, name='get_tutors'),
```

now we need to a function to get the staff, a function to get the children and a function to get the tutors
```javascript
  const getStaff = () => {
    axios.get('/api/staff/').then((response) => {
      const staff = response.data.staff;
      const assigned_to = document.getElementById('assigned_to');
      staff.forEach((s) => {
        const option = document.createElement('option');
        option.value = s.id;
        option.text = `${s.first_name} ${s.last_name} - ${s.role}`;
        assigned_to.add(option);
      });
    });
  }

  const getChildren = () => {
    axios.get('/api/children/').then((response) => {
      const children = response.data.children;
      const child = document.getElementById('child');
      children.forEach((c) => {
        const option = document.createElement('option');
        option.value = c.id;
        option.text = `${c.first_name} ${c.last_name} - ${c.tutoring_status}`;
        child.add(option);
      });
    });
  }

  const getTutors = () => {
    axios.get('/api/tutors/').then((response) => {
      const tutors = response.data.tutors;
      const tutor = document.getElementById('tutor');
      tutors.forEach((t) => {
        const option = document.createElement('option');
        option.value = t.id;
        option.text = `${t.first_name} ${t.last_name} - ${t.tutorship_status}`;
        tutor.add(option);
      });
    });
  }
```
need to call these functions when the page loads
```javascript
  useEffect(() => {
    getStaff();
    getChildren();
    getTutors();
  }, []);
```
need to add the form to the modal
```html
    <div className="modal" id="create-task-modal">
      <div className="modal-content">
        <span className="close" onClick={() => document.getElementById('create-task-modal').style.display = 'none'}>&times;</span>
        <h2>יצירת משימה חדשה</h2>
        <label>תיאור</label>
        <input type="text" id="description" />
        <label>תאריך סופי לביצוע</label>
        <input type="date" id="due_date" />
        <label>משוייך ל</label>
        <select id="assigned_to">
          {/* The options will be added by the getStaff function */}
          {/* add a dropdown with the users in the system */}
        </select>
        <label>ילד</label>
        <select id="child">
          {/* The options will be added by the getChildren function */}
        </select>
        <label>חונך</label>
        <select id="tutor">
          {/* The options will be added by the getTutors function */}
        </select>
        <label>סוג משימה</label>
        <select id="type">
          {/* The options will be added by the getTaskTypes function */}
        </select>
        <button onClick={submitTask}>צור</button>
      </div>
    </div>
```

