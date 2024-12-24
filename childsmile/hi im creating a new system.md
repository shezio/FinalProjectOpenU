### copilot explanations
1. 
 hi im creating a new system. DB schema is according these SQLs ive already ran
-- psql -U postgres
-- CREATE DATABASE child_smile_db;
-- Permissions Table
--CREATE ROLE child_smile_user WITH LOGIN PASSWORD '0192pqowL@!';
--GRANT ALL PRIVILEGES ON DATABASE child_smile_db TO child_smile_user;
--ALTER ROLE child_smile_user SET search_path TO public;
--GRANT ALL PRIVILEGES ON SCHEMA public TO child_smile_user;
CREATE TABLE Permissions (
    permission_id SERIAL PRIMARY KEY,
    role VARCHAR NOT NULL,
    resource VARCHAR NOT NULL,
    action VARCHAR NOT NULL
);


-- Staff Table
CREATE TABLE Staff (
    staff_id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    role_id INT NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    firstname VARCHAR NOT NULL,
    lastname VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Permissions(permission_id)
);
--1. signedup Table
CREATE TABLE signedup (
    id INT NOT NULL PRIMARY KEY,
    firstname VARCHAR NOT NULL,
    surname VARCHAR NOT NULL,
    age INT NOT NULL,
    gender BOOLEAN NOT NULL,
    phone INT NOT NULL,
    city VARCHAR NOT NULL,
    comment VARCHAR,
    email VARCHAR,
    want_tutor BOOLEAN NOT NULL
);
--2. general_volunteer Table
CREATE TABLE general_volunteer (
    id INT NOT NULL PRIMARY KEY,
    staff_id INT NOT NULL,
    signupdate DATE NOT NULL,
    comments VARCHAR,
    FOREIGN KEY (id) REFERENCES signedup(id),
    FOREIGN KEY (staff_id) REFERENCES Staff(staff_id)
);


--3. pending_tutor Table
CREATE TABLE pending_tutor (
    pending_tutor_id SERIAL PRIMARY KEY,
    id INT NOT NULL,
    pending_status VARCHAR NOT NULL,
    FOREIGN KEY (id) REFERENCES signedup(id)
);




--4. Tutors Table
CREATE TYPE tutorship_status AS ENUM ('יש_חניך', 'אין_חניך', 'לא_זמין_לשיבוץ');
CREATE TABLE Tutors (
    id INT PRIMARY KEY,
    staff_id INT NOT NULL,
    tutorship_status tutorship_status NOT NULL,
    preferences VARCHAR,
    tutor_email VARCHAR,
    relationship_status VARCHAR,
    tutee_wellness VARCHAR,
    FOREIGN KEY (id) REFERENCES signedup(id),
    FOREIGN KEY (staff_id) REFERENCES Staff(staff_id)
);




--5. Children Table
CREATE TYPE marital_status AS ENUM ('נשואים', 'גרושים', 'פרודים', 'אין');
CREATE TYPE tutoring_status AS ENUM (
    'למצוא_חונך', 'לא_רוצים', 'לא_רלוונטי', 'בוגר', 'יש_חונך',
    'למצוא_חונך_אין_באיזור_שלו', 'למצוא_חונך_בעדיפות_גבוה', 'שידוך_בסימן_שאלה'
);


CREATE TABLE Children (
    child_id INT PRIMARY KEY,
    childfirstname VARCHAR NOT NULL,
    childsurname VARCHAR NOT NULL,
    registrationdate DATE NOT NULL,
    lastupdateddate DATE NOT NULL DEFAULT CURRENT_DATE,
    gender BOOLEAN NOT NULL,
    responsible_coordinator VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    child_phone_number INT NOT NULL,
    treating_hospital VARCHAR NOT NULL,
    date_of_birth DATE NOT NULL,
    age INT NOT NULL,
    medical_diagnosis VARCHAR,
    diagnosis_date DATE,
    marital_status marital_status NOT NULL,
    num_of_siblings INT NOT NULL,
    details_for_tutoring VARCHAR NOT NULL,
    additional_info VARCHAR NOT NULL,
    tutoring_status tutoring_status NOT NULL
);


