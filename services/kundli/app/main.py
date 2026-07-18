from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
import requests
from dotenv import load_dotenv

from app.geocoder import geocode_city, get_historical_offset_and_utc
from app.calculator import calculate_birth_chart
from app.interpretation import generate_reading_with_groq
from app.model_loader import get_embedding_model

# Load env variables
load_dotenv()
load_dotenv("../../.env")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

app = FastAPI(title="Jyotish AI Calculation & Retrieval Service")

class ChartGenerateRequest(BaseModel):
    dob: str  # YYYY-MM-DD
    tob: Optional[str] = "12:00"  # HH:MM
    tob_unknown: bool = False
    city: str
    ayanamsa: Optional[str] = "lahiri"

class ReadingGenerateRequest(BaseModel):
    chart: dict
    query_type: str  # daily | domain | ask | dasha_alert | transit_alert
    domain: Optional[str] = None  # career | relationship | health | wealth | spiritual
    ask_text: Optional[str] = None
    language: Optional[str] = "English"

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Jyotish AI Calculation & Retrieval Service"}

@app.post("/generate")
def generate_chart(req: ChartGenerateRequest):
    try:
        # If TOB is unknown, default to 12:00 noon as per spec
        birth_tob = "12:00" if req.tob_unknown else (req.tob or "12:00")
        
        # 1. Geocode birth city to get lat, lng, and timezone
        geo_info = geocode_city(req.city)
        lat = geo_info["latitude"]
        lng = geo_info["longitude"]
        tz_name = geo_info["timezone"]
        
        # 2. Get UTC time and UTC offset at birth date/time
        utc_offset, utc_dt = get_historical_offset_and_utc(req.dob, birth_tob, tz_name)
        
        # 3. Calculate sidereal birth chart
        chart_result = calculate_birth_chart(
            birth_utc_dt=utc_dt,
            latitude=lat,
            longitude=lng,
            ayanamsa=req.ayanamsa or "lahiri"
        )
        
        # 4. Inject metadata
        chart_result["birth_unknown_time"] = req.tob_unknown
        chart_result["metadata"] = {
            "latitude": lat,
            "longitude": lng,
            "timezone": tz_name,
            "utc_offset": utc_offset,
            "utc_datetime": utc_dt.isoformat()
        }
        
        # If Lagna is unknown (birth time unknown), we strip or mark Lagna-dependent readings
        if req.tob_unknown:
            chart_result["lagna"] = {
                "sign": "Unknown",
                "degree": 0.0
            }
            chart_result["houses"] = []
            for p in chart_result["planets"]:
                p["house"] = 0
            chart_result["yogas"] = []
            
        return chart_result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retrieve")
def retrieve_corpus_rules(
    planet: Optional[str] = Query(None),
    sign: Optional[str] = Query(None),
    house: Optional[int] = Query(None),
    domain: Optional[str] = Query(None),
    threshold: float = 0.60,
    limit: int = 8
):
    """
    Retrieves the top-8 matching rules using pgvector cosine similarity.
    Falls back to no-domain filter if fewer than 3 results are returned.
    """
    embedding_model = get_embedding_model()
    if not embedding_model:
        raise HTTPException(status_code=500, detail="SentenceTransformer model not loaded.")
        
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials missing.")
        
    # 1. Build search query text
    p_str = planet or ""
    s_str = sign or ""
    h_str = f"house {house}" if house else ""
    d_str = f"{domain} effects" if domain else "effects"
    
    query_text = f"{p_str} in {s_str} in {h_str} {d_str}"
    # Clean double spaces
    query_text = " ".join(query_text.split())
    
    # 2. Generate embedding vector
    try:
        embedding = embedding_model.encode(query_text).tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")
        
    # 3. Call Supabase match_corpus_rules RPC
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    post_url = f"{SUPABASE_URL}/rest/v1/rpc/match_corpus_rules"
    
    def fetch_results(filter_d):
        payload = {
            "query_embedding": embedding,
            "filter_domain": filter_d,
            "similarity_threshold": threshold,
            "match_count": limit
        }
        res = requests.post(post_url, headers=headers, json=payload)
        if res.status_code == 200:
            return res.json()
        else:
            print(f"RPC Error: {res.status_code} - {res.text}")
            return []
            
    # Try fetching with the domain filter first
    results = fetch_results(domain)
    
    # Fallback to no-domain filter if fewer than 3 results returned
    if len(results) < 3 and domain is not None:
        print(f"Only got {len(results)} results with domain filter '{domain}'. Falling back to no-domain filter.")
        results = fetch_results(None)
        
    return {
        "query": query_text,
        "results_count": len(results),
        "rules": results
    }

@app.post("/reading/generate")
def generate_reading(req: ReadingGenerateRequest):
    """
    HTTP POST endpoint to generate a personalized reading from chart details.
    """
    try:
        reading_result = generate_reading_with_groq(
            chart=req.chart,
            query_type=req.query_type,
            domain=req.domain,
            ask_text=req.ask_text,
            language=req.language or "English"
        )
        return reading_result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
