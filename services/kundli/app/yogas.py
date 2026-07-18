SIGN_LORDS = {
    "Aries": "Mars",
    "Taurus": "Venus",
    "Gemini": "Mercury",
    "Cancer": "Moon",
    "Leo": "Sun",
    "Virgo": "Mercury",
    "Libra": "Venus",
    "Scorpio": "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn",
    "Aquarius": "Saturn",
    "Pisces": "Jupiter"
}

OWN_SIGNS = {
    "Sun": ["Leo"],
    "Moon": ["Cancer"],
    "Mars": ["Aries", "Scorpio"],
    "Mercury": ["Gemini", "Virgo"],
    "Jupiter": ["Sagittarius", "Pisces"],
    "Venus": ["Taurus", "Libra"],
    "Saturn": ["Capricorn", "Aquarius"]
}

EXALTATION_SIGNS = {
    "Sun": "Aries",
    "Moon": "Taurus",
    "Mars": "Capricorn",
    "Mercury": "Virgo",
    "Jupiter": "Cancer",
    "Venus": "Pisces",
    "Saturn": "Libra"
}

DEBILITATION_SIGNS = {
    "Sun": "Libra",
    "Moon": "Scorpio",
    "Mars": "Cancer",
    "Mercury": "Pisces",
    "Jupiter": "Capricorn",
    "Venus": "Virgo",
    "Saturn": "Aries"
}

