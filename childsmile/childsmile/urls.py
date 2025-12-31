"""
URL configuration for childsmile project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
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