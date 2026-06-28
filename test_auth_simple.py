import requests
import json

BASE_URL = "https://bencana-hub.preview.emergentagent.com"

# Test 1: Get CSRF token
print("1. Getting CSRF token...")
session = requests.Session()
csrf_resp = session.get(f"{BASE_URL}/api/auth/csrf")
print(f"   Status: {csrf_resp.status_code}")
print(f"   Response: {csrf_resp.text[:200]}")

if csrf_resp.status_code == 200:
    csrf_data = csrf_resp.json()
    csrf_token = csrf_data.get('csrfToken')
    print(f"   CSRF Token: {csrf_token[:20]}...")
    
    # Test 2: Login
    print("\n2. Attempting login...")
    login_data = {
        "email": "admin@sso.local",
        "password": "Admin12345!",
        "csrfToken": csrf_token,
        "callbackUrl": BASE_URL,
        "json": True
    }
    
    login_resp = session.post(f"{BASE_URL}/api/auth/signin", json=login_data)
    print(f"   Status: {login_resp.status_code}")
    print(f"   Response: {login_resp.text[:500]}")
    print(f"   Cookies: {session.cookies.get_dict()}")
    
    # Test 3: Check session
    print("\n3. Checking session...")
    session_resp = session.get(f"{BASE_URL}/api/auth/session")
    print(f"   Status: {session_resp.status_code}")
    print(f"   Response: {session_resp.text}")
    
    # Test 4: Try to access protected endpoint
    print("\n4. Accessing protected endpoint /api/profile...")
    profile_resp = session.get(f"{BASE_URL}/api/profile")
    print(f"   Status: {profile_resp.status_code}")
    print(f"   Response: {profile_resp.text}")

