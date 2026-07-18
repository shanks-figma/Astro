import requests
import datetime
import pytz
from timezonefinder import TimezoneFinder
from app.config import OPENCAGE_API_KEY

tf = TimezoneFinder()

def geocode_city(city: str) -> dict:
    """
    Geocodes a city using OpenCage API.
    Returns a dict with: latitude, longitude, timezone.
    Falls back to New Delhi if key is missing or geocoding fails.
    """
    fallback = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": "Asia/Kolkata"
    }
    
    if not OPENCAGE_API_KEY:
        print("Warning: OPENCAGE_API_KEY is missing. Using fallback (New Delhi).")
        return fallback
        
    try:
        url = f"https://api.opencagedata.com/geocode/v1/json?q={city}&key={OPENCAGE_API_KEY}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                result = data["results"][0]
                geometry = result.get("geometry", {})
                lat = geometry.get("lat")
                lng = geometry.get("lng")
                
                # Check if timezone is returned by OpenCage
                annotations = result.get("annotations", {})
                timezone_name = annotations.get("timezone", {}).get("name")
                
                # If timezone annotation is missing, compute it offline using TimezoneFinder
                if not timezone_name and lat is not None and lng is not None:
                    timezone_name = tf.timezone_at(lng=lng, lat=lat)
                
                if lat is not None and lng is not None and timezone_name:
                    return {
                        "latitude": float(lat),
                        "longitude": float(lng),
                        "timezone": timezone_name
                    }
        print(f"Geocoding failed for city '{city}' or returned invalid data. Using fallback.")
        return fallback
    except Exception as e:
        print(f"Error during geocoding: {e}. Using fallback.")
        return fallback

def get_historical_offset_and_utc(
    dob_str: str, 
    tob_str: str, 
    timezone_name: str
) -> tuple[float, datetime.datetime]:
    """
    Given date (YYYY-MM-DD), naive local time (HH:MM), and timezone name,
    calculates:
      - the historical UTC offset (in hours) at that birth date/time.
      - the birth time converted to UTC datetime.
    """
    # Parse naive local datetime
    dt_str = f"{dob_str} {tob_str}"
    naive_dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    
    # Localize naive datetime using pytz
    tz = pytz.timezone(timezone_name)
    try:
        # localize takes care of DST and historical offsets
        localized_dt = tz.localize(naive_dt, is_dst=None)
    except pytz.exceptions.AmbiguousTimeError:
        # Fallback for ambiguous time: choose standard time
        localized_dt = tz.localize(naive_dt, is_dst=False)
    except pytz.exceptions.NonExistentTimeError:
        # Fallback for gap time: add 1 hour to bypass gap
        adjusted_dt = naive_dt + datetime.timedelta(hours=1)
        localized_dt = tz.localize(adjusted_dt, is_dst=False)
        
    utc_offset = localized_dt.utcoffset().total_seconds() / 3600.0
    utc_dt = localized_dt.astimezone(pytz.utc)
    
    return utc_offset, utc_dt
