"""
URL configuration for childsmile project.
"""
from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import connection

def health(request):
    return JsonResponse({
        "status": "ok",
        "service": "child-smile-backend"
    })

def deep_health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db = "ok"
    except Exception:
        db = "error"
    return JsonResponse({
        "status": "ok",
        "db": db
    })

urlpatterns = [
    path('health/', health),
    path('health/deep/', deep_health),
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', include('childsmile_app.urls')),  # API routes
]
