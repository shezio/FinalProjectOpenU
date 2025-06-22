import os
import json
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "childsmile.settings")
django.setup()

from childsmile_app.models import CityGeoDistance

DISTANCES_FILE = r"c:\Dev\FinalProjectOpenU\childsmile\childsmile_app\distances.json"
LOCATIONS_FILE = r"c:\Dev\FinalProjectOpenU\childsmile\childsmile_app\locations.json"

def main():
    # Load locations
    with open(LOCATIONS_FILE, encoding="utf-8") as f:
        locations = json.load(f)

    # Load distances
    with open(DISTANCES_FILE, encoding="utf-8") as f:
        distances = json.load(f)

    for city1, city1_data in distances.items():
        city1_lat = city1_data.get("city_latitude") or locations.get(city1, {}).get("latitude")
        city1_lon = city1_data.get("city_longitude") or locations.get(city1, {}).get("longitude")
        for city2, pair_data in city1_data.items():
            if city2 in ("city_latitude", "city_longitude"):
                continue
            city2_lat = pair_data.get("city2_latitude") or locations.get(city2, {}).get("latitude")
            city2_lon = pair_data.get("city2_longitude") or locations.get(city2, {}).get("longitude")
            distance = pair_data.get("distance")
            if city1 and city2:
                obj, created = CityGeoDistance.objects.get_or_create(
                    city1=city1, city2=city2,
                    defaults={
                        "city1_latitude": city1_lat,
                        "city1_longitude": city1_lon,
                        "city2_latitude": city2_lat,
                        "city2_longitude": city2_lon,
                        "distance": distance,
                    }
                )
                if not created:
                    obj.city1_latitude = city1_lat
                    obj.city1_longitude = city1_lon
                    obj.city2_latitude = city2_lat
                    obj.city2_longitude = city2_lon
                    obj.distance = distance
                    obj.save()
    print("Migration complete.")

if __name__ == "__main__":
    main()