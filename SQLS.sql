-- psql -U postgres
DROP DATABASE IF EXISTS child_smile_db;
DROP OWNED BY child_smile_user CASCADE;
DROP ROLE IF EXISTS child_smile_user;
CREATE ROLE child_smile_user WITH LOGIN PASSWORD '0192pqowL@!';
CREATE DATABASE child_smile_db OWNER child_smile_user;
ALTER SCHEMA public OWNER TO child_smile_user;
GRANT USAGE, CREATE ON SCHEMA public TO child_smile_user;
ALTER ROLE child_smile_user SET search_path TO public;

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
