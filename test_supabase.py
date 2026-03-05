import urllib.request
import urllib.error
import urllib.parse
import json
import time
import ssl

SUPABASE_URL = "https://hqzfdiogmjizaeaurwkc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcXpmaW9nbWppemFlYXVyd2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxNjY5MTAsImV4cCI6MjAyMjc0MjkxMH0.fM9W7sK2rM03zT3T7yT1K38R7w2kU5sH5Z9t7Y1X7U4"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Bypass SSL
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_insert_and_fetch():
    print("Testing Task 1 Insert to meal_plans...")
    
    payload = {
        "duration_days": 7,
        "people": 2,
        "diet_type": ["vegetarian"],
        "retailer": "walmart",
        "fulfillment_mode": "pickup",
        "budget_usd": 150,
        "estimate_mode": True,
        "status": "draft"
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/meal_plans", data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if not res_data:
                print("❌ Inserted successfully but no data returned")
                return
                
            plan = res_data[0]
            print("✅ Successfully inserted test plan!")
            print(f"Plan ID: {plan['id']}")
            
            # Fetch
            time.sleep(1)
            print("\nTesting Task 1 Select...")
            fetch_req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/meal_plans?id=eq.{plan['id']}", headers=headers, method="GET")
            with urllib.request.urlopen(fetch_req, context=ctx) as fetch_res:
                fetch_data = json.loads(fetch_res.read().decode('utf-8'))
                if fetch_data:
                    print(f"✅ Successfully fetched test plan: {fetch_data[0]['id']}")
                else:
                    print("❌ Fetch returned empty list")
                    
            # Cleanup
            delete_req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/meal_plans?id=eq.{plan['id']}", headers=headers, method="DELETE")
            with urllib.request.urlopen(delete_req, context=ctx) as delete_res:
                print("🧹 Cleaned up test record.")
                
    except urllib.error.URLError as e:
        print(f"❌ HTTP Error: {e}")

if __name__ == "__main__":
    test_insert_and_fetch()
