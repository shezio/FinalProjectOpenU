import pandas as pd
import re

# Load the SQL file
sql_file_path = r"C:\Dev\FinalProjectOpenU\childsmile\design\dev order.sql"
with open(sql_file_path, "r", encoding="utf-8") as file:
    sql_content = file.readlines()

# Extract permission data from INSERT statements
permissions = []
insert_pattern = re.compile(
    r"INSERT INTO childsmile_app_permissions \(role, resource, action\) VALUES \('(.+?)', '(.+?)', '(.+?)'\);"
)

for line in sql_content:
    match = insert_pattern.search(line)
    if match:
        role, resource, action = match.groups()
        permissions.append((role, resource, action))

# Organize data into a dictionary
permissions_dict = {}
roles = [
    "System Administrator",
    "General Volunteer",
    "Tutor",
    "Technical Coordinator",
    "Volunteer Coordinator",
    "Families Coordinator",
    "Tutors Coordinator",
    "Matures Coordinator",
    "Healthy Kids Coordinator"
]

for role, resource, action in permissions:
    if resource not in permissions_dict:
        permissions_dict[resource] = {}

    if role not in permissions_dict[resource]:
        permissions_dict[resource][role] = {"CREATE": "", "UPDATE": "", "DELETE": "", "VIEW": ""}

    permissions_dict[resource][role][action] = "X"

# Ensure all roles are present in each resource
for resource in permissions_dict:
    for role in roles:
        if role not in permissions_dict[resource]:
            permissions_dict[resource][role] = {"CREATE": "", "UPDATE": "", "DELETE": "", "VIEW": ""}

# Create an Excel file with sheets per resource
excel_path = r"C:\Dev\FinalProjectOpenU\childsmile\design\permissions.xlsx"
with pd.ExcelWriter(excel_path, engine='xlsxwriter') as writer:
    for resource, role_permissions in permissions_dict.items():
        df = pd.DataFrame.from_dict(role_permissions, orient="index", columns=["CREATE", "UPDATE", "DELETE", "VIEW"])
        df.index.name = "ROLENAME"
        df.reset_index(inplace=True)
        df = df.set_index("ROLENAME").reindex(roles).reset_index()  # Ensure the roles are in the specified order
        df.to_excel(writer, sheet_name=resource[:31], index=False)  # Sheet names are limited to 31 chars

        # Adjust column width to fit text
        worksheet = writer.sheets[resource[:31]]
        for idx, col in enumerate(df):
            max_length = max(df[col].astype(str).map(len).max(), len(col))
            worksheet.set_column(idx, idx, max_length + 2)

# Return the path for download
excel_path
