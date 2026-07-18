import os
import sys
import re
from fastapi.testclient import TestClient

# Add parent dir to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

# Helper to check for Devanagari characters (Hindi script)
def is_devanagari(text: str) -> bool:
    return bool(re.search(r'[\u0900-\u097F]', text))

def run_interpretation_tests():
    print("=== Running Interpretation & Generation Verification Tests ===")
    
    # 1. First, generate a standard chart
    print("\n[Step 1] Generating birth chart for New Delhi 1990-01-01...")
    chart_res = client.post("/generate", json={
        "dob": "1990-01-01",
        "tob": "12:00",
        "city": "New Delhi"
    })
    assert chart_res.status_code == 200, f"Failed to generate chart: {chart_res.text}"
    chart = chart_res.json()
    print("✓ Birth chart generated successfully.")
    
    # 2. Test 1: Daily Reading (English)
    print("\n[Test 1] Generating Daily Reading (English)...")
    res1 = client.post("/reading/generate", json={
        "chart": chart,
        "query_type": "daily",
        "language": "English"
    })
    assert res1.status_code == 200, f"Test 1 Failed: {res1.text}"
    data1 = res1.json()
    
    # Assert JSON keys
    assert "title" in data1
    assert "summary" in data1
    assert "body" in data1
    assert "remedy" in data1
    assert "sources" in data1
    
    print(f"  Title: {data1['title']}")
    print(f"  Summary: {data1['summary']}")
    print(f"  Body (partial): {data1['body'][:150]}...")
    print(f"  Remedy: {data1['remedy']}")
    print(f"  Sources: {data1['sources']}")
    
    # Word limit check (max 300 words for daily)
    word_count1 = len(data1["body"].split())
    print(f"  Word count: {word_count1} (limit: 300)")
    assert word_count1 <= 350, f"Daily reading exceeds word limit considerably: {word_count1}"
    
    # 3. Test 2: Career Domain Reading (English)
    print("\n[Test 2] Generating Career Domain Reading (English)...")
    res2 = client.post("/reading/generate", json={
        "chart": chart,
        "query_type": "domain",
        "domain": "career",
        "language": "English"
    })
    assert res2.status_code == 200, f"Test 2 Failed: {res2.text}"
    data2 = res2.json()
    
    print(f"  Title: {data2['title']}")
    print(f"  Body (partial): {data2['body'][:150]}...")
    print(f"  Remedy: {data2['remedy']}")
    print(f"  Sources: {data2['sources']}")
    
    word_count2 = len(data2["body"].split())
    print(f"  Word count: {word_count2} (limit: 500)")
    assert word_count2 <= 550, f"Domain reading exceeds word limit: {word_count2}"
    
    # 4. Test 3: Relationship Reading (Hindi - Devanagari)
    print("\n[Test 3] Generating Relationship Reading (Hindi - Devanagari)...")
    res3 = client.post("/reading/generate", json={
        "chart": chart,
        "query_type": "domain",
        "domain": "relationship",
        "language": "Hindi"
    })
    assert res3.status_code == 200, f"Test 3 Failed: {res3.text}"
    data3 = res3.json()
    
    print(f"  Title: {data3['title']}")
    print(f"  Body (partial): {data3['body'][:150]}...")
    print(f"  Remedy: {data3['remedy']}")
    
    # Validate Hindi characters are present
    assert is_devanagari(data3["body"]), "Reading was requested in Hindi but no Devanagari script found!"
    print("✓ Devanagari script verified in Hindi output.")
    
    # 5. Test 4: Ask Custom Question (Hinglish)
    print("\n[Test 4] Custom Question (Hinglish) 'Will Mars in my 10th house help my career?'...")
    res4 = client.post("/reading/generate", json={
        "chart": chart,
        "query_type": "ask",
        "ask_text": "Will Mars in my 10th house help my career?",
        "language": "Hinglish"
    })
    assert res4.status_code == 200, f"Test 4 Failed: {res4.text}"
    data4 = res4.json()
    
    print(f"  Title: {data4['title']}")
    print(f"  Body (partial): {data4['body'][:150]}...")
    print(f"  Remedy: {data4['remedy']}")
    
    # Verify no Devanagari in Hinglish
    assert not is_devanagari(data4["body"]), "Reading was requested in Hinglish but Devanagari script was detected."
    print("✓ Hinglish verified (no Devanagari characters present).")
    
    # 6. Test 5: Unknown Birth Time Reading
    print("\n[Test 5] Ingesting Unknown Birth Time Chart for Reading...")
    chart_unknown_res = client.post("/generate", json={
        "dob": "1990-01-01",
        "tob_unknown": True,
        "city": "New Delhi"
    })
    chart_unknown = chart_unknown_res.json()
    
    res5 = client.post("/reading/generate", json={
        "chart": chart_unknown,
        "query_type": "domain",
        "domain": "spiritual",
        "language": "English"
    })
    assert res5.status_code == 200, f"Test 5 Failed: {res5.text}"
    data5 = res5.json()
    print(f"  Title: {data5['title']}")
    print(f"  Body (partial): {data5['body'][:150]}...")
    print(f"  Sources: {data5['sources']}")
    
    print("\n✓ All 5 interpretation test scenarios completed and verified successfully!")

if __name__ == "__main__":
    run_interpretation_tests()
