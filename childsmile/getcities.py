import urllib.request
import json
import ssl

url = 'https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&limit=10000'

# Create an unverified SSL context
context = ssl._create_unverified_context()

fileobj = urllib.request.urlopen(url, context=context)
data = json.loads(fileobj.read())

# Extracting the "שם_ישוב" column
settlements = [record['שם_ישוב'] for record in data['result']['records']]

# Sorting the settlements list in alphabetical order
settlements.sort()

# Writing to a JSON file in Hebrew
with open(r'C:\Dev\FinalProjectOpenU\childsmile\frontend\src\components\settlements.json', 'w', encoding='utf-8') as f:
    json.dump(settlements, f, ensure_ascii=False, indent=4)

print("Data written to settlements.json")