import os
import requests
import json
from typing import Optional, List, Dict
from app.model_loader import get_embedding_model

# Primary houses corresponding to each domain
DOMAIN_HOUSES = {
    "career": [10, 1, 6],
    "relationship": [7, 5, 9],
    "health": [6, 8, 12],
    "wealth": [2, 11, 9],
    "spiritual": [9, 12, 5],
    "daily": [1, 10, 7]
}

# Significations / Karaka planets for domains
DOMAIN_KARAKAS = {
    "career": ["Mars", "Sun", "Saturn"],
    "relationship": ["Venus", "Jupiter", "Moon"],
    "health": ["Sun", "Moon", "Saturn"],
    "wealth": ["Jupiter", "Venus", "Mercury"],
    "spiritual": ["Jupiter", "Ketu", "Sun"],
    "daily": []
}

def load_credentials():
    """
    Ensures .env variables are loaded.
    """
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv("../../.env")

def query_supabase_rpc(embedding: List[float], filter_domain: Optional[str], threshold: float = 0.60, limit: int = 8) -> List[Dict]:
    """
    Directly queries the Supabase match_corpus_rules RPC function.
    """
    load_credentials()
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Warning: Supabase credentials missing in query_supabase_rpc.")
        return []
        
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    post_url = f"{supabase_url}/rest/v1/rpc/match_corpus_rules"
    payload = {
        "query_embedding": embedding,
        "filter_domain": filter_domain,
        "similarity_threshold": threshold,
        "match_count": limit
    }
    
    try:
        res = requests.post(post_url, headers=headers, json=payload)
        if res.status_code == 200:
            return res.json()
        else:
            print(f"RPC Error in interpretation: {res.status_code} - {res.text}")
            return []
    except Exception as e:
        print(f"Exception querying RPC: {e}")
        return []

