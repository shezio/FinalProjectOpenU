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
from django.urls import path, include, re_path
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse
import os

def react_index(request):
    index_path = os.path.join(settings.BASE_DIR, "frontend", "dist", "index.html")
    return FileResponse(open(index_path, "rb"))

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),

    # 🔵 API — בלי /api, בדיוק כמו שאתה רוצה
    path('', include('childsmile_app.urls')),
]

# 🔴 React SPA fallback — תמיד אחרון
if os.environ.get("DJANGO_ENV") == "production":
    urlpatterns += [
        re_path(r'^.*$', react_index),
    ]
# DEBUG is always False so no serve static files at all
