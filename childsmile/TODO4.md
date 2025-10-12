You're absolutely right! We don't want users stuck on the ugly Django allauth pages. We want them to use your beautiful React frontend at `localhost:9000`.

**The problem:** Django OAuth redirects to `localhost:8000` but we want users on `localhost:9000` with your React UI.

## **Solution: Redirect to React Frontend After Google Login**

**Update your settings to redirect to your React app:**

````python
# Redirect to React frontend after Google login
LOGIN_REDIRECT_URL = 'http://localhost:9000/google-success'  # React app URL
````

## **Create a React Page to Handle Google Login Success**

Create a new React component:

````javascript
import React, { useEffect, useState } from 'react';
import axios from './axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GoogleSuccess = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupGoogleSession = async () => {
      try {
        // Call the new API to setup session for Google user
        const response = await axios.post('/api/google-login-success/');
        
        if (response.data.user_id) {
          // Store user info like regular login
          localStorage.setItem('username', response.data.username);
          localStorage.setItem('origUsername', response.data.username);
          
          // Get permissions
          const permissionsResponse = await axios.get('/api/permissions/');
          localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));
          
          // Get staff data
          const staffResponse = await axios.get('/api/staff/');
          const staffs = (staffResponse.data.staff || []).map(s => ({
            id: s.id,
            username: s.username,
            roles: s.roles || [],
          }));
          localStorage.setItem('staff', JSON.stringify(staffs));
          
          // Navigate to tasks
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Google login setup failed:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    setupGoogleSession();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>{t('Setting up your account...')}</h2>
        <p>{t('Please wait while we complete your Google login.')}</p>
      </div>
    );
  }

  return null; // Will redirect automatically
};

export default GoogleSuccess;
````

## **Add the Route to Your React Router**

````javascript
import GoogleSuccess from './GoogleSuccess';

// Add this route to your router:
<Route path="/google-success" element={<GoogleSuccess />} />
````

## **Create the Backend API Endpoint**

````python
@csrf_exempt
@api_view(["POST"])
def google_login_success(request):
    """
    Setup session for Google OAuth user - like regular login
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    try:
        # Find the Staff record by email
        staff_user = Staff.objects.get(email=request.user.email)
        
        # Create session like in login_view
        request.session.create()
        request.session["user_id"] = staff_user.staff_id
        request.session["username"] = staff_user.username
        request.session.set_expiry(86400)  # 1 day expiry
        
        return JsonResponse({
            "message": "Google login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found"}, status=404)
````

## **Add the URL**

````python
path("api/google-login-success/", google_login_success, name="google_login_success"),
````

**Now the flow will be:**
1. User clicks Google button → Goes to `localhost:8000/accounts/google/login/`
2. Google OAuth completes → Redirects to `localhost:9000/google-success`
3. React page sets up session → Loads permissions & staff data
4. User ends up at `localhost:9000/tasks` with full UI!

**Try this setup!**