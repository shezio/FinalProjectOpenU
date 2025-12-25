from pathlib import Path
import os
from dotenv import load_dotenv  # Add this import
import json
# Detect whether running on EC2 or local

# Load environment variables from .env file
load_dotenv()  # Add this line
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

IS_PROD = os.environ.get("DJANGO_ENV") == "production"
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")

LOCAL_URL = "http://localhost:9000"

FRONTEND_HOST = "login.achildssmile.org.il"
BACKEND_HOST = "app.achildssmile.org.il"
FRONTEND_URL = f"https://{FRONTEND_HOST}"
BACKEND_URL = f"https://{BACKEND_HOST}"
DEBUG = os.environ.get("DEBUG","False") == "True"


ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    FRONTEND_HOST,
    BACKEND_HOST,
    'child-smile-app-fraah4arh5hrhvcq.israelcentral-01.azurewebsites.net'
]

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    'rest_framework',
    'childsmile_app',
    'corsheaders',
    'django.contrib.sites',  # Required for allauth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
]
SITE_ID = 1


# Add this at the bottom of your settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

MIDDLEWARE = [
   "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    'allauth.account.middleware.AccountMiddleware',
]

# Allauth settings to minimize interference
ACCOUNT_ADAPTER = 'allauth.account.adapter.DefaultAccountAdapter'
ACCOUNT_EMAIL_VERIFICATION = 'none'  # Disable email verification
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = False
ACCOUNT_LOGOUT_ON_GET = False
ACCOUNT_SESSION_REMEMBER = None

# This tells allauth to only handle /accounts/ URLs
ACCOUNT_LOGIN_URL = '/accounts/login/'
ACCOUNT_LOGOUT_URL = '/accounts/logout/'

ROOT_URLCONF = "childsmile.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "django.template.context_processors.static",
            ],
        },
    },
]

WSGI_APPLICATION = "childsmile.wsgi.application"
print("############################################")
print("############################################")
print("DB_PASSWORD =", os.environ.get("DB_PASSWORD"))
print("############################################")
print("############################################")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "child_smile_db",
        "USER": "child_smile_user@child-smile-db",  # <- include @servername here
        "PASSWORD": os.environ.get("DB_PASSWORD"),
        "HOST": "child-smile-db.postgres.database.azure.com" if IS_PROD else "localhost",
        "PORT": "5432",
        "CONN_MAX_AGE": 0,
        "OPTIONS": {
            "sslmode": "require" if IS_PROD else "disable",
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = []  # Frontend on separate service
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [FRONTEND_URL] if IS_PROD else [LOCAL_URL]
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True #False if not IS_PROD else True

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',  # legacy login
    'allauth.account.auth_backends.AuthenticationBackend',  # allauth
)
ACCOUNT_DEFAULT_HTTP_PROTOCOL = "https" if IS_PROD else "http"
CSRF_TRUSTED_ORIGINS = [LOCAL_URL] if not IS_PROD else [FRONTEND_URL]
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


#LOGIN_REDIRECT_URL = '/tasks'  # Redirect to your app's home page
# Replace the existing SOCIALACCOUNT_AUTO_SIGNUP line with:
SOCIALACCOUNT_ADAPTER = 'childsmile_app.adapters.CustomSocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = False  # Don't auto-create accounts

# Add these Google OAuth settings
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'OAUTH_PKCE_ENABLED': True,
    }
}

# Add these settings to skip the ugly confirmation page
SOCIALACCOUNT_LOGIN_ON_GET = True  # Skip confirmation page
ACCOUNT_EMAIL_VERIFICATION = 'none'  # You already have this
SOCIALACCOUNT_AUTO_SIGNUP = True  # Auto-create user accounts
ACCOUNT_LOGOUT_ON_GET = True  # Optional: allow GET logout

# Fix the deprecated setting
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']
# Redirect to React frontend after Google login
LOGIN_REDIRECT_URL = FRONTEND_URL + "/#/google-success" if IS_PROD else LOCAL_URL + "/google-success"

# Replace your gmail settings with an App Password
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = 'noreply@send.amitssmile.com'

# TOTP Settings
TOTP_EXPIRY_MINUTES = 5
TOTP_MAX_ATTEMPTS = 3
