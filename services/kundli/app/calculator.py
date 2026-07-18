import swisseph as swe
import datetime
from app.dashas import calculate_vimshottari_dashas
from app.yogas import detect_yogas

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", 
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", 
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", 
    "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", 
    "Uttara Bhadrapada", "Revati"
]

PLANET_IDS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

def set_ayanamsa_mode(ayanamsa: str):
    """
    Sets the sidereal mode in swisseph.
    """
    mode_map = {
        "lahiri": swe.SIDM_LAHIRI,
        "raman": swe.SIDM_RAMAN,
        "krishnamurti": swe.SIDM_KRISHNAMURTI
    }
    mode = mode_map.get(ayanamsa.lower(), swe.SIDM_LAHIRI)
    swe.set_sid_mode(mode, 0, 0)

def get_sign_and_degree(lon: float) -> tuple[str, float]:
    sign_idx = int(lon // 30) % 12
    deg_in_sign = lon % 30
    return ZODIAC_SIGNS[sign_idx], round(deg_in_sign, 3)

def get_nakshatra_details(lon: float) -> tuple[str, int]:
    pada_span = 360.0 / 108.0  # 3.33333 degrees per pada
    total_padas = int(lon / pada_span)
    nak_idx = (total_padas // 4) % 27
    pada = (total_padas % 4) + 1
    return NAKSHATRAS[nak_idx], pada

def calculate_birth_chart(
    birth_utc_dt: datetime.datetime,
    latitude: float,
    longitude: float,
    ayanamsa: str = "lahiri"
) -> dict:
    """
    Calculates the complete sidereal birth chart details.
    """
    # Set sidereal mode
    set_ayanamsa_mode(ayanamsa)
    
    # Calculate Julian Day
    # UTC decimal hour
    dec_hour = birth_utc_dt.hour + birth_utc_dt.minute / 60.0 + birth_utc_dt.second / 3600.0
    jd = swe.julday(
        birth_utc_dt.year, 
        birth_utc_dt.month, 
        birth_utc_dt.day, 
        dec_hour
    )
    
    # Get ayanamsa offset
    aya_offset = swe.get_ayanamsa(jd)
    
    # 1. Calculate Lagna (Ascendant)
    # swe.houses returns tropical (cusps, ascmc)
    # We use Placidus system to get the main ascendant (ascmc[0])
    cusps, ascmc = swe.houses(jd, latitude, longitude, b'P')
    tropical_lagna = ascmc[0]
    sidereal_lagna = (tropical_lagna - aya_offset) % 360
    
    lagna_sign, lagna_degree = get_sign_and_degree(sidereal_lagna)
    lagna_sign_idx = ZODIAC_SIGNS.index(lagna_sign)
    
    # 2. Calculate Planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu)
    planets_data = []
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    
    for p_name, p_id in PLANET_IDS.items():
        res, flag = swe.calc_ut(jd, p_id, flags)
        p_lon = res[0]
        p_speed = res[3]
        retrograde = p_speed < 0
        
        p_sign, p_deg = get_sign_and_degree(p_lon)
        p_sign_idx = ZODIAC_SIGNS.index(p_sign)
        
        # Whole sign house system:
        # house 1 is the Lagna sign.
        p_house = (p_sign_idx - lagna_sign_idx) % 12 + 1
        
        nak_name, pada = get_nakshatra_details(p_lon)
        
        planets_data.append({
            "name": p_name,
            "sign": p_sign,
            "house": p_house,
            "degree": p_deg,
            "retrograde": retrograde,
            "nakshatra": nak_name,
            "pada": pada,
            "longitude": round(p_lon, 3)
        })
        
    # 3. Derive Ketu (opposite to Rahu, exactly +180 degrees)
    rahu_info = next(p for p in planets_data if p["name"] == "Rahu")
    rahu_lon = rahu_info["longitude"]
    ketu_lon = (rahu_lon + 180.0) % 360
    ketu_sign, ketu_deg = get_sign_and_degree(ketu_lon)
    ketu_sign_idx = ZODIAC_SIGNS.index(ketu_sign)
    ketu_house = (ketu_sign_idx - lagna_sign_idx) % 12 + 1
    ketu_nak, ketu_pada = get_nakshatra_details(ketu_lon)
    
    # Ketu speed matches Rahu's speed (since it's a node, mean node is always retrograde/stationary)
    planets_data.append({
        "name": "Ketu",
        "sign": ketu_sign,
        "house": ketu_house,
        "degree": ketu_deg,
        "retrograde": rahu_info["retrograde"],
        "nakshatra": ketu_nak,
        "pada": ketu_pada,
        "longitude": round(ketu_lon, 3)
    })
    
    # 4. Generate Whole Sign Houses structure
    houses_data = []
    for h in range(1, 13):
        h_sign = ZODIAC_SIGNS[(lagna_sign_idx + h - 1) % 12]
        # Find planets in this house
        house_planets = [p["name"] for p in planets_data if p["house"] == h]
        houses_data.append({
            "number": h,
            "sign": h_sign,
            "planets": house_planets
        })
        
    # 5. Moon Nakshatra for Vimshottari Dashas
    moon_info = next(p for p in planets_data if p["name"] == "Moon")
    moon_lon = moon_info["longitude"]
    rashi = moon_info["sign"]
    nakshatra = moon_info["nakshatra"]
    nakshatra_pada = moon_info["pada"]
    
    dashas = calculate_vimshottari_dashas(moon_lon, birth_utc_dt)
    
    # Get current Dasha values
    current_maha = dashas[0]["planet"] if dashas else ""
    current_antar = ""
    if dashas and dashas[0].get("antardashas"):
        current_antar = dashas[0]["antardashas"][0]["planet"]
    dasha_ends = dashas[0]["ends_at"] if dashas else ""
    
    # 6. Detect Yogas
    detected_yogas_list = detect_yogas(planets_data, lagna_sign)
    
    return {
        "ayanamsa": ayanamsa,
        "lagna": {
            "sign": lagna_sign,
            "degree": lagna_degree
        },
        "planets": planets_data,
        "houses": houses_data,
        "dashas": {
            "current": {
                "maha": current_maha,
                "antar": current_antar,
                "ends_at": dasha_ends
            },
            "timeline": dashas
        },
        "yogas": detected_yogas_list,
        "rashi": rashi,
        "nakshatra": nakshatra,
        "nakshatra_pada": nakshatra_pada
    }
