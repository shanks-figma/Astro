import os
import sys
from fastapi.testclient import TestClient

# Add parent dir to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

# 10 test queries covering different combinations of planet, sign, house, and domains
TEST_QUERIES = [
    # 1. Exact match for Saturn in Capricorn in 1st house (career/general)
    {"planet": "Saturn", "sign": "Capricorn", "house": 1, "domain": "career"},
    
    # 2. Jupiter in Sagittarius 9th house (wealth/spiritual)
    {"planet": "Jupiter", "sign": "Sagittarius", "house": 9, "domain": "wealth"},
    
    # 3. Mars in Aries 1st house (career/health)
    {"planet": "Mars", "sign": "Aries", "house": 1, "domain": "health"},
    
    # 4. Mars in 7th house (marriage)
    {"planet": "Mars", "house": 7, "domain": "marriage"},
    
    # 5. Moon in Cancer 4th house (relationship/general)
    {"planet": "Moon", "sign": "Cancer", "house": 4, "domain": "relationship"},
    
    # 6. Rahu in 10th house (career)
    {"planet": "Rahu", "house": 10, "domain": "career"},
    
    # 7. Ketu in 12th house (spiritual)
    {"planet": "Ketu", "house": 12, "domain": "spiritual"},
    
    # 8. Sun in Leo 1st house (career/general)
    {"planet": "Sun", "sign": "Leo", "house": 1, "domain": "general"},
    
    # 9. Venus in Taurus 7th house (marriage/wealth)
    {"planet": "Venus", "sign": "Taurus", "house": 7, "domain": "wealth"},
    
    # 10. Fallback Case: Query domain that doesn't have many rules for Moon in Scorpio in 8th house,
    # ensuring fallback to no-domain returns the correct rules
    {"planet": "Moon", "sign": "Scorpio", "house": 8, "domain": "career"}
]

def run_retrieval_tests():
    print("=== Running RAG Retrieval Verification Tests ===")
    
    for idx, query in enumerate(TEST_QUERIES, start=1):
        print(f"\nQuery {idx}: Params={query}")
        
        # Call the GET /retrieve endpoint
        response = client.get("/retrieve", params=query)
        
        if response.status_code != 200:
            print(f"✗ Failed: Status code {response.status_code} - {response.text}")
            sys.exit(1)
            
        data = response.json()
        query_text = data.get("query")
        results = data.get("rules", [])
        count = data.get("results_count", 0)
        
        print(f"  Generated Search Text: '{query_text}'")
        print(f"  Results Found: {count}")
        
        # Assert at least 1 result is returned
        if not results:
            print(f"✗ Failed: No matching rules returned for query.")
            sys.exit(1)
            
        # Print top matches
        for i, rule in enumerate(results[:2]):
            print(f"  Match {i+1}:")
            print(f"    Planet/Sign/House: {rule.get('planet')} / {rule.get('sign')} / House {rule.get('house')}")
            print(f"    Effect: {rule.get('effect')}")
            print(f"    Source: {rule.get('source_text')}")
            print(f"    Similarity: {rule.get('similarity'):.4f}")
            
            # Assert similarity is above threshold
            assert rule.get("similarity") >= 0.60, f"Similarity {rule.get('similarity')} is below threshold of 0.60"
            
    print("\n✓ All 10 retrieval queries completed and verified successfully!")

if __name__ == "__main__":
    run_retrieval_tests()
