import csv
import os
import sys
import json
import requests
from dotenv import load_dotenv

# Try to import sentence-transformers
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("Error: sentence-transformers is not installed. Please install it using pip.")
    sys.exit(1)

# Load env variables from root or current folder
load_dotenv()
load_dotenv("../../.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../corpus_sample.csv"))

VALID_PLANETS = {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", None}
VALID_SIGNS = {
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", None
}
VALID_STRENGTHS = {"definitive", "moderate", "conditional"}

def validate_row(row: dict, line: int) -> dict:
    """
    Validates a row from the CSV and returns a cleaned dict.
    Raises ValueError on validation failures.
    """
    planet = row.get("planet", "").strip() or None
    sign = row.get("sign", "").strip() or None
    house_str = row.get("house", "").strip()
    aspect_from = row.get("aspect_from", "").strip() or None
    domains_str = row.get("domains", "").strip()
    effect = row.get("effect", "").strip()
    source_text = row.get("source_text", "").strip()
    is_positive_str = row.get("is_positive", "").strip().lower()
    strength = row.get("strength", "").strip().lower()
    
    # 1. Check planet
    if planet not in VALID_PLANETS:
        raise ValueError(f"Line {line}: Invalid planet '{planet}'")
        
    # 2. Check sign
    if sign not in VALID_SIGNS:
        raise ValueError(f"Line {line}: Invalid sign '{sign}'")
        
    # 3. Check house
    house = None
    if house_str:
        try:
            house = int(house_str)
            if not (1 <= house <= 12):
                raise ValueError()
        except ValueError:
            raise ValueError(f"Line {line}: Invalid house '{house_str}' (must be 1-12)")
            
    # 4. Check domain
    if not domains_str:
        raise ValueError(f"Line {line}: Domains field is required")
    domains_list = [d.strip() for d in domains_str.split("|") if d.strip()]
    
    # 5. Check effect
    if not effect:
        raise ValueError(f"Line {line}: Effect field is required")
    if len(effect) > 300:
        raise ValueError(f"Line {line}: Effect exceeds 300 characters limit ({len(effect)} chars)")
        
    # 6. Check source_text
    if not source_text:
        raise ValueError(f"Line {line}: Source text is required")
        
    # 7. Check is_positive
    is_positive = None
    if is_positive_str:
        if is_positive_str in ("true", "1", "yes"):
            is_positive = True
        elif is_positive_str in ("false", "0", "no"):
            is_positive = False
            
    # 8. Check strength
    if strength not in VALID_STRENGTHS:
        raise ValueError(f"Line {line}: Invalid strength '{strength}' (must be definitive, moderate, conditional)")
        
    # 9. At least one of planet, sign, or house must be set
    if not planet and not sign and not house:
        raise ValueError(f"Line {line}: At least one of planet, sign, or house must be specified.")
        
    return {
        "planet": planet,
        "sign": sign,
        "house": house,
        "aspect_from": aspect_from,
        "domain": domains_list,
        "effect": effect,
        "source_text": source_text,
        "is_positive": is_positive,
        "strength": strength
    }

def run_ingestion():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in the environment.")
        print("Please check your .env file.")
        sys.exit(1)
        
    print(f"Reading rules from: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at '{CSV_PATH}'")
        sys.exit(1)
        
    # 1. Parse and validate CSV rows
    valid_rules = []
    with open(CSV_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2):
            try:
                cleaned_row = validate_row(row, idx)
                valid_rules.append(cleaned_row)
            except ValueError as e:
                print(f"Validation Error: {e}")
                sys.exit(1)
                
    print(f"Successfully validated {len(valid_rules)} rules in CSV.")
    
    # 2. Fetch existing rules from Supabase to check duplicates
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Check if table exists by doing a select limit 1
    test_url = f"{SUPABASE_URL}/rest/v1/corpus_rules?select=id&limit=1"
    try:
        test_res = requests.get(test_url, headers=headers)
        if test_res.status_code != 200:
            print(f"Error connecting to Supabase: {test_res.status_code} - {test_res.text}")
            print("Please make sure you have executed the tables setup in schema.sql in your Supabase SQL Editor first!")
            sys.exit(1)
    except Exception as e:
        print(f"Connection error to Supabase: {e}")
        sys.exit(1)
        
    # Get existing planet/sign/house/effect to deduplicate
    get_url = f"{SUPABASE_URL}/rest/v1/corpus_rules?select=planet,sign,house,effect"
    res = requests.get(get_url, headers=headers)
    existing_hashes = set()
    if res.status_code == 200:
        for r in res.json():
            h = (r.get("planet"), r.get("sign"), r.get("house"), r.get("effect"))
            existing_hashes.add(h)
            
    # 3. Deduplicate
    new_rules = []
    for r in valid_rules:
        h = (r["planet"], r["sign"], r["house"], r["effect"])
        if h in existing_hashes:
            print(f"Skipping duplicate: {r['planet'] or ''} in {r['sign'] or ''} house {r['house'] or ''}: {r['effect'][:40]}...")
        else:
            new_rules.append(r)
            
    if not new_rules:
        print("No new rules to ingest. Ingestion completed.")
        sys.exit(0)
        
    print(f"Deduplication completed. Ingesting {len(new_rules)} new rules.")
    
    # 4. Generate Embeddings using SentenceTransformer locally
    print("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    embedding_inputs = []
    for r in new_rules:
        # Prepare embedding input: '{planet} in {sign} in house {house}: {effect} [{domains}]'
        p_str = r["planet"] or ""
        s_str = r["sign"] or ""
        h_str = f"house {r['house']}" if r["house"] else ""
        text = f"{p_str} in {s_str} in {h_str}: {r['effect']} [{'|'.join(r['domain'])}]"
        # Clean double spaces
        text = " ".join(text.split())
        embedding_inputs.append(text)
        
    print(f"Generating embeddings for {len(new_rules)} entries...")
    embeddings = model.encode(embedding_inputs)
    print("Embeddings generated successfully!")
    
    # 5. Insert Rules into Supabase
    upload_payload = []
    for idx, r in enumerate(new_rules):
        rule_data = {
            "planet": r["planet"],
            "sign": r["sign"],
            "house": r["house"],
            "aspect_from": r["aspect_from"],
            "domain": r["domain"],
            "effect": r["effect"],
            "source_text": r["source_text"],
            "is_positive": r["is_positive"],
            "strength": r["strength"],
            "embedding": embeddings[idx].tolist(),
            "corpus_version": 1,
            "active": True
        }
        upload_payload.append(rule_data)
        
    post_url = f"{SUPABASE_URL}/rest/v1/corpus_rules"
    post_res = requests.post(post_url, headers=headers, json=upload_payload)
    if post_res.status_code not in (200, 201):
        print(f"Error inserting rules: {post_res.status_code} - {post_res.text}")
        sys.exit(1)
        
    print("✓ Successfully uploaded rules to public.corpus_rules table.")
    
    # 6. Update corpus_versions table
    version_payload = {
        "version": 1,
        "rules_added": len(new_rules),
        "rules_updated": 0,
        "changelog": "Initial ingestion of 20 sample rules using local SentenceTransformer all-MiniLM-L6-v2"
    }
    
    v_url = f"{SUPABASE_URL}/rest/v1/corpus_versions"
    # Use POST with Upsert capability (Prefer: resolution=merge-duplicates)
    v_headers = {**headers, "Prefer": "resolution=merge-duplicates"}
    v_res = requests.post(v_url, headers=v_headers, json=version_payload)
    if v_res.status_code not in (200, 201):
        print(f"Warning: Failed to update corpus_versions: {v_res.status_code} - {v_res.text}")
        
    print(f"✓ Ingestion complete! Total new rules added: {len(new_rules)}.")

if __name__ == "__main__":
    run_ingestion()
