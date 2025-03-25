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
        status=data['status'],
        created_at=datetime.now(),
        updated_at=datetime.now(),
        assigned_to_id=user_id,
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
```
the code of that modal should be in the same file as the button
```html
          <div className="create-task">
            <button disabled={loading} onClick={createTask}>צור משימה חדשה</button>  {/* Disable button while loading */}
            <div className="modal">
              <div className="modal-content">
                <span className="close">&times;</span>
                <form>
                  <label>תיאור</label>
                  <input type="text" name="description" />
                  <label>תאריך יעד</label>
                  <input type="date" name="due_date" />
                  <label>סטטוס</label>
                  <select name="status">
                    <option value="1">פתוח</option>
                    <option value="2">בטיפול</option>
                    <option value="3">סגור</option>
                  </select>
                  <label>ילד</label>
                  <select name="child">
                    {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
                  </select>
                  <label>מדריך</label>
                  <select name="tutor">
                    {tutors.map(tutor => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
                  </select>
                  <label>סוג משימה</label>
                  <select name="type">
                    {taskTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                  <button type="submit">שמור</button>
                </form>
              </div>
            </div>
          </div>
```
need to add the css for the modal
```css
.modal {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
}
need to add the javascript to open the modal
```javascript
  const createTask = () => {
    const modal = document.querySelector('.modal');
    modal.style.display = 'block';
  }
```
now we need to add the javascript to close the modal
```javascript
  const createTask = () => {
    const modal = document.querySelector('.modal');
    modal.style.display = 'block';

    const close = document.querySelector('.close');
    close.onclick = () => {
      modal.style.display = 'none';
    }
  }
```
now we need to add the javascript to send the data to the server
```javascript
  const createTask = () => {
    const modal = document.querySelector('.modal');
    modal.style.display = 'block';

    const close = document.querySelector('.close');
    close.onclick = () => {
      modal.style.display = 'none';
    }

    const form = document.querySelector('form');
    form.onsubmit = async (e) => {
      e.preventDefault();

      const data = {
        description: form.description.value,
        due_date: form.due_date.value,
        status: form.status.value,
        child: form.child.value,
        tutor: form.tutor.value,
        type: form.type.value,
      };

      const response = await fetch('/api/tasks/create/', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();
      console.log(responseData);

      modal.style.display = 'none';
    }
  }
```