import requests

BASE_URL = "https://bencana-hub.preview.emergentagent.com"

# Test with form data instead of JSON
print("Testing NextAuth login with form data...")
session = requests.Session()

# Get CSRF token
csrf_resp = session.get(f"{BASE_URL}/api/auth/csrf")
csrf_token = csrf_resp.json().get('csrfToken')
print(f"1. CSRF Token: {csrf_token[:20]}...")

# Login with form data
login_data = {
    "email": "admin@sso.local",
    "password": "Admin12345!",
    "csrfToken": csrf_token,
    "callbackUrl": BASE_URL,
    "json": "true"
}

print("\n2. Attempting login with form data...")
login_resp = session.post(
    f"{BASE_URL}/api/auth/callback/credentials",
    data=login_data,
    allow_redirects=False
)
print(f"   Status: {login_resp.status_code}")
print(f"   Headers: {dict(login_resp.headers)}")
print(f"   Cookies after login: {session.cookies.get_dict()}")

# Check session
print("\n3. Checking session...")
session_resp = session.get(f"{BASE_URL}/api/auth/session")
print(f"   Status: {session_resp.status_code}")
print(f"   Session: {session_resp.text}")

# Try protected endpoint
print("\n4. Accessing /api/profile...")
profile_resp = session.get(f"{BASE_URL}/api/profile")
print(f"   Status: {profile_resp.status_code}")
print(f"   Response: {profile_resp.text[:200]}")

