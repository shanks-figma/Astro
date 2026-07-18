import requests
import json

base_url = "https://astro-pn0t.onrender.com"

print("1. Generating birth chart...")
chart_res = requests.post(f"{base_url}/generate", json={
    "dob": "1990-01-01",
    "tob": "12:00",
    "city": "New Delhi"
})

print(f"Chart Response Status: {chart_res.status_code}")
if chart_res.status_code != 200:
    print(f"Error: {chart_res.text}")
    exit(1)

chart = chart_res.json()
print("Chart generated successfully!")

print("\n2. Generating daily reading (English)...")
reading_res = requests.post(f"{base_url}/reading/generate", json={
    "chart": chart,
    "query_type": "daily",
    "language": "English"
})

print(f"Reading Response Status: {reading_res.status_code}")
print(f"Reading Response: {reading_res.text}")
