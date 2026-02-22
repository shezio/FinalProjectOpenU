import pandas as pd

# Load your Excel file
df = pd.read_excel('/Users/shlomosmac/Applications/dev/FinalProjectOpenU/ילדים מוכן לעלייה לפרוד.xlsx', dtype=str)

def find_column_contains(substring):
    for col in df.columns:
        if substring in col:
            return col
    return None

col_child_id = find_column_contains("תעודת זהות") or "child_id"
col_father_phone = find_column_contains("טלפון של האב")
col_mother_phone = find_column_contains("טלפון של האם")

sql_lines = []
for idx, row in df.iterrows():
    child_id = str(row.get(col_child_id, '')).strip()
    father_phone = str(row.get(col_father_phone, '')).strip()
    mother_phone = str(row.get(col_mother_phone, '')).strip()
    if father_phone and father_phone.lower() != 'nan':
        if len(father_phone) < 10 and len(father_phone) > 8:
            # add leading zeros if needed
            father_phone = father_phone.zfill(10)
        if '-' in father_phone:
            father_phone = father_phone.replace('-', '')
        if '+972' in father_phone:
            father_phone = father_phone.replace('+972', '0')
        if 'לא' in father_phone or '....' in father_phone:
            father_phone = ''
    if mother_phone and mother_phone.lower() != 'nan':
        if len(mother_phone) < 10 and len(mother_phone) > 8:
            # add leading zeros if needed
            mother_phone = mother_phone.zfill(10)
        if '-' in mother_phone:
            mother_phone = mother_phone.replace('-', '')
        if '+972' in mother_phone:
            mother_phone = mother_phone.replace('+972', '0')
        if 'לא' in mother_phone or '....' in mother_phone:
            mother_phone = ''
    if not child_id or child_id.lower() == 'nan':
        continue
    updates = []
    if father_phone and father_phone.lower() != 'nan':
        updates.append(f"father_phone='{father_phone}'")
    if mother_phone and mother_phone.lower() != 'nan':
        updates.append(f"mother_phone='{mother_phone}'")
    if updates:
        sql_lines.append(
            f"UPDATE childsmile_app_children SET {', '.join(updates)} WHERE child_id='{child_id}';"
        )

with open('update_parent_phones.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))