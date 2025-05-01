@TODO
implement the following features:
- [ ] Matching wizard appearaence
    - [ ]  a grid container and a map container side by side
  - show grid container of possible matches but only the following columns:
    - [ ] Tutor full name
    - [ ] Child full name
    - [ ] Tutor city
    - [ ] Child city
    - [ ] Tutor age
    - [ ] Child age
    - [ ] Matching grade -which will be sortable and filterable - by default it will be sorted by the matching grade in descending order
    - the grid container should be scrollable and have a fixed height
    - [ ] Add actions column to the grid container:
        - [ ] A button to open a modal that will show all the information of the tutor and child
        in 2 columns from children and tutors tables
        - [ ] inside the modal there should be a button to create a tutorship
        - [ ] The button to create a tutorship will be shown also on the wizard outside the modal next to the info button
    - [ ] Add a filter with default to show only matches above a certain score (e.g. 0.5)
  - [ ] The map container should show the following:
    - [ ] A map of Israel with similar features to the one in the app in families by location
    - [ ] 2 pins will be shown only if a match was highlighted in the grid container - otherwise the map will be empty
      - [ ] Pins should be color coded based on the matching score - red for score below 25,yellow for score between 25 and 50, green for score above 50.
    - a button in the wizard above the containers will be used to calculate the matches
    - a loader per container will be shown while the matches are being calculated
    - a button to close the wizard and return to the main page of the app