--6. Tutorships Table
CREATE TABLE Tutorships (
    id SERIAL PRIMARY KEY,
    child_id INT NOT NULL,
    tutor_id INT NOT NULL,
    FOREIGN KEY (child_id) REFERENCES Children(child_id),
    FOREIGN KEY (tutor_id) REFERENCES Tutors(id)
);


--7. Matures Table
CREATE TABLE Matures (
    timestamp TIMESTAMP NOT NULL,
    child_id INT PRIMARY KEY,
    full_address VARCHAR NOT NULL,
    current_medical_state VARCHAR,
    when_completed_treatments DATE,
    parent_name VARCHAR NOT NULL,
    parent_phone INT NOT NULL,
    additional_info VARCHAR,
    general_comment VARCHAR,
    FOREIGN KEY (child_id) REFERENCES Children(child_id)
);


--8. Healthy Table
CREATE TABLE Healthy (
    child_id INT PRIMARY KEY,
    street_and_apartment_number VARCHAR,
    father_name VARCHAR,
    father_phone INT,
    mother_name VARCHAR,
    mother_phone INT,
    FOREIGN KEY (child_id) REFERENCES Children(child_id)
);
--9. Feedback Table
-- Feedback Table with Default Timestamp
CREATE TABLE Feedback (
    feedback_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_date TIMESTAMP NOT NULL,
    staff_id INT NOT NULL,
    description VARCHAR NOT NULL,
    exceptional_events VARCHAR,
    anything_else VARCHAR,
    comments VARCHAR,
    FOREIGN KEY (staff_id) REFERENCES Staff(staff_id)
);


-- Tutor_Feedback Table (unique fields for tutors)
CREATE TABLE Tutor_Feedback (
    feedback_id INT PRIMARY KEY,
    tutee_name VARCHAR NOT NULL,
    tutor_name VARCHAR NOT NULL,
    tutor_id INT NOT NULL,
    is_it_your_tutee BOOLEAN NOT NULL,
    isfirstvisit BOOLEAN NOT NULL,
    FOREIGN KEY (feedback_id) REFERENCES Feedback(feedback_id),
    FOREIGN KEY (tutor_id) REFERENCES Tutors(id)
);


-- General_V_Feedback Table (unique fields for general volunteers)
CREATE TABLE General_V_Feedback (
    feedback_id INT PRIMARY KEY,
    volunteer_name VARCHAR NOT NULL,
    volunteer_id INT NOT NULL,
    FOREIGN KEY (feedback_id) REFERENCES Feedback(feedback_id),
    FOREIGN KEY (volunteer_id) REFERENCES general_volunteer(id)
);
-- Tasks Table
CREATE TABLE Task_types (
    task_type SERIAL PRIMARY KEY,
    task_name VARCHAR NOT NULL
);
-- Tasks Table
CREATE TABLE Tasks (
    task_id SERIAL PRIMARY KEY,
    staff_member INT NOT NULL,
    task_description VARCHAR NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'לביצוע',
    task_type INT NOT NULL,
    FOREIGN KEY (staff_member) REFERENCES Staff(staff_id),
    FOREIGN KEY (task_type ) REFERENCES Task_types (task_type)
);


--Trigger Creations
--Trigger for pending_tutor
CREATE OR REPLACE FUNCTION add_to_pending_tutor()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.want_tutor = TRUE THEN
        INSERT INTO pending_tutor (id, pending_status)
        VALUES (NEW.id, 'Pending');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_add_to_pending_tutor
AFTER INSERT ON signedup
FOR EACH ROW
EXECUTE FUNCTION add_to_pending_tutor();


--Trigger for general_volunteer
CREATE OR REPLACE FUNCTION add_to_general_volunteer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.want_tutor = FALSE THEN
        INSERT INTO general_volunteer (id, signupdate, comments)
        VALUES (NEW.id, CURRENT_DATE, NEW.comment);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_add_to_general_volunteer
