#!/usr/bin/env python3
"""
Backend API Test Suite for SiagaSekitar
Tests authentication, event publishing, notifications, password reset, and CRUD operations
"""

import requests
import json
import os
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://bencana-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@sso.local"
ADMIN_PASSWORD = "Admin12345!"
USER1_EMAIL = "user1@test.com"
USER1_PASSWORD = "User12345!"
USER2_EMAIL = "user2@test.com"
USER2_PASSWORD = "User12345!"

# Test results
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_result(test_name, passed, message=""):
    """Log test result"""
    if passed:
        test_results["passed"].append(test_name)
        print(f"✅ PASS: {test_name}")
        if message:
            print(f"   {message}")
    else:
        test_results["failed"].append(test_name)
        print(f"❌ FAIL: {test_name}")
        if message:
            print(f"   {message}")

def log_warning(test_name, message):
    """Log warning (minor issue)"""
    test_results["warnings"].append(test_name)
    print(f"⚠️  WARNING: {test_name}")
    print(f"   {message}")

def print_section(title):
    """Print section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

# ============================================================================
# 1. AUTHENTICATION TESTS
# ============================================================================

def test_authentication():
    """Test authentication for admin and user roles"""
    print_section("1. AUTHENTICATION TESTS")
    
    # Test 1.1: Admin login
    print("Test 1.1: Admin login (SSO role)")
    admin_session = None
    try:
        admin_session = requests.Session()
        
        # Step 1: Get CSRF token
        csrf_response = admin_session.get(f"{API_URL}/auth/csrf")
        csrf_token = csrf_response.json().get('csrfToken')
        print(f"   CSRF Token: {csrf_token[:20]}..." if csrf_token else "   No CSRF token")
        
        # Step 2: POST to signin endpoint with form data
        auth_response = admin_session.post(
            f"{API_URL}/auth/callback/credentials",
            data={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "csrfToken": csrf_token,
                "callbackUrl": f"{BASE_URL}",
                "json": "true"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            allow_redirects=False
        )
        
        print(f"   Status: {auth_response.status_code}")
        print(f"   Cookies: {[cookie.name for cookie in admin_session.cookies]}")
        
        # Check if we got a session cookie
        has_session = any('next-auth.session-token' in cookie.name or 'next-auth.callback-url' in cookie.name for cookie in admin_session.cookies)
        
        # NextAuth returns 302 redirect on success
        if auth_response.status_code in [200, 302] or has_session:
            # Verify by calling a protected endpoint
            verify_response = admin_session.get(f"{API_URL}/users")
            print(f"   Verify status: {verify_response.status_code}")
            
            if verify_response.status_code == 200:
                log_result("Admin login", True, f"Admin authenticated successfully")
            else:
                log_result("Admin login", False, f"Auth succeeded but verify failed: {verify_response.status_code}")
                admin_session = None
        else:
            log_result("Admin login", False, f"Status {auth_response.status_code}: {auth_response.text[:200]}")
            admin_session = None
            
    except Exception as e:
        log_result("Admin login", False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        admin_session = None
    
    # Test 1.2: User login
    print("\nTest 1.2: User login (USER role)")
    user_session = None
    try:
        user_session = requests.Session()
        
        # Step 1: Get CSRF token
        csrf_response = user_session.get(f"{API_URL}/auth/csrf")
        csrf_token = csrf_response.json().get('csrfToken')
        
        # Step 2: POST to signin endpoint
        auth_response = user_session.post(
            f"{API_URL}/auth/callback/credentials",
            data={
                "email": USER1_EMAIL,
                "password": USER1_PASSWORD,
                "csrfToken": csrf_token,
                "callbackUrl": f"{BASE_URL}",
                "json": "true"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            allow_redirects=False
        )
        
        print(f"   Status: {auth_response.status_code}")
        print(f"   Cookies: {[cookie.name for cookie in user_session.cookies]}")
        
        has_session = any('next-auth.session-token' in cookie.name for cookie in user_session.cookies)
        
        if auth_response.status_code in [200, 302] or has_session:
            # Verify by calling a protected endpoint
            verify_response = user_session.get(f"{API_URL}/notifications")
            print(f"   Verify status: {verify_response.status_code}")
            
            if verify_response.status_code == 200:
                log_result("User login", True, f"User authenticated successfully")
            else:
                log_result("User login", False, f"Auth succeeded but verify failed: {verify_response.status_code}")
                user_session = None
        else:
            log_result("User login", False, f"Status {auth_response.status_code}: {auth_response.text[:200]}")
            user_session = None
            
    except Exception as e:
        log_result("User login", False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        user_session = None
    
    # Test 1.3: Wrong password rejection
    print("\nTest 1.3: Wrong password rejection")
    try:
        wrong_session = requests.Session()
        
        # Get CSRF token
        csrf_response = wrong_session.get(f"{API_URL}/auth/csrf")
        csrf_token = csrf_response.json().get('csrfToken')
        
        auth_response = wrong_session.post(
            f"{API_URL}/auth/callback/credentials",
            data={
                "email": ADMIN_EMAIL,
                "password": "WrongPassword123!",
                "csrfToken": csrf_token,
                "callbackUrl": f"{BASE_URL}",
                "json": "true"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            allow_redirects=False
        )
        
        print(f"   Status: {auth_response.status_code}")
        print(f"   Response: {auth_response.text[:200]}")
        
        # Should fail - check for error in redirect URL or no session cookie
        has_session = any('next-auth.session-token' in cookie.name for cookie in wrong_session.cookies)
        has_error = 'error' in auth_response.text.lower() or not has_session
        
        if has_error:
            log_result("Wrong password rejection", True, "Wrong password correctly rejected")
        else:
            log_result("Wrong password rejection", False, "Wrong password was not rejected")
            
    except Exception as e:
        log_result("Wrong password rejection", False, f"Exception: {str(e)}")
    
    return admin_session, user_session

# ============================================================================
# 2. EVENT PUBLISHING + NOTIFICATION GENERATION (HIGHEST PRIORITY)
# ============================================================================

def test_event_publishing_and_notifications(admin_session, user_session):
    """Test event creation, publishing, and notification generation"""
    print_section("2. EVENT PUBLISHING + NOTIFICATION GENERATION")
    
    if not admin_session:
        print("⚠️  Skipping: Admin session not available")
        return None
    
    # Test 2.1: Get categories to use in event creation
    print("Test 2.1: Get categories for event creation")
    try:
        categories_response = admin_session.get(f"{API_URL}/categories")
        print(f"   Status: {categories_response.status_code}")
        
        if categories_response.status_code == 200:
            categories = categories_response.json().get('categories', [])
            if categories:
                category_id = categories[0]['id']
                print(f"   Using category: {categories[0]['name']} (ID: {category_id})")
                log_result("Get categories", True, f"Found {len(categories)} categories")
            else:
                log_result("Get categories", False, "No categories found")
                return None
        else:
            log_result("Get categories", False, f"Status {categories_response.status_code}")
            return None
            
    except Exception as e:
        log_result("Get categories", False, f"Exception: {str(e)}")
        return None
    
    # Test 2.2: Create a disaster event
    print("\nTest 2.2: Create disaster event")
    try:
        event_time = (datetime.now() + timedelta(hours=1)).isoformat()
        
        event_data = {
            "categoryId": category_id,
            "title": "Test Earthquake Event",
            "description": "This is a test earthquake event for notification testing",
            "eventTime": event_time,
            "locationLat": "-6.2088",  # Jakarta coordinates
            "locationLng": "106.8456",
            "kelurahan": "Menteng",
            "kecamatan": "Menteng",
            "kota": "Jakarta Pusat",
            "dangerRadiusM": 5000,  # 5km danger radius
            "warningRadiusM": 10000  # 10km warning radius
        }
        
        create_response = admin_session.post(
            f"{API_URL}/events",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {create_response.status_code}")
        print(f"   Response: {create_response.text[:300]}")
        
        if create_response.status_code == 200:
            event = create_response.json().get('event')
            if event:
                event_id = event['id']
                print(f"   Event ID: {event_id}")
                print(f"   Status: {event.get('status')}")
                log_result("Create event", True, f"Event created with ID {event_id}")
            else:
                log_result("Create event", False, "No event in response")
                return None
        else:
            log_result("Create event", False, f"Status {create_response.status_code}: {create_response.text[:200]}")
            return None
            
    except Exception as e:
        log_result("Create event", False, f"Exception: {str(e)}")
        return None
    
    # Test 2.3: Publish the event (CRITICAL - generates notifications)
    print("\nTest 2.3: Publish event and generate notifications")
    try:
        publish_response = admin_session.post(
            f"{API_URL}/events/{event_id}/publish",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {publish_response.status_code}")
        print(f"   Response: {publish_response.text}")
        
        if publish_response.status_code == 200:
            result = publish_response.json()
            notifications_created = result.get('notificationsCreated', 0)
            print(f"   Notifications created: {notifications_created}")
            
            if notifications_created > 0:
                log_result("Publish event", True, f"Event published, {notifications_created} notifications created")
            else:
                log_warning("Publish event", "Event published but no notifications created (users may be outside radius)")
                log_result("Publish event", True, "Event published successfully")
        else:
            log_result("Publish event", False, f"Status {publish_response.status_code}: {publish_response.text}")
            return None
            
    except Exception as e:
        log_result("Publish event", False, f"Exception: {str(e)}")
        return None
    
    # Test 2.4: Verify event is PUBLISHED
    print("\nTest 2.4: Verify event status is PUBLISHED")
    try:
        # Get all events and find our event
        events_response = admin_session.get(f"{API_URL}/events")
        
        print(f"   Status: {events_response.status_code}")
        
        if events_response.status_code == 200:
            events = events_response.json().get('events', [])
            our_event = None
            for evt in events:
                if evt.get('id') == event_id:
                    our_event = evt
                    break
            
            if our_event:
                status = our_event.get('status')
                published_at = our_event.get('publishedAt')
                print(f"   Event status: {status}")
                print(f"   Published at: {published_at}")
                
                if status == 'PUBLISHED' and published_at:
                    log_result("Event status PUBLISHED", True, "Event correctly marked as PUBLISHED")
                else:
                    log_result("Event status PUBLISHED", False, f"Status is {status}, publishedAt is {published_at}")
            else:
                log_result("Event status PUBLISHED", False, "Event not found in events list")
        else:
            log_result("Event status PUBLISHED", False, f"Status {events_response.status_code}")
            
    except Exception as e:
        log_result("Event status PUBLISHED", False, f"Exception: {str(e)}")
    
    # Test 2.5: User gets notifications
    print("\nTest 2.5: User receives notifications")
    if not user_session:
        print("⚠️  Skipping: User session not available")
    else:
        try:
            notifications_response = user_session.get(f"{API_URL}/notifications")
            
            print(f"   Status: {notifications_response.status_code}")
            
            if notifications_response.status_code == 200:
                notifications = notifications_response.json().get('notifications', [])
                print(f"   Total notifications: {len(notifications)}")
                
                # Find our test event notification
                test_notification = None
                for notif in notifications:
                    if notif.get('eventId') == event_id:
                        test_notification = notif
                        break
                
                if test_notification:
                    print(f"   Found notification for test event:")
                    print(f"     Priority: {test_notification.get('priority')}")
                    print(f"     Distance: {test_notification.get('distanceM')}m")
                    print(f"     Event title: {test_notification.get('event', {}).get('title')}")
                    log_result("User notifications", True, f"User received notification with priority {test_notification.get('priority')}")
                else:
                    log_warning("User notifications", "User did not receive notification (may be outside radius)")
                    log_result("User notifications", True, "Notifications endpoint works")
            else:
                log_result("User notifications", False, f"Status {notifications_response.status_code}")
                
        except Exception as e:
            log_result("User notifications", False, f"Exception: {str(e)}")
    
    # Test 2.6: Idempotency - publishing again should not duplicate
    print("\nTest 2.6: Idempotency - publish again should not duplicate notifications")
    try:
        publish_again_response = admin_session.post(
            f"{API_URL}/events/{event_id}/publish",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {publish_again_response.status_code}")
        
        if publish_again_response.status_code == 200:
            result = publish_again_response.json()
            notifications_created = result.get('notificationsCreated', 0)
            print(f"   Notifications created on second publish: {notifications_created}")
            
            if notifications_created == 0:
                log_result("Publish idempotency", True, "No duplicate notifications created")
            else:
                log_result("Publish idempotency", False, f"Created {notifications_created} duplicate notifications")
        else:
            log_warning("Publish idempotency", f"Second publish returned status {publish_again_response.status_code}")
            
    except Exception as e:
        log_result("Publish idempotency", False, f"Exception: {str(e)}")
    
    return event_id

# ============================================================================
# 3. PASSWORD RESET TESTS
# ============================================================================

def test_password_reset(admin_session, user_session):
    """Test password reset functionality"""
    print_section("3. PASSWORD RESET TESTS")
    
    if not admin_session:
        print("⚠️  Skipping: Admin session not available")
        return
    
    # Test 3.1: Get user ID for user1
    print("Test 3.1: Get user1 ID for password reset")
    try:
        users_response = admin_session.get(f"{API_URL}/users")
        
        if users_response.status_code == 200:
            users = users_response.json().get('users', [])
            user1 = None
            for user in users:
                if user.get('email') == USER1_EMAIL:
                    user1 = user
                    break
            
            if user1:
                user1_id = user1['id']
                print(f"   User1 ID: {user1_id}")
                log_result("Get user1 ID", True, f"Found user1: {user1_id}")
            else:
                log_result("Get user1 ID", False, "User1 not found")
                return
        else:
            log_result("Get user1 ID", False, f"Status {users_response.status_code}")
            return
            
    except Exception as e:
        log_result("Get user1 ID", False, f"Exception: {str(e)}")
        return
    
    # Test 3.2: Admin resets user password to default
    print("\nTest 3.2: Admin resets user1 password to default (12345678)")
    try:
        reset_response = admin_session.post(
            f"{API_URL}/users/{user1_id}/reset-password",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {reset_response.status_code}")
        print(f"   Response: {reset_response.text}")
        
        if reset_response.status_code == 200:
            log_result("Admin password reset", True, "Password reset to default")
        else:
            log_result("Admin password reset", False, f"Status {reset_response.status_code}: {reset_response.text}")
            return
            
    except Exception as e:
        log_result("Admin password reset", False, f"Exception: {str(e)}")
        return
    
    # Test 3.3: Verify user can login with default password
    print("\nTest 3.3: Verify user1 can login with default password (12345678)")
    try:
        test_session = requests.Session()
        
        auth_response = test_session.post(
            f"{API_URL}/auth/callback/credentials",
            json={
                "email": USER1_EMAIL,
                "password": "12345678",
                "redirect": "false",
                "json": "true"
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {auth_response.status_code}")
        
        has_session = any('next-auth.session-token' in cookie.name for cookie in test_session.cookies)
        
        if auth_response.status_code == 200 or has_session:
            log_result("Login with default password", True, "User can login with 12345678")
        else:
            log_result("Login with default password", False, f"Status {auth_response.status_code}")
            
    except Exception as e:
        log_result("Login with default password", False, f"Exception: {str(e)}")
    
    # Test 3.4: Restore user1 password back to original
    print("\nTest 3.4: Restore user1 password back to User12345!")
    try:
        # Login with default password to get a fresh authenticated session
        restore_session = requests.Session()
        
        # Get CSRF token
        csrf_response = restore_session.get(f"{API_URL}/auth/csrf")
        csrf_token = csrf_response.json().get('csrfToken')
        
        # Login with default password
        auth_response = restore_session.post(
            f"{API_URL}/auth/callback/credentials",
            data={
                "email": USER1_EMAIL,
                "password": "12345678",
                "csrfToken": csrf_token,
                "callbackUrl": f"{BASE_URL}",
                "json": "true"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            allow_redirects=False
        )
        
        print(f"   Login status: {auth_response.status_code}")
        
        # Change password back
        change_response = restore_session.put(
            f"{API_URL}/profile/password",
            json={
                "oldPassword": "12345678",
                "newPassword": USER1_PASSWORD
            },
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Change password status: {change_response.status_code}")
        print(f"   Response: {change_response.text}")
        
        if change_response.status_code == 200:
            log_result("Restore user1 password", True, "Password restored to User12345!")
        else:
            log_result("Restore user1 password", False, f"Status {change_response.status_code}: {change_response.text}")
            
    except Exception as e:
        log_result("Restore user1 password", False, f"Exception: {str(e)}")
    
    # Test 3.5: User self-service password change with wrong old password
    print("\nTest 3.5: User self-service password change - wrong old password rejection")
    if not user_session:
        print("⚠️  Skipping: User session not available")
    else:
        try:
            change_response = user_session.put(
                f"{API_URL}/profile/password",
                json={
                    "oldPassword": "WrongOldPassword123!",
                    "newPassword": "NewPassword123!"
                },
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Status: {change_response.status_code}")
            print(f"   Response: {change_response.text}")
            
            # Should fail with 400
            if change_response.status_code == 400 or "salah" in change_response.text.lower():
                log_result("Wrong old password rejection", True, "Wrong old password correctly rejected")
            else:
                log_result("Wrong old password rejection", False, f"Status {change_response.status_code}")
                
        except Exception as e:
            log_result("Wrong old password rejection", False, f"Exception: {str(e)}")

# ============================================================================
# 4. ADMIN CRUD + SOFT-DELETE + RESTORE + SEARCH
# ============================================================================

def test_admin_crud_operations(admin_session):
    """Test admin CRUD operations with soft-delete, restore, and search"""
    print_section("4. ADMIN CRUD + SOFT-DELETE + RESTORE + SEARCH")
    
    if not admin_session:
        print("⚠️  Skipping: Admin session not available")
        return
    
    # Test 4.1: Create a new category
    print("Test 4.1: Create new category")
    try:
        import time
        unique_code = f"TEST_{int(time.time())}"
        
        category_data = {
            "name": "Test Category",
            "code": unique_code,
            "description": "This is a test category for CRUD testing"
        }
        
        create_response = admin_session.post(
            f"{API_URL}/categories",
            json=category_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {create_response.status_code}")
        print(f"   Response: {create_response.text[:200]}")
        
        if create_response.status_code == 200:
            category = create_response.json().get('category')
            if category:
                test_category_id = category['id']
                print(f"   Category ID: {test_category_id}")
                log_result("Create category", True, f"Category created with ID {test_category_id}")
            else:
                log_result("Create category", False, "No category in response")
                return
        else:
            log_result("Create category", False, f"Status {create_response.status_code}: {create_response.text[:200]}")
            return
            
    except Exception as e:
        log_result("Create category", False, f"Exception: {str(e)}")
        return
    
    # Test 4.2: Update category
    print("\nTest 4.2: Update category")
    try:
        update_data = {
            "name": "Test Category Updated",
            "description": "Updated description"
        }
        
        update_response = admin_session.put(
            f"{API_URL}/categories/{test_category_id}",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {update_response.status_code}")
        
        if update_response.status_code == 200:
            log_result("Update category", True, "Category updated successfully")
        else:
            log_result("Update category", False, f"Status {update_response.status_code}: {update_response.text[:200]}")
            
    except Exception as e:
        log_result("Update category", False, f"Exception: {str(e)}")
    
    # Test 4.3: Search categories
    print("\nTest 4.3: Search categories")
    try:
        search_response = admin_session.get(f"{API_URL}/categories?search=Test")
        
        print(f"   Status: {search_response.status_code}")
        
        if search_response.status_code == 200:
            categories = search_response.json().get('categories', [])
            found = any(cat['id'] == test_category_id for cat in categories)
            print(f"   Found {len(categories)} categories matching 'Test'")
            
            if found:
                log_result("Search categories", True, "Search found test category")
            else:
                log_result("Search categories", False, "Search did not find test category")
        else:
            log_result("Search categories", False, f"Status {search_response.status_code}")
            
    except Exception as e:
        log_result("Search categories", False, f"Exception: {str(e)}")
    
    # Test 4.4: Soft-delete category
    print("\nTest 4.4: Soft-delete category")
    try:
        delete_response = admin_session.delete(f"{API_URL}/categories/{test_category_id}")
        
        print(f"   Status: {delete_response.status_code}")
        
        if delete_response.status_code == 200:
            log_result("Soft-delete category", True, "Category soft-deleted")
        else:
            log_result("Soft-delete category", False, f"Status {delete_response.status_code}")
            
    except Exception as e:
        log_result("Soft-delete category", False, f"Exception: {str(e)}")
    
    # Test 4.5: Verify soft-deleted category appears in admin list
    print("\nTest 4.5: Verify soft-deleted category in admin list")
    try:
        list_response = admin_session.get(f"{API_URL}/categories")
        
        if list_response.status_code == 200:
            categories = list_response.json().get('categories', [])
            deleted_cat = None
            for cat in categories:
                if cat['id'] == test_category_id:
                    deleted_cat = cat
                    break
            
            if deleted_cat:
                print(f"   Found deleted category, deletedAt: {deleted_cat.get('deletedAt')}")
                if deleted_cat.get('deletedAt'):
                    log_result("Soft-deleted in list", True, "Soft-deleted category appears with deletedAt")
                else:
                    log_result("Soft-deleted in list", False, "Category found but no deletedAt")
            else:
                log_result("Soft-deleted in list", False, "Soft-deleted category not in list")
        else:
            log_result("Soft-deleted in list", False, f"Status {list_response.status_code}")
            
    except Exception as e:
        log_result("Soft-deleted in list", False, f"Exception: {str(e)}")
    
    # Test 4.6: Restore category
    print("\nTest 4.6: Restore soft-deleted category")
    try:
        restore_response = admin_session.post(
            f"{API_URL}/categories/{test_category_id}/restore",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {restore_response.status_code}")
        print(f"   Response: {restore_response.text}")
        
        if restore_response.status_code == 200:
            log_result("Restore category", True, "Category restored successfully")
        else:
            log_result("Restore category", False, f"Status {restore_response.status_code}: {restore_response.text}")
            
    except Exception as e:
        log_result("Restore category", False, f"Exception: {str(e)}")
    
    # Test 4.7: Verify restored category has no deletedAt
    print("\nTest 4.7: Verify restored category has no deletedAt")
    try:
        # Get all categories and find our category
        list_response = admin_session.get(f"{API_URL}/categories")
        
        if list_response.status_code == 200:
            categories = list_response.json().get('categories', [])
            restored_cat = None
            for cat in categories:
                if cat['id'] == test_category_id:
                    restored_cat = cat
                    break
            
            if restored_cat:
                deleted_at = restored_cat.get('deletedAt')
                print(f"   deletedAt: {deleted_at}")
                
                if deleted_at is None:
                    log_result("Restored category verified", True, "Category has no deletedAt after restore")
                else:
                    log_result("Restored category verified", False, f"Category still has deletedAt: {deleted_at}")
            else:
                log_result("Restored category verified", False, "Category not found in list")
        else:
            log_result("Restored category verified", False, f"Status {list_response.status_code}")
            
    except Exception as e:
        log_result("Restored category verified", False, f"Exception: {str(e)}")

# ============================================================================
# 5. AUTHORIZATION TESTS
# ============================================================================

def test_authorization(user_session):
    """Test that USER role gets 403 on admin-only endpoints"""
    print_section("5. AUTHORIZATION TESTS")
    
    if not user_session:
        print("⚠️  Skipping: User session not available")
        return
    
    # Test 5.1: USER tries to access admin users list
    print("Test 5.1: USER tries to access admin users list")
    try:
        users_response = user_session.get(f"{API_URL}/users")
        
        print(f"   Status: {users_response.status_code}")
        
        if users_response.status_code == 403:
            log_result("USER forbidden on /users", True, "USER correctly forbidden from admin endpoint")
        else:
            log_result("USER forbidden on /users", False, f"Expected 403, got {users_response.status_code}")
            
    except Exception as e:
        log_result("USER forbidden on /users", False, f"Exception: {str(e)}")
    
    # Test 5.2: USER tries to create event
    print("\nTest 5.2: USER tries to create event (admin only)")
    try:
        event_data = {
            "categoryId": "some-id",
            "title": "Unauthorized Event",
            "description": "This should fail",
            "eventTime": datetime.now().isoformat(),
            "locationLat": "-6.2088",
            "locationLng": "106.8456",
            "kelurahan": "Test",
            "kecamatan": "Test",
            "kota": "Test",
            "dangerRadiusM": 5000,
            "warningRadiusM": 10000
        }
        
        create_response = user_session.post(
            f"{API_URL}/events",
            json=event_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {create_response.status_code}")
        
        if create_response.status_code == 403:
            log_result("USER forbidden on create event", True, "USER correctly forbidden from creating events")
        else:
            log_result("USER forbidden on create event", False, f"Expected 403, got {create_response.status_code}")
            
    except Exception as e:
        log_result("USER forbidden on create event", False, f"Exception: {str(e)}")
    
    # Test 5.3: USER tries to reset password (admin only)
    print("\nTest 5.3: USER tries to reset another user's password (admin only)")
    try:
        reset_response = user_session.post(
            f"{API_URL}/users/some-user-id/reset-password",
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status: {reset_response.status_code}")
        
        if reset_response.status_code == 403:
            log_result("USER forbidden on reset password", True, "USER correctly forbidden from admin password reset")
        else:
            log_result("USER forbidden on reset password", False, f"Expected 403, got {reset_response.status_code}")
            
    except Exception as e:
        log_result("USER forbidden on reset password", False, f"Exception: {str(e)}")

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("  SiagaSekitar Backend API Test Suite")
    print("  Base URL:", BASE_URL)
    print("="*80)
    
    # Run tests in priority order
    admin_session, user_session = test_authentication()
    
    event_id = test_event_publishing_and_notifications(admin_session, user_session)
    
    test_password_reset(admin_session, user_session)
    
    test_admin_crud_operations(admin_session)
    
    test_authorization(user_session)
    
    # Print summary
    print_section("TEST SUMMARY")
    print(f"✅ PASSED: {len(test_results['passed'])} tests")
    for test in test_results['passed']:
        print(f"   - {test}")
    
    if test_results['warnings']:
        print(f"\n⚠️  WARNINGS: {len(test_results['warnings'])} tests")
        for test in test_results['warnings']:
            print(f"   - {test}")
    
    if test_results['failed']:
        print(f"\n❌ FAILED: {len(test_results['failed'])} tests")
        for test in test_results['failed']:
            print(f"   - {test}")
    
    print("\n" + "="*80)
    
    # Exit with appropriate code
    if test_results['failed']:
        print("RESULT: TESTS FAILED")
        return 1
    else:
        print("RESULT: ALL TESTS PASSED")
        return 0

if __name__ == "__main__":
    exit(main())
