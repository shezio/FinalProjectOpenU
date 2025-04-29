install npm after new PC 
To back up and reinstall all your npm packages, follow these steps:

---

### **1. Generate a List of Installed Packages (Backup)**
On your old PC, navigate to your project folder (`frontend`) and run:

```sh
npm list --depth=0 --json > npm-packages.json
```

or, if you prefer a simple text format:

```sh
npm list --depth=0 > npm-packages.txt
```

This will list all installed packages **without dependencies** (so you don’t get thousands of lines).

---

### **2. Restore Packages on Your New PC**
Once you've moved your project folder (`frontend`) to your new PC:

#### **Option 1: Install from `package.json` (Recommended)**
If you still have `package.json` and `package-lock.json`, just run:

```sh
npm install
```

This will install all dependencies exactly as they were.

#### **Option 2: Install from Backup File**
If you only have the `npm-packages.txt` or `npm-packages.json` file:

1. Extract package names from `npm-packages.txt` and install them:


   *(On Windows, open PowerShell and use:)*  

   ```powershell
   Get-Content npm-packages.txt | ForEach-Object { $_ -split ' ' | Select-Object -Index 1 } | ForEach-Object { npm install $_ }
   ```

2. If you have `npm-packages.json`, use:

   ```sh
   cat npm-packages.json | jq -r '.dependencies | keys[]' | xargs npm install
   ```

   *(On Windows, use PowerShell and install `jq` first or manually copy package names.)*

---

### **3. Verify Everything Works**
After installing, check if all dependencies are installed:

```sh
npm list --depth=0
```

If anything is missing, just run:

```sh
npm install
```

Restore on New PC
On your new PC, navigate to your project folder and run:

sh
bkp pip freeze > requirements.txt
bkp git remote -v > git-repos.txt
pip install -r requirements.txt


Get-Content git-repos.txt | ForEach-Object {
    $repo = $_.Trim()
    if (Test-Path "$repo\.git") {
        Write-Host "$repo already exists, skipping..."
    } else {
        $parentDir = Split-Path $repo -Parent
        $repoName = Split-Path $repo -Leaf
        Set-Location $parentDir
        git clone $(git -C $repo remote get-url origin)
    }
}

Restore on New PC
Restore Databases:
Move all_databases.sql to the new PC and run:

sh
Copy
Edit
psql -U postgres -f all_databases.sql

to run backend server:
 .\childsmile\myenv\Scripts\activate ; python .\childsmile\manage.py runserver
to run frontend server:
cd .\childsmile\frontend; npm start
```

to insert all initial users to db and roles
```sql
INSERT INTO childsmile_app_staff (username, password, role_id, email, first_name, last_name, created_at)
VALUES ('admin', '111', (SELECT id FROM childsmile_app_role WHERE role_name = 'System Administrator'), 'sysadminini@mail.com', 'ad', 'ministrat', current_timestamp);
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
--select all permissions of a user by its role
```sql
SELECT 
    s.username, 
    r.role_name, 
    p.permission_id, 
    p.resource, 
    p.action
FROM childsmile_app_staff s
JOIN childsmile_app_role r ON s.role_id = r.id
JOIN childsmile_app_permissions p ON r.id = p.role_id
WHERE s.username = 'admin';
```

test login api with curl
curl -X POST http://localhost:8000/api/login/ -d "username=admin&password=111" -c cookies.txt

test api permissions with curl
curl -X GET http://localhost:8000/api/permissions/ -b cookies.txt

curl -X POST http://localhost:8000/api/logout/ -d "username=admin&password=111" -c cookies.txt


test matches api with curl
curl -X POST http://localhost:8000/api/login/ -d "username=admin&password=111" -c cookies.txt
curl -X GET http://localhost:8000/api/permissions/ -b cookies.txt
curl -X POST http://localhost:8000/api/calculate_possible_matches/ -b cookies.txt -d "username=admin&password=111" -c cookies.txt