def get_embedding(text: str) -> Optional[List[float]]:
    """
    Retrieves the embedding vector. If USE_HF_INFERENCE_API=true, sends an HTTP request
    to Hugging Face. Otherwise, loads SentenceTransformer locally.
    Includes a retry loop to handle Hugging Face 503 'Model is loading' events safely.
    """
    import os
    import time
    import requests
    
    use_api = os.getenv("USE_HF_INFERENCE_API", "false").lower() == "true"
    if use_api:
        api_url = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
        token = os.getenv("HF_TOKEN")
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        retries = 6
        delay = 6
        for i in range(retries):
            try:
                res = requests.post(api_url, headers=headers, json={"inputs": text}, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data
                elif res.status_code == 503:
                    try:
                        err_json = res.json()
                        est_time = err_json.get("estimated_time", delay)
                    except:
                        est_time = delay
                    print(f"HF Model is loading, waiting {est_time}s (retry {i+1}/{retries})...")
                    time.sleep(min(est_time, 10))
                    continue
                else:
                    print(f"HF Inference API error ({res.status_code}): {res.text}")
            except Exception as e:
                print(f"HF Inference API exception: {e}")
            
            time.sleep(2)
        print("HF Inference API failed after all retries. Falling back to local model.")
            
    # Local fallback
    embedding_model = get_embedding_model()
    if embedding_model:
        return embedding_model.encode(text).tolist()
    return None

def get_rag_rules_for_reading(
    chart: Dict,
    query_type: str,
    domain: Optional[str] = None,
    ask_text: Optional[str] = None
) -> Dict:
    """
    Gathers relevant classical rules from the database using vector embeddings.
    """
    # 1. Define combinations to query
    active_domain = domain if query_type == "domain" else (domain or "general")
    if query_type == "daily":
        active_domain = "general"
        
    # Get current dasha lord
    dasha_lord = ""
    if chart.get("dashas", {}).get("current", {}):
        dasha_lord = chart["dashas"]["current"]["maha"]
        
    houses_to_check = DOMAIN_HOUSES.get(active_domain, [1, 10, 7])
    karakas = DOMAIN_KARAKAS.get(active_domain, [])
    
    # Build up to 4 search combinations:
    search_queries = []
    
    # Combination 1: Current Dasha Lord (if any)
    if dasha_lord:
        dl_info = next((p for p in chart.get("planets", []) if p["name"] == dasha_lord), None)
        if dl_info:
            search_queries.append({
                "planet": dasha_lord,
                "sign": dl_info.get("sign"),
                "house": dl_info.get("house")
            })
            
    # Combination 2 & 3: Domain Karakas (Venus/Jupiter for relationship, etc.)
    for k in karakas[:2]:
        k_info = next((pl for pl in chart.get("planets", []) if pl["name"] == k), None)
        search_queries.append({
            "planet": k,
            "sign": k_info.get("sign") if k_info else None,
            "house": k_info.get("house") if k_info else None
        })
        
    # Combination 4: Primary House of the Domain
    if houses_to_check:
        primary_h = houses_to_check[0]
        # Check if any planet is in this house
        p_in_h = next((p for p in chart.get("planets", []) if p.get("house") == primary_h), None)
        if p_in_h:
            search_queries.append({
                "planet": p_in_h["name"],
                "sign": p_in_h.get("sign"),
                "house": primary_h
            })
        else:
            search_queries.append({
                "planet": None,
                "sign": None,
                "house": primary_h
            })
            
    # Fallback to general custom question keyword matching if query is 'ask'
    if query_type == "ask" and ask_text:
        for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
            if p.lower() in ask_text.lower():
                p_info = next((pl for pl in chart.get("planets", []) if pl["name"] == p), None)
                if p_info:
                    search_queries.append({
                        "planet": p,
                        "sign": p_info.get("sign"),
                        "house": p_info.get("house")
                    })
                    
    # Deduplicate search combinations
    unique_combinations = []
    seen = set()
    for q in search_queries:
        tup = (q["planet"], q["sign"], q["house"])
        if tup not in seen:
            seen.add(tup)
            unique_combinations.append(q)
            
    # Keep top 4 combinations max
    unique_combinations = unique_combinations[:4]
    
    # 2. Query vector search for each combination
    all_rules = []
    threshold = 0.45
    
    for comb in unique_combinations:
        p_val = comb["planet"] or ""
        s_val = comb["sign"] or ""
        h_val = f"house {comb['house']}" if comb["house"] else ""
        d_val = f"{active_domain} effects" if active_domain else "effects"
        
        q_text = f"{p_val} in {s_val} in {h_val} {d_val}"
        q_text = " ".join(q_text.split())
        
        try:
            emb = get_embedding(q_text)
            if emb:
                # Query domain specific
                res = query_supabase_rpc(emb, active_domain if query_type == "domain" else None, threshold, limit=4)
                all_rules.extend(res)
        except Exception as e:
            print(f"Embedding error for '{q_text}': {e}")
                
    # 3. Deduplicate rules by ID
    deduped_rules = {}
    for r in all_rules:
        deduped_rules[r["id"]] = r
        
    final_rules = list(deduped_rules.values())
    # Sort by similarity desc
    final_rules.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    
    # Keep top 8
    final_rules = final_rules[:8]
    
    # 4. Fetch missing 'domain' field for the final_rules from Supabase REST API (since pgvector RPC does not return it)
    if final_rules and "domain" not in final_rules[0]:
        ids = [r["id"] for r in final_rules]
        load_credentials()
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if supabase_url and supabase_key:
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }
            id_query = ",".join(ids)
            get_url = f"{supabase_url}/rest/v1/corpus_rules?id=in.({id_query})&select=id,domain"
            try:
                domain_res = requests.get(get_url, headers=headers)
                if domain_res.status_code == 200:
                    domain_map = {item["id"]: item["domain"] for item in domain_res.json()}
                    for r in final_rules:
                        r["domain"] = domain_map.get(r["id"], ["general"])
            except Exception as e:
                print(f"Error fetching domains from REST API: {e}")
                
    # Check confidence
    low_confidence = len(final_rules) < 3
    no_rules = len(final_rules) == 0
    
    return {
        "rules": final_rules,
        "low_confidence": low_confidence,
        "no_rules": no_rules
    }

