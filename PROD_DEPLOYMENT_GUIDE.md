# Production Deployment: Single Server (Backend + Frontend)

## ✅ MINIMAL CHANGES NEEDED

Your setup is **95% ready**. Only make these changes:

---

### 1️⃣ **Frontend Environment Files**

**Update `.env.production`:**
```env
REACT_APP_API_URL=
```
---

### 2️⃣ **Django Settings**

**Update `childsmile/settings.py` (root level, NOT childsmile/childsmile/):**

Find the line with `STATIC_URL = '/static/'` and add after it:

```python
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'frontend/dist'),
]
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

**Update TEMPLATES section** - change `"DIRS": []` to:

```python
"DIRS": [os.path.join(BASE_DIR, 'frontend/dist')],
```

And add to context_processors:
```python
"django.template.context_processors.static",
```

---

### 3️⃣ **Django URLs**

**Update `childsmile/urls.py` (root level, NOT childsmile/childsmile/):**

Your childsmile_app/urls.py already has all paths with `/api/` prefix, so just add the catch-all for React:

```python
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('childsmile_app.urls')),  # Already has /api/ prefixed routes
    path('accounts/', include('allauth.urls')),
    
    # Serve React for all other routes (SPA fallback)
    path('<path:resource>', TemplateView.as_view(template_name='index.html')),
    path('', TemplateView.as_view(template_name='index.html')),
]

# Serve static and media files in DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

---

### 4️⃣ **Azure Deployment Workflow**

**Update `.github/workflows/azure-deploy.yml`:**

Add these steps BEFORE "Deploy to Azure Web App":

```yaml
- name: Build React Frontend
  run: |
    cd childsmile/frontend
    npm install
    npm run build

- name: Collect Django Static Files
  run: |
    cd childsmile
    python manage.py collectstatic --noinput --settings=childsmile.settings
```

Note: You're running from the root directory, so `cd childsmile` goes into the right folder where `manage.py` is located.

---

### 5️⃣ **Azure Custom Domain (No NPO DNS needed)**

**Why Azure Custom Domain is better for you:**
- ✅ No TOTP codes needed
- ✅ Complete independence from NPO DNS
- ✅ Works immediately after propagation
- ✅ Free SSL certificate (automatic)
- ✅ Easy management within Azure portal

**Setup:**
1. In Azure App Service → Settings → Custom domains
2. Add domain: `app.achildssmile.org.il`
3. Azure gives you a CNAME value to add to your registrar
4. Delete the old DNS records from NPO registrar for this subdomain
5. Add Azure's CNAME record to registrar (one-time, no TOTP needed going forward)
6. Wait for propagation (usually 10 mins)
7. Azure auto-creates SSL certificate
8. Done! Works at `https://app.achildssmile.org.il`

**No collision** because you're just replacing the `app` subdomain DNS record, main domain stays unchanged.

---

## 📌 **Important Notes**

**File Structure:**
- Root folder: `/Users/shlomosmac/Applications/dev/FinalProjectOpenU/`
- Django app: `/childsmile/` (contains manage.py)
- React app: `/childsmile/frontend/`
- When Azure runs commands, it's from root, so `cd childsmile` goes to the right place

**DNS with LiveDNS:**
- Yes, you'll need to update LiveDNS just like you did for AWS
- Ask CTO for one-time TOTP to add the CNAME record from Azure
- After that, the domain works independently

