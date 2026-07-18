import datetime

PLANETS_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]

PLANET_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17
}

TOTAL_CYCLE_YEARS = 120

def get_cycle_from(start_planet: str) -> list[str]:
    idx = PLANETS_ORDER.index(start_planet)
    return PLANETS_ORDER[idx:] + PLANETS_ORDER[:idx]

def calculate_vimshottari_dashas(
    moon_lon: float, 
    birth_dt: datetime.datetime
) -> list[dict]:
    """
    Calculates the Vimshottari Dasha timeline starting from the Moon's longitude and birth date.
    Returns a list of dicts with dasha details (maha, antar, starts_at, ends_at).
    """
    # Nakshatra span is 13.333333333333334 degrees
    nak_span = 360.0 / 27.0
    
    # Nakshatra index (0 to 26)
    nak_index = int(moon_lon / nak_span)
    nak_start_lon = nak_index * nak_span
    traversed = moon_lon - nak_start_lon
    fraction_elapsed = traversed / nak_span
    
    # Starting planet lord
    start_lord = PLANETS_ORDER[nak_index % 9]
    lord_years = PLANET_YEARS[start_lord]
    
    elapsed_years = fraction_elapsed * lord_years
    remaining_years = (1.0 - fraction_elapsed) * lord_years
    
    # Calculate theoretical start date of the birth Mahadasha
    # We use timedelta with days (approx 365.25 days per year)
    days_per_year = 365.25
    theoretical_start = birth_dt - datetime.timedelta(days=elapsed_years * days_per_year)
    
    # Get the sequence of Mahadashas for 120+ years
    dasha_timeline = []
    
    current_start = theoretical_start
    current_cycle = get_cycle_from(start_lord)
    
    # We generate two full cycles (18 Mahadashas) to cover any lifetime
    mahadashas_to_gen = current_cycle + PLANETS_ORDER
    
    for m_lord in mahadashas_to_gen:
        m_years = PLANET_YEARS[m_lord]
        m_ends = current_start + datetime.timedelta(days=m_years * days_per_year)
        
        # Only keep Mahadashas that end after birth
        if m_ends > birth_dt:
            # Generate Antardashas within this Mahadasha
            a_cycle = get_cycle_from(m_lord)
            a_start = current_start
            
            antardashas = []
            for a_lord in a_cycle:
                a_years = m_years * (PLANET_YEARS[a_lord] / TOTAL_CYCLE_YEARS)
                a_ends = a_start + datetime.timedelta(days=a_years * days_per_year)
                
                # Only keep Antardashas that end after birth
                if a_ends > birth_dt:
                    # If this Antardasha starts before birth, truncate its visual start to birth
                    disp_start = max(a_start, birth_dt)
                    antardashas.append({
                        "planet": a_lord,
                        "starts_at": disp_start.date().isoformat(),
                        "ends_at": a_ends.date().isoformat()
                    })
                a_start = a_ends
            
            # Truncate Mahadasha display start to birth if it starts before birth
            disp_m_start = max(current_start, birth_dt)
            dasha_timeline.append({
                "planet": m_lord,
                "starts_at": disp_m_start.date().isoformat(),
                "ends_at": m_ends.date().isoformat(),
                "antardashas": antardashas
            })
            
        current_start = m_ends
        
        # Stop if we've covered at least 100 years from birth
        if (current_start - birth_dt).days > 100 * 365:
            break
            
    return dasha_timeline
