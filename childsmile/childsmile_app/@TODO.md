@TODO
create family - BE POST and FE modal
  make column spread evenly in the ADD form
  make columns in INFO popup
  verify we dont validate only the really required fields in the form

  create scripts to create text files for the following:
  - treating hospital - list of all hospitals in israel - save in a text file one time
  - list of all streets in that city once selected a city - keep a dictionary of all streets
  of all cities in a text file and load it once
  
  Add to get_family_details - like we did for task_types in get tasks

      # Fetch task types only once
    task_types_data = cache.get("task_types_data")
    if not task_types_data:
        task_types = Task_Types.objects.all()
        task_types_data = [{"id": t.id, "name": t.task_type} for t in task_types]
        cache.set("task_types_data", task_types_data, timeout=300)
  marital status - list of marital statuses from DB - need to get all types of marital statuses from DB
  tutoring status - list of tutoring statuses from DB - need to get all types of tutoring statuses from DB
  
make the buttons in filkter create container bigger
EDIT family - BE PUT and FE modal
DELETE family - BE DELETE and FE toast with yes no - and undo option on next toast