def detect_yogas(planets_list: list[dict], lagna_sign: str) -> list[dict]:
    """
    Detects up to 30 Yogas from the planetary positions list.
    planets_list: list of dicts with {"name": str, "sign": str, "house": int}
    lagna_sign: name of Lagna sign (e.g. "Scorpio")
    """
    yogas = []
    
    # Pre-process planets for quick lookup by name and house
    planet_by_name = {}
    planets_in_house = {h: [] for h in range(1, 13)}
    
    for p in planets_list:
        name = p["name"]
        house = p["house"]
        sign = p["sign"]
        planet_by_name[name] = p
        planets_in_house[house].append(name)
        
    # Reconstruct sign for each house (Whole sign: Lagna is house 1)
    signs_order = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
    lagna_idx = signs_order.index(lagna_sign)
    house_signs = [signs_order[(lagna_idx + h - 1) % 12] for h in range(1, 13)]
    house_lords = {h: SIGN_LORDS[house_signs[h-1]] for h in range(1, 13)}
    
    def is_kendra(h):
        return h in [1, 4, 7, 10]
        
    def is_trikona(h):
        return h in [1, 5, 9]
        
    # --- 1. Pancha Mahapurusha Yogas (5 variants) ---
    mahapurusha_configs = {
        "Ruchaka": {"planet": "Mars", "own": OWN_SIGNS["Mars"], "exalt": EXALTATION_SIGNS["Mars"]},
        "Bhadra": {"planet": "Mercury", "own": OWN_SIGNS["Mercury"], "exalt": EXALTATION_SIGNS["Mercury"]},
        "Hamsa": {"planet": "Jupiter", "own": OWN_SIGNS["Jupiter"], "exalt": EXALTATION_SIGNS["Jupiter"]},
        "Malavya": {"planet": "Venus", "own": OWN_SIGNS["Venus"], "exalt": EXALTATION_SIGNS["Venus"]},
        "Sasa": {"planet": "Saturn", "own": OWN_SIGNS["Saturn"], "exalt": EXALTATION_SIGNS["Saturn"]}
    }
    
    for y_name, config in mahapurusha_configs.items():
        p_name = config["planet"]
        if p_name in planet_by_name:
            p_info = planet_by_name[p_name]
            p_house = p_info["house"]
            p_sign = p_info["sign"]
            if is_kendra(p_house) and (p_sign in config["own"] or p_sign == config["exalt"]):
                yogas.append({
                    "name": f"{y_name} Yoga",
                    "planets": [p_name],
                    "houses": [p_house],
                    "strength": "strong" if p_sign == config["exalt"] else "moderate"
                })

    # --- 2. Gajakesari Yoga ---
    if "Jupiter" in planet_by_name and "Moon" in planet_by_name:
        jup_house = planet_by_name["Jupiter"]["house"]
        moon_house = planet_by_name["Moon"]["house"]
        # Jupiter in kendra from Moon: house difference is 0 (same house), 3 (4th house), 6 (7th house), or 9 (10th house)
        diff = (jup_house - moon_house) % 12
        if diff in [0, 3, 6, 9]:
            yogas.append({
                "name": "Gajakesari Yoga",
                "planets": ["Jupiter", "Moon"],
                "houses": [jup_house, moon_house],
                "strength": "strong" if is_kendra(jup_house) else "moderate"
            })

    # --- 3. Budha-Aditya Yoga ---
    if "Sun" in planet_by_name and "Mercury" in planet_by_name:
        sun_house = planet_by_name["Sun"]["house"]
        mer_house = planet_by_name["Mercury"]["house"]
        if sun_house == mer_house:
            # Check if combust (too close to Sun) reduces strength, but simple detection is enough
            yogas.append({
                "name": "Budha-Aditya Yoga",
                "planets": ["Sun", "Mercury"],
                "houses": [sun_house],
                "strength": "moderate"
            })

    # --- 4. Chandra-Mangal Yoga ---
    if "Moon" in planet_by_name and "Mars" in planet_by_name:
        moon_house = planet_by_name["Moon"]["house"]
        mars_house = planet_by_name["Mars"]["house"]
        if moon_house == mars_house:
            yogas.append({
                "name": "Chandra-Mangal Yoga",
                "planets": ["Moon", "Mars"],
                "houses": [moon_house],
                "strength": "moderate"
            })

    # --- 5. Mangal Dosha ---
    if "Mars" in planet_by_name:
        mars_house = planet_by_name["Mars"]["house"]
        if mars_house in [1, 2, 4, 7, 8, 12]:
            yogas.append({
                "name": "Mangal Dosha",
                "planets": ["Mars"],
                "houses": [mars_house],
                "strength": "moderate"
            })

    # --- 6. Sunapha, Anapha, Durudhura Yogas (Moon-based) ---
    if "Moon" in planet_by_name:
        moon_house = planet_by_name["Moon"]["house"]
        second_house = (moon_house % 12) + 1
        twelfth_house = ((moon_house - 2) % 12) + 1
        
        has_second = any(p not in ["Sun", "Rahu", "Ketu", "Moon"] for p in planets_in_house[second_house])
        has_twelfth = any(p not in ["Sun", "Rahu", "Ketu", "Moon"] for p in planets_in_house[twelfth_house])
        
        if has_second and has_twelfth:
            yogas.append({
                "name": "Durudhura Yoga",
                "planets": ["Moon"],
                "houses": [moon_house, second_house, twelfth_house],
                "strength": "moderate"
            })
        elif has_second:
            yogas.append({
                "name": "Sunapha Yoga",
                "planets": ["Moon"],
                "houses": [moon_house, second_house],
                "strength": "moderate"
            })
        elif has_twelfth:
            yogas.append({
                "name": "Anapha Yoga",
                "planets": ["Moon"],
                "houses": [moon_house, twelfth_house],
                "strength": "moderate"
            })
        else:
            yogas.append({
                "name": "Kemadruma Yoga",
                "planets": ["Moon"],
                "houses": [moon_house],
                "strength": "weak"
            })

    # --- 7. Vesi, Vasi, Ubhayachari Yogas (Sun-based) ---
    if "Sun" in planet_by_name:
        sun_house = planet_by_name["Sun"]["house"]
        second_house = (sun_house % 12) + 1
        twelfth_house = ((sun_house - 2) % 12) + 1
        
        has_second = any(p not in ["Moon", "Rahu", "Ketu", "Sun"] for p in planets_in_house[second_house])
        has_twelfth = any(p not in ["Moon", "Rahu", "Ketu", "Sun"] for p in planets_in_house[twelfth_house])
        
        if has_second and has_twelfth:
            yogas.append({
                "name": "Ubhayachari Yoga",
                "planets": ["Sun"],
                "houses": [sun_house, second_house, twelfth_house],
                "strength": "moderate"
            })
        elif has_second:
            yogas.append({
                "name": "Vesi Yoga",
                "planets": ["Sun"],
                "houses": [sun_house, second_house],
                "strength": "moderate"
            })
        elif has_twelfth:
            yogas.append({
                "name": "Vasi Yoga",
                "planets": ["Sun"],
                "houses": [sun_house, twelfth_house],
                "strength": "moderate"
            })

    # --- 8. Viparita Raj Yogas (3 variants) ---
    # Harsha Yoga: 6th lord in 6th, 8th or 12th house
    lord_6 = house_lords[6]
    if lord_6 in planet_by_name:
        pos_6 = planet_by_name[lord_6]["house"]
        if pos_6 in [6, 8, 12]:
            yogas.append({
                "name": "Harsha Viparita Raj Yoga",
                "planets": [lord_6],
                "houses": [pos_6],
                "strength": "moderate"
            })
            
    # Sarala Yoga: 8th lord in 6th, 8th or 12th house
    lord_8 = house_lords[8]
    if lord_8 in planet_by_name:
        pos_8 = planet_by_name[lord_8]["house"]
        if pos_8 in [6, 8, 12]:
            yogas.append({
                "name": "Sarala Viparita Raj Yoga",
                "planets": [lord_8],
                "houses": [pos_8],
                "strength": "moderate"
            })
            
    # Vimala Yoga: 12th lord in 6th, 8th or 12th house
    lord_12 = house_lords[12]
    if lord_12 in planet_by_name:
        pos_12 = planet_by_name[lord_12]["house"]
        if pos_12 in [6, 8, 12]:
            yogas.append({
                "name": "Vimala Viparita Raj Yoga",
                "planets": [lord_12],
                "houses": [pos_12],
                "strength": "moderate"
            })

    # --- 9. Neecha Bhanga Raj Yoga ---
    for p_name, deb_sign in DEBILITATION_SIGNS.items():
        if p_name in planet_by_name:
            p_info = planet_by_name[p_name]
            if p_info["sign"] == deb_sign:
                # Debilitation check. Cancellation rules:
                # 1. Lord of the debilitated sign is in Kendra from Lagna or Moon
                deb_sign_lord = SIGN_LORDS[deb_sign]
                cancelled = False
                if deb_sign_lord in planet_by_name:
                    lord_house = planet_by_name[deb_sign_lord]["house"]
                    if is_kendra(lord_house):
                        cancelled = True
                
                # 2. Exaltation lord of this sign is in Kendra
                ex_sign = EXALTATION_SIGNS[p_name]
                ex_sign_lord = SIGN_LORDS[ex_sign]
                if ex_sign_lord in planet_by_name:
                    ex_lord_house = planet_by_name[ex_sign_lord]["house"]
                    if is_kendra(ex_lord_house):
                        cancelled = True
                        
                if cancelled:
                    yogas.append({
                        "name": f"Neecha Bhanga Raj Yoga ({p_name})",
                        "planets": [p_name],
                        "houses": [p_info["house"]],
                        "strength": "moderate"
                    })

    # --- 10. Raj Yoga & Dhana Yoga (Lords of Kendra/Trikona) ---
    # General Raj Yoga: Connection between a Kendra lord and a Trikona lord
    kendra_lords = {house_lords[h] for h in [1, 4, 7, 10]}
    trikona_lords = {house_lords[h] for h in [1, 5, 9]}
    # Find active combinations (e.g. in same house or mutual aspect)
    # Simple rule: if a Kendra lord and Trikona lord are conjunct (in same house)
    raj_yoga_lords = []
    for kl in kendra_lords:
        for tl in trikona_lords:
            if kl != tl and kl in planet_by_name and tl in planet_by_name:
                if planet_by_name[kl]["house"] == planet_by_name[tl]["house"]:
                    raj_yoga_lords.append((kl, tl, planet_by_name[kl]["house"]))
                    
    if raj_yoga_lords:
        # Avoid duplicate Raj Yoga entries, list the first or strongest connection
        kl, tl, h = raj_yoga_lords[0]
        yogas.append({
            "name": "Raj Yoga",
            "planets": [kl, tl],
            "houses": [h],
            "strength": "moderate"
        })

    # Dhana Yoga: Connection between 1st, 2nd, 5th, 9th, or 11th lords
    dhana_houses = [1, 2, 5, 9, 11]
    dhana_lords = {house_lords[h] for h in dhana_houses}
    dhana_combos = []
    for dl1 in dhana_lords:
        for dl2 in dhana_lords:
            if dl1 != dl2 and dl1 in planet_by_name and dl2 in planet_by_name:
                if planet_by_name[dl1]["house"] == planet_by_name[dl2]["house"]:
                    dhana_combos.append((dl1, dl2, planet_by_name[dl1]["house"]))
                    
    if dhana_combos:
        dl1, dl2, h = dhana_combos[0]
        yogas.append({
            "name": "Dhana Yoga",
            "planets": [dl1, dl2],
            "houses": [h],
            "strength": "moderate"
        })

    # --- 11. Shakata Yoga ---
    if "Jupiter" in planet_by_name and "Moon" in planet_by_name:
        jup_house = planet_by_name["Jupiter"]["house"]
        moon_house = planet_by_name["Moon"]["house"]
        # Moon in 6th, 8th or 12th from Jupiter
        diff = (moon_house - jup_house) % 12
        if diff in [5, 7, 11]: # 6th, 8th, 12th houses correspond to index diffs of 5, 7, 11
            yogas.append({
                "name": "Shakata Yoga",
                "planets": ["Jupiter", "Moon"],
                "houses": [jup_house, moon_house],
                "strength": "moderate"
            })

    # --- 12. Kahala, Chamara, and other custom Yogas ---
    # Chamara Yoga: Lagna lord in Kendra/exaltation/own sign, aspected by Jupiter (or conjunct Jupiter)
    lord_1 = house_lords[1]
    if lord_1 in planet_by_name and "Jupiter" in planet_by_name:
        l1_info = planet_by_name[lord_1]
        jup_info = planet_by_name["Jupiter"]
        if is_kendra(l1_info["house"]) and (l1_info["sign"] in OWN_SIGNS[lord_1] or l1_info["sign"] == EXALTATION_SIGNS.get(lord_1)):
            # Check aspect or conjunction with Jupiter (for simplicity: conjunct or mutual aspect/opposite house)
            if l1_info["house"] == jup_info["house"] or abs(l1_info["house"] - jup_info["house"]) == 6:
                yogas.append({
                    "name": "Chamara Yoga",
                    "planets": [lord_1, "Jupiter"],
                    "houses": [l1_info["house"], jup_info["house"]],
                    "strength": "strong"
                })

    return yogas
