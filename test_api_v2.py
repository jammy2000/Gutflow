import urllib.request
import urllib.error
import urllib.parse
import json
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_api():
    print("Testing /api/generate-plan Integration for Task 3...")
    
    # We use a distinct ID so we can look it up in Supabase if needed
    test_id = f"test-run-{int(time.time())}"
    
    payload = {
        "meal_plan_id": test_id, 
        "duration_days": 1,
        "people": 2,
        "diet_type": ["low-fodmap"],
        "budget_usd": 30,
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request("http://localhost:3000/api/generate-plan", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print("✅ Successfully got response from API!")
            print(json.dumps(res_data, indent=2))
            print(f"\nNext Steps: Check Supabase 'meal_plans' and 'shopping_lists' for ID: {test_id}")
                
    except urllib.error.URLError as e:
        print(f"❌ HTTP Error: {e}")
        try:
            print("Error body:", e.read().decode('utf-8'))
        except:
            pass

if __name__ == "__main__":
    test_api()
