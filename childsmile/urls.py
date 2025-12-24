"""
URL configuration for childsmile project.
"""
from django.contrib import admin
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('', include('childsmile_app.urls')),  # API routes
]
