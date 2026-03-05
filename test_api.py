import urllib.request
import urllib.error
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_api():
    print("Testing /api/generate-plan integration locally...")
    
    payload = {
        "meal_plan_id": "demo", 
        "duration_days": 2,
        "people": 2,
        "diet_type": ["vegetarian"],
        "budget_usd": 50,
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request("http://localhost:3000/api/generate-plan", data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print("✅ Successfully got response from API!")
            print(json.dumps(res_data, indent=2))
                
    except urllib.error.URLError as e:
        print(f"❌ HTTP Error: {e}")
        try:
            print("Error body:", e.read().decode('utf-8'))
        except:
            pass

if __name__ == "__main__":
    test_api()
