#!/usr/bin/env python3
"""
SiagaSekitar Backend API Test Suite - MongoDB Migration Regression Test
Tests all backend endpoints after PostgreSQL -> MongoDB migration
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = "https://bencana-hub.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDS = {"email": "admin@sso.local", "password": "Admin12345!"}
USER1_CREDS = {"email": "bupatimagetan@userbupati.com", "password": "bupatimagetan"}
USER2_CREDS = {"email": "kepala.dinas.pariwisata.jatim@userpariwisata.com", "password": "pariwisatajatim"}
USER3_CREDS = {"email": "kepala.dinas.pendidikan.jatim@userpendidikan.com", "password": "pendidikanjatim"}

# Global session storage
sessions = {}
test_data = {}

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_result(success, msg):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {msg}")

def login(creds, label):
    """Login via NextAuth and return session"""
    print_test(f"Login as {label}")
    
    session = requests.Session()
    
    # Get CSRF token
    csrf_resp = session.get(f"{API_URL}/auth/csrf")
    if csrf_resp.status_code != 200:
        print_result(False, f"Failed to get CSRF token: {csrf_resp.status_code}")
        return None
    
    csrf_token = csrf_resp.json().get('csrfToken')
    
    # Login with form data (NextAuth expects form-encoded data)
    login_data = {
        "email": creds["email"],
        "password": creds["password"],
        "csrfToken": csrf_token,
        "callbackUrl": BASE_URL,
        "json": "true"
    }
    
    resp = session.post(
        f"{API_URL}/auth/callback/credentials",
        data=login_data,
        allow_redirects=False
    )
    
    if resp.status_code == 200:
        # Check if session was created
        session_resp = session.get(f"{API_URL}/auth/session")
        if session_resp.status_code == 200:
            session_data = session_resp.json()
            if session_data.get('user'):
                print_result(True, f"Login successful for {label}")
                print(f"   Email: {session_data['user']['email']}")
                print(f"   Role: {session_data['user']['role']}")
                return session
    
    print_result(False, f"Login failed: {resp.status_code}")
    return None

def test_auth():
    """Test 1: Authentication"""
    print_test("AUTHENTICATION TESTS")
    
    # Test admin login
    admin_session = login(ADMIN_CREDS, "Admin (SSO)")
    if admin_session:
        sessions['admin'] = admin_session
        # Verify role by getting profile
        resp = admin_session.get(f"{API_URL}/profile")
        if resp.status_code == 200:
            profile = resp.json().get('profile', {})
            if profile.get('role') == 'SSO':
                print_result(True, f"Admin role verified: SSO")
            else:
                print_result(False, f"Admin role incorrect: {profile.get('role')}")
        else:
            print_result(False, f"Failed to get admin profile: {resp.status_code}")
    
    # Test user logins
    user1_session = login(USER1_CREDS, "User 1 (Bupati Magetan)")
    if user1_session:
        sessions['user1'] = user1_session
        resp = user1_session.get(f"{API_URL}/profile")
        if resp.status_code == 200:
            profile = resp.json().get('profile', {})
            test_data['user1_id'] = profile.get('id')
            if profile.get('role') == 'USER':
                print_result(True, f"User1 role verified: USER")
            else:
                print_result(False, f"User1 role incorrect: {profile.get('role')}")
    
    user2_session = login(USER2_CREDS, "User 2 (Kadis Pariwisata)")
    if user2_session:
        sessions['user2'] = user2_session
        resp = user2_session.get(f"{API_URL}/profile")
        if resp.status_code == 200:
            profile = resp.json().get('profile', {})
            test_data['user2_id'] = profile.get('id')
            print_result(True, f"User2 login successful")
    
    user3_session = login(USER3_CREDS, "User 3 (Kadis Pendidikan)")
    if user3_session:
        sessions['user3'] = user3_session
        resp = user3_session.get(f"{API_URL}/profile")
        if resp.status_code == 200:
            profile = resp.json().get('profile', {})
            test_data['user3_id'] = profile.get('id')
            print_result(True, f"User3 login successful")
    
    # Test wrong password
    print_test("Test wrong password rejection")
    wrong_creds = {"email": ADMIN_CREDS["email"], "password": "wrongpassword"}
    
    session = requests.Session()
    csrf_resp = session.get(f"{API_URL}/auth/csrf")
    csrf_token = csrf_resp.json().get('csrfToken')
    
    login_data = {
        "email": wrong_creds["email"],
        "password": wrong_creds["password"],
        "csrfToken": csrf_token,
        "callbackUrl": BASE_URL,
        "json": "true"
    }
    
    resp = session.post(f"{API_URL}/auth/callback/credentials", data=login_data, allow_redirects=False)
    
    # Check if session was created
    session_resp = session.get(f"{API_URL}/auth/session")
    session_data = session_resp.json()
    
    if not session_data.get('user'):
        print_result(True, "Wrong password correctly rejected")
    else:
        print_result(False, "Wrong password was NOT rejected!")
    
    # Test register endpoint
    print_test("Test user registration")
    new_user = {
        "email": f"testuser_{datetime.now().timestamp()}@test.com",
        "password": "TestPass123!",
        "fullName": "Test User Registration",
        "homeLat": -7.2756,
        "homeLng": 112.6426,
        "kelurahan": "Gubeng",
        "kecamatan": "Gubeng",
        "kota": "Surabaya",
        "provinsi": "Jawa Timur"
    }
    
    resp = requests.post(f"{API_URL}/register", json=new_user)
    if resp.status_code == 200:
        data = resp.json()
        if 'user' in data and data['user'].get('email') == new_user['email']:
            print_result(True, f"User registration successful: {data['user']['email']}")
            test_data['registered_user_id'] = data['user']['id']
        else:
            print_result(False, f"Registration response missing user data: {data}")
    else:
        print_result(False, f"Registration failed: {resp.status_code} - {resp.text}")

def test_categories():
    """Test 2: Categories CRUD"""
    print_test("CATEGORIES TESTS")
    
    admin = sessions.get('admin')
    if not admin:
        print_result(False, "No admin session available")
        return
    
    # Get all categories
    print_test("GET /api/categories - should return 8 seeded categories")
    resp = admin.get(f"{API_URL}/categories")
    if resp.status_code == 200:
        data = resp.json()
        categories = data.get('categories', [])
        print_result(True, f"Got {len(categories)} categories")
        
        # Check for expected categories
        expected = ["Banjir", "Gempa Bumi", "Angin Puting Beliung", "Kabut", 
                   "Hujan Ringan", "Hujan Sedang", "Hujan Lebat", "Hujan Lebat Berpetir"]
        found_names = [c['name'] for c in categories]
        
        for exp in expected:
            if exp in found_names:
                print(f"   ✓ Found: {exp}")
            else:
                print(f"   ✗ Missing: {exp}")
        
        # Store a category ID for later tests
        if categories:
            test_data['category_id'] = categories[0]['id']
    else:
        print_result(False, f"Failed to get categories: {resp.status_code} - {resp.text}")
    
    # Test search filtering
    print_test("GET /api/categories?search=Hujan - should return 4 categories")
    resp = admin.get(f"{API_URL}/categories?search=Hujan")
    if resp.status_code == 200:
        data = resp.json()
        categories = data.get('categories', [])
        if len(categories) == 4:
            print_result(True, f"Search 'Hujan' returned {len(categories)} categories")
            for c in categories:
                print(f"   - {c['name']}")
        else:
            print_result(False, f"Search 'Hujan' returned {len(categories)} categories, expected 4")
    else:
        print_result(False, f"Search failed: {resp.status_code}")
    
    # Create a new category
    print_test("POST /api/categories - create new category")
    new_cat = {
        "code": "TEST_CAT",
        "name": "Test Category",
        "description": "Category for testing"
    }
    resp = admin.post(f"{API_URL}/categories", json=new_cat)
    if resp.status_code == 200:
        data = resp.json()
        if 'category' in data:
            test_data['test_category_id'] = data['category']['id']
            print_result(True, f"Created category: {data['category']['name']}")
        else:
            print_result(False, f"Create response missing category: {data}")
    else:
        print_result(False, f"Create failed: {resp.status_code} - {resp.text}")
    
    # Update the category
    if 'test_category_id' in test_data:
        print_test("PUT /api/categories/{id} - update category")
        update_data = {
            "name": "Test Category Updated",
            "description": "Updated description",
            "isActive": True
        }
        resp = admin.put(f"{API_URL}/categories/{test_data['test_category_id']}", json=update_data)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('category', {}).get('name') == "Test Category Updated":
                print_result(True, "Category updated successfully")
            else:
                print_result(False, f"Update didn't change name: {data}")
        else:
            print_result(False, f"Update failed: {resp.status_code} - {resp.text}")
        
        # Soft delete the category
        print_test("DELETE /api/categories/{id} - soft delete")
        resp = admin.delete(f"{API_URL}/categories/{test_data['test_category_id']}")
        if resp.status_code == 200:
            print_result(True, "Category soft-deleted")
            
            # Verify it appears with deletedAt in admin list
            resp = admin.get(f"{API_URL}/categories")
            if resp.status_code == 200:
                categories = resp.json().get('categories', [])
                deleted_cat = next((c for c in categories if c['id'] == test_data['test_category_id']), None)
                if deleted_cat and deleted_cat.get('deletedAt'):
                    print_result(True, f"Deleted category appears with deletedAt: {deleted_cat['deletedAt']}")
                else:
                    print_result(False, "Deleted category not found or missing deletedAt")
        else:
            print_result(False, f"Delete failed: {resp.status_code}")
        
        # Restore the category
        print_test("POST /api/categories/{id}/restore - restore deleted category")
        resp = admin.post(f"{API_URL}/categories/{test_data['test_category_id']}/restore")
        if resp.status_code == 200:
            print_result(True, "Category restored")
            
            # Verify deletedAt is null
            resp = admin.get(f"{API_URL}/categories")
            if resp.status_code == 200:
                categories = resp.json().get('categories', [])
                restored_cat = next((c for c in categories if c['id'] == test_data['test_category_id']), None)
                if restored_cat and restored_cat.get('deletedAt') is None:
                    print_result(True, "Restored category has deletedAt=null")
                else:
                    print_result(False, f"Restored category still has deletedAt: {restored_cat}")
        else:
            print_result(False, f"Restore failed: {resp.status_code}")

def test_events_and_notifications():
    """Test 3: Events + Publishing + Notifications"""
    print_test("EVENTS + PUBLISH + NOTIFICATIONS TESTS")
    
    admin = sessions.get('admin')
    if not admin:
        print_result(False, "No admin session available")
        return
    
    # Create an event in Surabaya with large radii
    print_test("POST /api/events - create event in Surabaya")
    
    if 'category_id' not in test_data:
        print_result(False, "No category_id available for event creation")
        return
    
    event_time = (datetime.now() + timedelta(hours=1)).isoformat()
    new_event = {
        "categoryId": test_data['category_id'],
        "title": "Test Banjir Surabaya",
        "description": "Test event for notification generation",
        "eventTime": event_time,
        "locationLat": -7.2756,
        "locationLng": 112.6426,
        "kelurahan": "Gubeng",
        "kecamatan": "Gubeng",
        "kota": "Surabaya",
        "dangerRadiusM": 50000,  # 50km danger radius
        "warningRadiusM": 100000  # 100km warning radius
    }
    
    resp = admin.post(f"{API_URL}/events", json=new_event)
    if resp.status_code == 200:
        data = resp.json()
        if 'event' in data:
            test_data['test_event_id'] = data['event']['id']
            print_result(True, f"Created event: {data['event']['title']}")
        else:
            print_result(False, f"Create response missing event: {data}")
    else:
        print_result(False, f"Create event failed: {resp.status_code} - {resp.text}")
        return
    
    # Publish the event
    print_test("POST /api/events/{id}/publish - publish event and generate notifications")
    resp = admin.post(f"{API_URL}/events/{test_data['test_event_id']}/publish")
    if resp.status_code == 200:
        data = resp.json()
        notifications_created = data.get('notificationsCreated', 0)
        print_result(True, f"Event published, {notifications_created} notifications created")
        
        if notifications_created > 0:
            print(f"   ✓ Notifications generated for users within radius")
        else:
            print(f"   ⚠ No notifications created - users may be outside radius")
        
        # Verify event status is PUBLISHED
        resp = admin.get(f"{API_URL}/events")
        if resp.status_code == 200:
            events = resp.json().get('events', [])
            published_event = next((e for e in events if e['id'] == test_data['test_event_id']), None)
            if published_event:
                if published_event.get('status') == 'PUBLISHED':
                    print_result(True, f"Event status is PUBLISHED")
                    if published_event.get('publishedAt'):
                        print(f"   publishedAt: {published_event['publishedAt']}")
                else:
                    print_result(False, f"Event status is {published_event.get('status')}, expected PUBLISHED")
    else:
        print_result(False, f"Publish failed: {resp.status_code} - {resp.text}")
    
    # Test idempotency - publish again
    print_test("POST /api/events/{id}/publish - test idempotency (publish again)")
    resp = admin.post(f"{API_URL}/events/{test_data['test_event_id']}/publish")
    if resp.status_code == 200:
        data = resp.json()
        notifications_created = data.get('notificationsCreated', 0)
        if notifications_created == 0:
            print_result(True, "Idempotency verified - no duplicate notifications created")
        else:
            print_result(False, f"Idempotency FAILED - {notifications_created} duplicate notifications created!")
    else:
        print_result(False, f"Second publish failed: {resp.status_code}")
    
    # Check notifications as a user
    print_test("GET /api/notifications - check user notifications")
    user1 = sessions.get('user1')
    if user1:
        resp = user1.get(f"{API_URL}/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get('notifications', [])
            print_result(True, f"User has {len(notifications)} notifications")
            
            # Find notification for our test event
            test_notif = next((n for n in notifications if n.get('eventId') == test_data['test_event_id']), None)
            if test_notif:
                print(f"   ✓ Notification found for test event")
                print(f"   Priority: {test_notif.get('priority')}")
                print(f"   Distance: {test_notif.get('distanceM')}m")
                print(f"   Event: {test_notif.get('event', {}).get('title')}")
                print(f"   Category: {test_notif.get('event', {}).get('category', {}).get('name')}")
            else:
                print(f"   ⚠ No notification found for test event (user may be outside radius)")
        else:
            print_result(False, f"Get notifications failed: {resp.status_code}")
    
    # Test GET /api/events with search
    print_test("GET /api/events?search=Banjir - test search")
    resp = admin.get(f"{API_URL}/events?search=Banjir")
    if resp.status_code == 200:
        data = resp.json()
        events = data.get('events', [])
        print_result(True, f"Search returned {len(events)} events")
    else:
        print_result(False, f"Search failed: {resp.status_code}")
    
    # Test pagination
    print_test("GET /api/events?page=1&limit=5 - test pagination")
    resp = admin.get(f"{API_URL}/events?page=1&limit=5")
    if resp.status_code == 200:
        data = resp.json()
        pagination = data.get('pagination', {})
        print_result(True, f"Pagination: page {pagination.get('page')}, total {pagination.get('total')}")
    else:
        print_result(False, f"Pagination failed: {resp.status_code}")
    
    # Update event
    print_test("PUT /api/events/{id} - update event")
    update_data = {
        "title": "Test Banjir Surabaya UPDATED",
        "description": "Updated description"
    }
    resp = admin.put(f"{API_URL}/events/{test_data['test_event_id']}", json=update_data)
    if resp.status_code == 200:
        data = resp.json()
        if data.get('event', {}).get('title') == "Test Banjir Surabaya UPDATED":
            print_result(True, "Event updated successfully")
        else:
            print_result(False, f"Update didn't change title: {data}")
    else:
        print_result(False, f"Update failed: {resp.status_code}")
    
    # Soft delete event
    print_test("DELETE /api/events/{id} - soft delete event")
    resp = admin.delete(f"{API_URL}/events/{test_data['test_event_id']}")
    if resp.status_code == 200:
        print_result(True, "Event soft-deleted")
    else:
        print_result(False, f"Delete failed: {resp.status_code}")
    
    # Restore event
    print_test("POST /api/events/{id}/restore - restore event")
    resp = admin.post(f"{API_URL}/events/{test_data['test_event_id']}/restore")
    if resp.status_code == 200:
        print_result(True, "Event restored")
    else:
        print_result(False, f"Restore failed: {resp.status_code}")

def test_password_reset():
    """Test 4: Password Reset"""
    print_test("PASSWORD RESET TESTS")
    
    admin = sessions.get('admin')
    if not admin or 'user1_id' not in test_data:
        print_result(False, "No admin session or user1_id available")
        return
    
    # Admin reset user password
    print_test("POST /api/users/{id}/reset-password - admin resets user password to 12345678")
    resp = admin.post(f"{API_URL}/users/{test_data['user1_id']}/reset-password")
    if resp.status_code == 200:
        print_result(True, "Admin reset password successful")
        
        # Verify user can login with new password
        print_test("Verify user can login with reset password (12345678)")
        reset_creds = {"email": USER1_CREDS["email"], "password": "12345678"}
        reset_session = login(reset_creds, "User1 with reset password")
        if reset_session:
            print_result(True, "User can login with reset password")
            sessions['user1'] = reset_session  # Update session
        else:
            print_result(False, "User CANNOT login with reset password")
    else:
        print_result(False, f"Admin reset failed: {resp.status_code}")
    
    # User self-service password change
    print_test("PUT /api/profile/password - user changes own password")
    user1 = sessions.get('user1')
    if user1:
        change_data = {
            "oldPassword": "12345678",
            "newPassword": USER1_CREDS["password"]  # Change back to original
        }
        resp = user1.put(f"{API_URL}/profile/password", json=change_data)
        if resp.status_code == 200:
            print_result(True, "User changed own password successfully")
            
            # Verify can login with new password
            new_session = login(USER1_CREDS, "User1 with new password")
            if new_session:
                print_result(True, "User can login with new password")
                sessions['user1'] = new_session
        else:
            print_result(False, f"Password change failed: {resp.status_code} - {resp.text}")
        
        # Test wrong old password
        print_test("PUT /api/profile/password - test wrong old password rejection")
        wrong_data = {
            "oldPassword": "wrongoldpassword",
            "newPassword": "newpass123"
        }
        resp = user1.put(f"{API_URL}/profile/password", json=wrong_data)
        if resp.status_code == 400:
            print_result(True, "Wrong old password correctly rejected with 400")
        else:
            print_result(False, f"Wrong old password NOT rejected properly: {resp.status_code}")

def test_users_admin():
    """Test 5: Users Admin CRUD"""
    print_test("USERS ADMIN CRUD TESTS")
    
    admin = sessions.get('admin')
    if not admin:
        print_result(False, "No admin session available")
        return
    
    # GET /api/users
    print_test("GET /api/users - should return 4+ users (admin + 3 dummy users + registered)")
    resp = admin.get(f"{API_URL}/users")
    if resp.status_code == 200:
        data = resp.json()
        users = data.get('users', [])
        print_result(True, f"Got {len(users)} users")
        
        # Check for admin and dummy users
        emails = [u['email'] for u in users]
        expected_emails = [ADMIN_CREDS['email'], USER1_CREDS['email'], USER2_CREDS['email'], USER3_CREDS['email']]
        for email in expected_emails:
            if email in emails:
                print(f"   ✓ Found: {email}")
            else:
                print(f"   ✗ Missing: {email}")
        
        # Verify passwordHash is NOT leaked
        for user in users:
            if 'passwordHash' in user:
                print_result(False, "SECURITY ISSUE: passwordHash is leaked in user list!")
                break
        else:
            print_result(True, "passwordHash correctly excluded from user list")
    else:
        print_result(False, f"Get users failed: {resp.status_code}")
    
    # Test search
    print_test("GET /api/users?search=bupati - test search")
    resp = admin.get(f"{API_URL}/users?search=bupati")
    if resp.status_code == 200:
        data = resp.json()
        users = data.get('users', [])
        print_result(True, f"Search returned {len(users)} users")
        if users:
            print(f"   Found: {users[0].get('fullName')}")
    else:
        print_result(False, f"Search failed: {resp.status_code}")
    
    # Test pagination
    print_test("GET /api/users?page=1&limit=2 - test pagination")
    resp = admin.get(f"{API_URL}/users?page=1&limit=2")
    if resp.status_code == 200:
        data = resp.json()
        pagination = data.get('pagination', {})
        print_result(True, f"Pagination: page {pagination.get('page')}, total {pagination.get('total')}")
    else:
        print_result(False, f"Pagination failed: {resp.status_code}")
    
    # GET user detail
    if 'user1_id' in test_data:
        print_test("GET /api/users/{id}/detail - get user detail")
        resp = admin.get(f"{API_URL}/users/{test_data['user1_id']}/detail")
        if resp.status_code == 200:
            data = resp.json()
            user = data.get('user', {})
            print_result(True, f"Got user detail: {user.get('fullName')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Location: {user.get('kota')}, {user.get('provinsi')}")
            
            # Verify passwordHash is NOT leaked
            if 'passwordHash' in user:
                print_result(False, "SECURITY ISSUE: passwordHash is leaked in user detail!")
            else:
                print_result(True, "passwordHash correctly excluded from response")
        else:
            print_result(False, f"Get user detail failed: {resp.status_code}")
        
        # Update user location
        print_test("PUT /api/users/{id}/update - update user location")
        update_data = {
            "homeLat": -7.3,
            "homeLng": 112.7,
            "kelurahan": "Test Kelurahan",
            "kecamatan": "Test Kecamatan",
            "kota": "Surabaya",
            "provinsi": "Jawa Timur"
        }
        resp = admin.put(f"{API_URL}/users/{test_data['user1_id']}/update", json=update_data)
        if resp.status_code == 200:
            print_result(True, "User location updated")
        else:
            print_result(False, f"Update failed: {resp.status_code}")
        
        # Soft delete user
        print_test("DELETE /api/users/{id} - soft delete user")
        resp = admin.delete(f"{API_URL}/users/{test_data['user1_id']}")
        if resp.status_code == 200:
            print_result(True, "User soft-deleted")
            
            # Verify appears in admin list with deletedAt
            resp = admin.get(f"{API_URL}/users")
            if resp.status_code == 200:
                users = resp.json().get('users', [])
                deleted_user = next((u for u in users if u['id'] == test_data['user1_id']), None)
                if deleted_user and deleted_user.get('deletedAt'):
                    print_result(True, f"Deleted user appears with deletedAt")
                else:
                    print_result(False, "Deleted user not found or missing deletedAt")
        else:
            print_result(False, f"Delete failed: {resp.status_code}")
        
        # Restore user
        print_test("POST /api/users/{id}/restore - restore user")
        resp = admin.post(f"{API_URL}/users/{test_data['user1_id']}/restore")
        if resp.status_code == 200:
            print_result(True, "User restored")
        else:
            print_result(False, f"Restore failed: {resp.status_code}")

def test_dashboards():
    """Test 6: Dashboards"""
    print_test("DASHBOARD TESTS")
    
    admin = sessions.get('admin')
    if not admin:
        print_result(False, "No admin session available")
        return
    
    # Admin dashboard
    print_test("GET /api/dashboard/admin - admin dashboard with aggregations")
    resp = admin.get(f"{API_URL}/dashboard/admin?days=30")
    if resp.status_code == 200:
        data = resp.json()
        print_result(True, "Admin dashboard loaded")
        print(f"   Total Users: {data.get('totalUsers')}")
        print(f"   Total Events: {data.get('totalEvents')}")
        print(f"   Events by Kelurahan: {len(data.get('eventsByKelurahan', []))} entries")
        print(f"   Events by Category: {len(data.get('eventsByCategory', []))} entries")
        
        # Verify aggregations are arrays
        if isinstance(data.get('eventsByKelurahan'), list):
            print_result(True, "eventsByKelurahan is array (JS aggregation working)")
        else:
            print_result(False, f"eventsByKelurahan is not array: {type(data.get('eventsByKelurahan'))}")
        
        if isinstance(data.get('eventsByCategory'), list):
            print_result(True, "eventsByCategory is array (JS aggregation working)")
        else:
            print_result(False, f"eventsByCategory is not array: {type(data.get('eventsByCategory'))}")
    else:
        print_result(False, f"Admin dashboard failed: {resp.status_code} - {resp.text}")
    
    # User dashboard
    print_test("GET /api/dashboard/user - user dashboard")
    user1 = sessions.get('user1')
    if user1:
        resp = user1.get(f"{API_URL}/dashboard/user?days=30")
        if resp.status_code == 200:
            data = resp.json()
            print_result(True, "User dashboard loaded")
            print(f"   Total Nearby Events: {data.get('totalNearbyEvents')}")
            print(f"   Events by Category: {len(data.get('eventsByCategory', []))} entries")
            print(f"   Unread Notifications: {data.get('unreadNotifications')}")
            print(f"   Recent Events: {len(data.get('recentEvents', []))} events")
        else:
            print_result(False, f"User dashboard failed: {resp.status_code}")

def test_history_and_profile():
    """Test 7: History and Profile"""
    print_test("HISTORY AND PROFILE TESTS")
    
    user1 = sessions.get('user1')
    if not user1:
        print_result(False, "No user1 session available")
        return
    
    # GET /api/history (default - all events)
    print_test("GET /api/history - get all published events")
    resp = user1.get(f"{API_URL}/history")
    if resp.status_code == 200:
        data = resp.json()
        events = data.get('events', [])
        pagination = data.get('pagination', {})
        print_result(True, f"Got {len(events)} events, total: {pagination.get('total')}")
    else:
        print_result(False, f"History failed: {resp.status_code}")
    
    # GET /api/history?nearHome=true
    print_test("GET /api/history?nearHome=true - get events near user home")
    resp = user1.get(f"{API_URL}/history?nearHome=true")
    if resp.status_code == 200:
        data = resp.json()
        events = data.get('events', [])
        pagination = data.get('pagination', {})
        print_result(True, f"Got {len(events)} nearby events, total: {pagination.get('total')}")
    else:
        print_result(False, f"History nearHome failed: {resp.status_code}")
    
    # GET /api/profile
    print_test("GET /api/profile - get user profile")
    resp = user1.get(f"{API_URL}/profile")
    if resp.status_code == 200:
        data = resp.json()
        profile = data.get('profile', {})
        print_result(True, f"Got profile: {profile.get('fullName')}")
        print(f"   Email: {profile.get('email')}")
        print(f"   Role: {profile.get('role')}")
        print(f"   Location: {profile.get('kota')}")
        
        # Verify passwordHash is NOT leaked
        if 'passwordHash' in profile:
            print_result(False, "SECURITY ISSUE: passwordHash is leaked in profile!")
        else:
            print_result(True, "passwordHash correctly excluded from profile")
    else:
        print_result(False, f"Get profile failed: {resp.status_code}")

def test_authorization():
    """Test 8: Authorization - USER role should get 403 on admin endpoints"""
    print_test("AUTHORIZATION TESTS")
    
    user1 = sessions.get('user1')
    if not user1:
        print_result(False, "No user1 session available")
        return
    
    # Test USER accessing GET /api/users (admin only)
    print_test("USER accessing GET /api/users - should get 403")
    resp = user1.get(f"{API_URL}/users")
    if resp.status_code == 403:
        print_result(True, "USER correctly denied access to /api/users (403)")
    else:
        print_result(False, f"USER got {resp.status_code} instead of 403 for /api/users")
    
    # Test USER creating event (admin only)
    print_test("USER accessing POST /api/events - should get 403")
    event_data = {
        "categoryId": test_data.get('category_id', 'test'),
        "title": "Test",
        "description": "Test",
        "eventTime": datetime.now().isoformat(),
        "locationLat": -7.0,
        "locationLng": 112.0,
        "kelurahan": "Test",
        "kecamatan": "Test",
        "kota": "Test",
        "dangerRadiusM": 1000,
        "warningRadiusM": 2000
    }
    resp = user1.post(f"{API_URL}/events", json=event_data)
    if resp.status_code == 403:
        print_result(True, "USER correctly denied access to POST /api/events (403)")
    else:
        print_result(False, f"USER got {resp.status_code} instead of 403 for POST /api/events")
    
    # Test USER resetting password (admin only)
    print_test("USER accessing POST /api/users/{id}/reset-password - should get 403")
    resp = user1.post(f"{API_URL}/users/{test_data.get('user2_id', 'test')}/reset-password")
    if resp.status_code == 403:
        print_result(True, "USER correctly denied access to reset-password (403)")
    else:
        print_result(False, f"USER got {resp.status_code} instead of 403 for reset-password")

def test_public_api():
    """Test 9: Public API"""
    print_test("PUBLIC API TESTS")
    
    # GET /api/public/recent-disasters (no auth required)
    print_test("GET /api/public/recent-disasters - public endpoint")
    resp = requests.get(f"{API_URL}/public/recent-disasters")
    if resp.status_code == 200:
        data = resp.json()
        if data.get('success'):
            print_result(True, "Public API returned success")
            
            stats = data.get('stats', {})
            disasters = data.get('disasters', [])
            
            print(f"   Stats:")
            print(f"     Categories: {stats.get('categories')}")
            print(f"     Users: {stats.get('users')}")
            print(f"     Total Disasters: {stats.get('total')}")
            print(f"   Disasters: {len(disasters)} returned")
            
            # Verify expected stats
            if stats.get('categories') == 8:
                print_result(True, "Categories count is 8 (correct)")
            else:
                print_result(False, f"Categories count is {stats.get('categories')}, expected 8")
            
            if stats.get('users') >= 3:
                print_result(True, f"Users count is {stats.get('users')} (≥3, correct)")
            else:
                print_result(False, f"Users count is {stats.get('users')}, expected ≥3")
            
            # Check disaster structure
            if disasters:
                d = disasters[0]
                print(f"   Sample disaster:")
                print(f"     Title: {d.get('title')}")
                print(f"     Category: {d.get('category_name')} ({d.get('category_code')})")
                print(f"     Location: {d.get('kota')}")
        else:
            print_result(False, f"Public API returned success=false: {data}")
    else:
        print_result(False, f"Public API failed: {resp.status_code} - {resp.text}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("SiagaSekitar Backend API Test Suite - MongoDB Migration Regression Test")
    print("="*80)
    
    try:
        test_auth()
        test_categories()
        test_events_and_notifications()
        test_password_reset()
        test_users_admin()
        test_dashboards()
        test_history_and_profile()
        test_authorization()
        test_public_api()
        
        print("\n" + "="*80)
        print("ALL TESTS COMPLETED")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ TEST SUITE FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
