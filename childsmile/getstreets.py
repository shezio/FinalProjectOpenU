import requests
import json
from tqdm import tqdm

# Make sure you have tqdm installed:
# pip install tqdm

url = 'https://data.gov.il/api/3/action/datastore_search'
resource_id = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b'

# 1. Fetch the total number of records
resp = requests.get(url, params={'resource_id': resource_id, 'limit': 1})
resp.raise_for_status()
total = resp.json()['result']['total']

limit = 1000
settlements_streets = {}

# 2. Paginate with a progress bar
for offset in tqdm(range(0, total, limit), desc="Fetching records"):
    params = {
        'resource_id': resource_id,
        'limit': limit,
        'offset': offset
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    records = r.json()['result']['records']
    
    for rec in records:
        settlement = rec.get('שם_ישוב')
        street = rec.get('שם_רחוב')
        if settlement and street:
            settlements_streets.setdefault(settlement, []).append(street)

# 3. Deduplicate and sort streets per settlement
for settlement, streets in settlements_streets.items():
    settlements_streets[settlement] = sorted(set(streets))

# 4. Write out to JSON
with open('settlements_n_streets.json', 'w', encoding='utf-8') as f:
    json.dump(settlements_streets, f, ensure_ascii=False, indent=4)

print("✅ Created 'settlements_n_streets.json' with all settlements and their streets.")
