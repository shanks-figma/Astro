import datetime
import sys
import os

# Add parent directory to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.calculator import calculate_birth_chart, ZODIAC_SIGNS
from app.geocoder import get_historical_offset_and_utc

def test_delhi_1990_chart():
    print("Running Test 1: New Delhi Birth Chart (1990-01-01 12:00)")
    
    # 1. Coordinate and timezone setup
    lat = 28.6139
    lng = 77.2090
    tz_name = "Asia/Kolkata"
    
    offset, utc_dt = get_historical_offset_and_utc("1990-01-01", "12:00", tz_name)
    assert offset == 5.5, f"Expected UTC offset 5.5, got {offset}"
    
    # 2. Birth chart calculation
    chart = calculate_birth_chart(
        birth_utc_dt=utc_dt,
        latitude=lat,
        longitude=lng,
        ayanamsa="lahiri"
    )
    
    # 3. Structural Assertions
    assert "lagna" in chart
    assert "planets" in chart
    assert "houses" in chart
    assert "dashas" in chart
    assert "yogas" in chart
    assert "rashi" in chart
    assert "nakshatra" in chart
    assert "nakshatra_pada" in chart
    
    # Check planets count (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu)
    assert len(chart["planets"]) == 9, f"Expected 9 planets, got {len(chart['planets'])}"
    
    planets_by_name = {p["name"]: p for p in chart["planets"]}
    required_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
    for rp in required_planets:
        assert rp in planets_by_name, f"Missing planet {rp}"
        
    # 4. Whole-Sign House System verification
    lagna_sign = chart["lagna"]["sign"]
    lagna_sign_idx = ZODIAC_SIGNS.index(lagna_sign)
    
    print(f"Calculated Lagna Sign: {lagna_sign} at {chart['lagna']['degree']}°")
    
    for p in chart["planets"]:
        p_name = p["name"]
        p_sign = p["sign"]
        p_house = p["house"]
        
        p_sign_idx = ZODIAC_SIGNS.index(p_sign)
        expected_house = (p_sign_idx - lagna_sign_idx) % 12 + 1
        
        assert p_house == expected_house, (
            f"Whole-Sign failure for {p_name}: sign is {p_sign}, "
            f"Lagna is {lagna_sign}. Expected house {expected_house}, got {p_house}"
        )
        
    print("✓ Whole-Sign house placements verified successfully for all 9 planets.")
    
    # 5. Vimshottari Dasha verification
    dashas = chart["dashas"]["timeline"]
    assert len(dashas) > 0, "No Vimshottari Dashas generated"
    
    total_dasha_time = 0
    # Birth dasha starting from birth date is truncated, but subsequent dashas run full cycles
    print(f"Birth Mahadasha Lord: {dashas[0]['planet']}")
    print(f"Timeline starts at: {dashas[0]['starts_at']} and ends at: {dashas[-1]['ends_at']}")
    
    # 6. Yogas verification
    yogas = chart["yogas"]
    print(f"Detected Yogas count: {len(yogas)}")
    for y in yogas:
        print(f" - {y['name']} (Strength: {y['strength']})")
        assert "name" in y
        assert "planets" in y
        assert "houses" in y
        assert "strength" in y
        
    print("Test 1 Passed successfully!")

def test_unknown_birth_time():
    print("\nRunning Test 2: Unknown Birth Time (tob_unknown = True)")
    
    # Simulate a request where birth time is unknown
    # We will test the mock behavior defined in main.py
    # By running the main.py generation flow manually
    from app.main import ChartGenerateRequest, generate_chart
    
    req = ChartGenerateRequest(
        dob="1990-01-01",
        tob="12:00",
        tob_unknown=True,
        city="New Delhi",
        ayanamsa="lahiri"
    )
    
    chart = generate_chart(req)
    
    assert chart["birth_unknown_time"] is True
    assert chart["lagna"]["sign"] == "Unknown"
    assert chart["lagna"]["degree"] == 0.0
    assert len(chart["houses"]) == 0
    assert len(chart["yogas"]) == 0
    
    for p in chart["planets"]:
        assert p["house"] == 0, f"Expected house 0 for planet {p['name']} with unknown TOB, got {p['house']}"
        
    print("✓ Unknown birth time constraints verified successfully.")
    print("Test 2 Passed successfully!")

if __name__ == "__main__":
    try:
        test_delhi_1990_chart()
        test_unknown_birth_time()
        print("\nAll calculations tests passed 100%!")
        sys.exit(0)
    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