AFTER INSERT ON signedup
FOR EACH ROW
EXECUTE FUNCTION add_to_general_volunteer();
--Function to Validate Existence in pending_tutor


CREATE OR REPLACE FUNCTION validate_pending_tutor()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pending_tutor WHERE id = NEW.id) THEN
        RAISE EXCEPTION 'Tutor must exist in pending_tutor table before being added to Tutors table';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_validate_pending_tutor
BEFORE INSERT ON Tutors
FOR EACH ROW
EXECUTE FUNCTION validate_pending_tutor();
-- Function to Update Timestamp on Row Update
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Trigger to Call the Function on Update
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON Feedback
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

and by this UI screen i plan to do after i finish all the BE work i have models folder with init.py inside with this content
from .family_models import Family, FamilyMember
from .staff_models import Permissions, Staff
and these models  - each in its own file
family_models.py
from django.db import models

class Family(models.Model):
    family_id = models.AutoField(primary_key=True)
    family_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.family_name

class FamilyMember(models.Model):
    member_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10)
    relationship_to_family = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    additional_info = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
ill give u the screen in the next message - just wait dont do anything

2. 
Family Management screen A table displaying families and their details for users with appropriate permissions. By default, certain columns will be displayed according to the organization's needs. Additional columns can be added for display. Search and filter options will be available based on the displayed columns. Clicking on a family will show all its details. Families marked as "inactive" will not appear on the Family Management screen by default. A "Show Departed Families" button will display all families, including those who have left the organization. Buttons will be available to navigate to the "Graduate Management" screen (see 5.7.7) and the "Healthy Individuals Management" screen (see 5.7.8). Users will be able to edit and delete families from the Family Management screen using an "Update Family" button, which will be enabled after selecting a family in the table, and a "Leave Family" button, which will behave similarly. Additionally, a pencil-shaped button and a trashcan-shaped button will appear in the expanded view that shows all family details, allowing for editing and deletion, respectively. the 5.7.7 and 5.7.8 refrences are other screens but hold on with them - when i give u them complete any gap for the family management relevant models

i want the BE models that when i create the front after all BE the BE will be ready for the front
i also have this model in staff_models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class Permissions(models.Model):
    permission_id = models.AutoField(primary_key=True)
    role = models.CharField(max_length=255)
    resource = models.CharField(max_length=255)
    action = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.role} - {self.resource} - {self.action}"

class StaffManager(BaseUserManager):
    def create_user(self, username, email, password=None):
        if not email:
            raise ValueError("Staff must have an email address")
        if not username:
            raise ValueError("Staff must have a username")

        user = self.model(
            email=self.normalize_email(email),
            username=username,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None):
        user = self.create_user(
            username=username,
            email=email,
            password=password,
        )
        user.is_admin = True
        user.save(using=self._db)
        return user

class Staff(AbstractBaseUser):
    staff_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    role = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    firstname = models.CharField(max_length=255)
    lastname = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = StaffManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username
what more django related files do i need to edit?

3. i will be giving u more and more screens so u will give me the models needed and also update any model u gave me ok?
the next screen is (dont use mentor use tutor instead)
Mentor Management A table displaying all the mentors in the organization who are actively engaged in mentoring or awaiting an interview, along with their details for users with appropriate permissions. By default, certain columns will be displayed according to the organization's needs. Additional columns can be added for display. Search and filter options will be available based on the displayed columns. Clicking on a mentor will show all their details. Mentors marked as "inactive" will not appear on the screen by default. A "Show Departed Mentors" button will display all mentors, including those who have left the organization—but not those who stopped mentoring and transitioned to general volunteers. Buttons will be available to navigate to the "Mentorship Management" screen (see 5.7.10) and the "Mentor Feedback Management" screen. Users will be able to edit and delete mentors from the Mentor Management screen using an "Update Mentor" button, which will be enabled after selecting a mentor in the table, and a "Remove Mentor" button, which will behave similarly. Additionally, a pencil-shaped button and a trashcan-shaped button will appear in the expanded view showing all mentor details, allowing for editing and deletion, respectively. Each mentor's mentoring status will be displayed in a designated column.