def generate_reading_with_groq(
    chart: Dict,
    query_type: str,
    domain: Optional[str] = None,
    ask_text: Optional[str] = None,
    language: str = "English"
) -> Dict:
    """
    Coordinates RAG rule retrieval and executes text generation via Groq API.
    """
    load_credentials()
    api_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in environment.")
        
    # 1. Fetch RAG rules
    rag_data = get_rag_rules_for_reading(chart, query_type, domain, ask_text)
    
    if rag_data["no_rules"]:
        return {
            "title": "Rare Configuration",
            "summary": "Your birth chart has a unique planetary configuration.",
            "body": "Your chart has a rare configuration — detailed reading coming soon.",
            "remedy": "Engage in regular meditation and maintain mindful daily practices.",
            "sources": []
        }
        
    # 2. Format inputs for Prompt
    # Format Planets
    planets_str = []
    for p in chart.get("planets", []):
        retro = " (Retrograde)" if p.get("retrograde") else ""
        planets_str.append(
            f"- {p['name']}: {p['sign']} at {p['degree']}° in House {p['house']}{retro}, Nakshatra {p['nakshatra']} (Pada {p['pada']})"
        )
    planets_data_text = "\n".join(planets_str)
    
    # Format Yogas
    yogas_str = []
    for y in chart.get("yogas", []):
        yogas_str.append(f"- {y['name']} (Strength: {y['strength']})")
    yogas_data_text = "\n".join(yogas_str) if yogas_str else "None detected"
    
    # Format current Dasha
    dasha_info = chart.get("dashas", {}).get("current", {})
    dasha_text = f"Mahadasha: {dasha_info.get('maha')}, Antardasha: {dasha_info.get('antar')} (Ends: {dasha_info.get('ends_at')})"
    
    # Format Classical Rules
    rules_str = []
    for idx, rule in enumerate(rag_data["rules"]):
        rule_domain = rule.get("domain", ["general"])
        rules_str.append(
            f"Rule {idx+1}: {rule['planet']} in {rule['sign'] or 'any sign'} in house {rule['house'] or 'any house'} ({' | '.join(rule_domain)}):\n"
            f"  Text: {rule['effect']}\n"
            f"  Source: {rule['source_text']} (Strength: {rule['strength']})"
        )
    rules_data_text = "\n\n".join(rules_str)
    
    # 3. System Prompt & Instructions
    word_limit = 300
    if query_type == "domain":
        word_limit = 500
    elif query_type == "ask":
        word_limit = 250
        
    lang_instruction = ""
    if language.lower() == "hindi":
      lang_instruction = "You MUST write all output fields (title, summary, body, remedy) in Hindi using Devanagari script. Use traditional Sanskrit/Vedic terms (such as 'Lagna', 'Rashi', 'Kundli', 'Mahadasha', 'Yoga', 'Shani', 'Grah', 'Bhav') naturally instead of trying to translate them into common literal words."
    elif language.lower() == "hinglish":
      lang_instruction = "You MUST write all output fields (title, summary, body, remedy) in conversational Hinglish (Hindi written using the Latin/English alphabet). Use natural colloquial phrasing (like 'aapki kundli mein', 'saal ke ant tak', 'shubh yog ban raha hai', 'gussa control karna hoga') rather than formal literal translations, and keep classical Vedic nouns intact."
    else:
      lang_instruction = "You MUST write all output fields in English."
        
    system_prompt = f"""You are an expert Vedic astrology (Jyotish) interpreter. Your task is to generate a personalized reading based strictly on the user's birth chart details and the provided classical rules.

CONSTRAINTS & RULES:
1. Base your interpretations strictly on the provided retrieved classical rules. Do not fabricate, hallucinate, or add external Vedic combinations from your training data.
2. Maintain a balanced, supportive, and objective tone.
3. NEVER predict death, terminal/serious illness, accidents, or irreversible misfortune. If a rule points to negative effects, rephrase it constructively using warning or caution terminology.
4. Use probability language, such as 'this period may indicate', 'there could be inclinations toward', or 'it is favorable to'. Never say 'this will definitely cause' or make absolute predictions.
5. You MUST end with exactly one actionable remedy or insight.
6. Word Limit: The reading body must be maximum {word_limit} words.
7. Explain any Vedic terms (e.g. Lagna, Dasha, Rashi, Yoga) briefly the first time you use them.
8. {lang_instruction}
9. Return output strictly in JSON format as specified. Do not include any text outside the JSON object.

JSON OUTPUT SCHEMA:
{{
  "title": "A short, descriptive, and engaging title for this reading",
  "summary": "A concise 2-line summary of the primary planetary influences",
  "body": "The detailed paragraphs of the interpretation, adhering to all tone, safety, and word limit constraints.",
  "remedy": "Exactly one actionable remedy or guidance based on the chart/rules",
  "sources": ["Array of source texts actually referenced in the reading, e.g. ['BPHS Ch.3 v.14', 'Saravali Ch.16 v.8']"]
}}"""

    user_prompt = f"""--- USER BIRTH CHART INFO ---
Lagna: {chart.get('lagna', {}).get('sign')} at {chart.get('lagna', {}).get('degree')}°
Current Dasha: {dasha_text}

Planetary Positions:
{planets_data_text}

Detected Yogas:
{yogas_data_text}

--- APPLICABLE CLASSICAL RULES ---
{rules_data_text}
"""

    if query_type == "ask" and ask_text:
        user_prompt += f"\nUser's Specific Question / Concern: '{ask_text}'"
        
    if chart.get("birth_unknown_time"):
        user_prompt += "\nNOTE: The exact birth time is unknown, so house-dependent placements (except Moon rashi and Nakshatra placements) should be excluded or treated with extreme caution. Base interpretation primarily on planets in signs and general planetary influences."

    # 4. Make request to Groq
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 1024
    }
    
    try:
        res = requests.post(groq_url, headers=headers, json=payload)
        if res.status_code == 200:
            choice = res.json()["choices"][0]["message"]["content"]
            # Clean possible markdown wrappers if LLM returned them inside content
            choice_clean = choice.strip()
            if choice_clean.startswith("```json"):
                choice_clean = choice_clean[7:]
            if choice_clean.endswith("```"):
                choice_clean = choice_clean[:-3]
            choice_clean = choice_clean.strip()
            
            parsed_res = json.loads(choice_clean)
            
            # Append low confidence warning if relevant
            if rag_data["low_confidence"]:
                parsed_res["low_confidence"] = True
                
            return parsed_res
        else:
            raise Exception(f"Groq API returned status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"Error generating reading with Groq: {e}")
        raise e
