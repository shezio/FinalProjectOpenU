# Mobile CSS / iPhone LAN Testing — Setup Guide

> **DO NOT MERGE ANY of these changes.**  
> Every single file changed here must be reverted before `git add` / committing.  
> This is a purely local dev session setup — nothing here goes to prod, ever.

---

## What you need each session

1. Know your Mac's LAN IP: `ipconfig getifaddr en0`  → e.g. `10.0.0.7`
2. Apply the 5 file changes below (or keep them permanently — they don't break prod)
3. Start Django: `python manage.py runserver 0.0.0.0:8000`
4. Start webpack: `npm start -- --host 0.0.0.0`  (from `frontend/` dir)
5. iPhone Safari: `http://10.0.0.7:9000`
6. **First time only:** Settings → Safari → Clear History and Website Data (evicts old Service Worker)

---

## Files to change — exact instructions

### 1. `childsmile/frontend/.env.development`
**Change line 2** — point API at your Mac IP, port `9000` (webpack proxy forwards to Django):
```
# BEFORE (desktop dev):
REACT_APP_API_URL=http://localhost:8000

# AFTER (mobile dev):
REACT_APP_API_URL=http://10.0.0.4:9000
```
> Change `10.0.0.4` to whatever `ipconfig getifaddr en0` returns.  
> **Revert to `http://localhost:8000` before committing.**

---

### 2. `childsmile/frontend/webpack.config.js`
**Add `proxy` block and `host` to `devServer`:**
```js
// BEFORE:
devServer: {
  contentBase: path.join(__dirname, 'public'),
  compress: true,
  port: 9000,
  historyApiFallback: true
}

// AFTER:
devServer: {
  contentBase: path.join(__dirname, 'public'),
  compress: true,
  host: '0.0.0.0',
  port: 9000,
  historyApiFallback: true,
  proxy: {
    '/api':      { target: 'http://127.0.0.1:8000', changeOrigin: true },
    '/accounts': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    '/admin':    { target: 'http://127.0.0.1:8000', changeOrigin: true },
  }
}
```
> `host: '0.0.0.0'` — makes webpack listen on all interfaces so iPhone can reach it.  
> `proxy` — makes all `/api/*` calls go through port 9000 → Django, so the session cookie
> is set on the same origin (one port = no cross-origin cookie issues).  
> **`devServer` is completely ignored by `npm run build` — safe to merge, but revert anyway.**

---

### 3. `childsmile/frontend/src/index.js`  ⚠️ REVERT BEFORE COMMITTING
**Replace the Service Worker registration block:**
```js
// BEFORE:
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

// AFTER:
if ('serviceWorker' in navigator) {
  if (process.env.NODE_ENV !== 'production') {
    // Unregister any stale SW in dev — iOS Safari strips credentials from
    // SW-re-issued fetches, causing 403s and redirect-to-login on navigation.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch((err) => console.warn('SW registration failed:', err));
    });
  }
}
```
> **Why:** The old SW intercepts all GET requests. On iOS Safari, when the SW
> re-issues `fetch(request)` internally, Safari strips the session cookie → every
> page load after login returns 403 → redirected to login.  
> In dev, we actively unregister any cached SW. In prod, SW still registers normally (PWA).

---

### 4. `childsmile/frontend/public/service-worker.js`  ⚠️ REVERT BEFORE COMMITTING
**Add API exclusion to the fetch handler:**
```js
// BEFORE:
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith( ... );
});

// AFTER:
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API calls — browser must send them directly with credentials.
  // Service workers don't reliably forward cookies on iOS Safari.
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/accounts/') ||
      url.pathname.startsWith('/admin/')) {
    return;
  }

  // Only cache same-origin static assets
  if (url.origin !== self.location.origin) return;

  event.respondWith( ... );
});
```
> Defence-in-depth for prod: even if the SW is active, it won't intercept API calls.

---

### 5. `childsmile/frontend/src/components/Sidebar.js`  ⚠️ REVERT BEFORE COMMITTING
**Line 8 — fix `isProd` detection:**
```js
// BEFORE (broken on iPhone — hostname is LAN IP, not 'localhost'):
const isProd = !window.location.hostname.includes('localhost');

// AFTER:
const isProd = process.env.NODE_ENV === 'production';
```
> **This was the root cause of the navigation redirect.**  
> When browsing from iPhone, `hostname` is `10.0.0.4` not `localhost`, so the old
> code set `isProd = true` → navigation used `/#/tasks` (HashRouter paths) → but
> dev uses BrowserRouter → `/#/tasks` is just `/` with a hash → renders login page.

---

### 6. Both `settings.py` files  ⚠️ REVERT BEFORE COMMITTING
`childsmile/childsmile/settings.py` and `childsmile/settings.py`:

| Setting | Dev value | Prod value | Why |
|---|---|---|---|
| `ALLOWED_HOSTS` | `["*"]` | strict list | iPhone's IP is not `localhost` |
| `CORS_ALLOW_ALL_ORIGINS` | `True` | `False` | iPhone origin is `http://10.0.0.4:9000` |
| `SESSION_COOKIE_SECURE` | `False` | `True` | Safari refuses `Secure` cookie over HTTP |
| `SESSION_COOKIE_SAMESITE` | `"Lax"` | `"Lax"` | same both sides |
| `CSRF_TRUSTED_ORIGINS` | `[]` | `[FRONTEND_URL]` | dev uses `@conditional_csrf` (csrf_exempt) anyway |

All values are gated on `IS_PROD = (os.environ.get("DJANGO_ENV") == "production")`.
Azure sets `DJANGO_ENV=production`. Your local machine never sets it → always dev mode.

---

## Revert ALL files before committing

Run this from the `childsmile/` directory — reverts every changed file at once:

```bash
git checkout -- \
  childsmile/settings.py \
  childsmile/childsmile/settings.py \
  frontend/.env.development \
  frontend/webpack.config.js \
  frontend/src/index.js \
  frontend/src/components/Sidebar.js \
  frontend/public/service-worker.js
```

Or just: `git checkout -- .` if you have no other uncommitted work you care about.

---

## Why you were redirected to login (full root cause chain)

1. **`Sidebar.js`** used `!hostname.includes('localhost')` to detect prod
   → on iPhone hostname is `10.0.0.4` → `isProd = true` → `goTo('/tasks')` built `/#/tasks`
   → BrowserRouter in dev renders `/` (login) when URL is `/#/tasks` ✅ **fixed**

2. **Service Worker** registered in dev, intercepted all GET `/api/*`
   → iOS Safari strips session cookie from SW-re-issued fetches
   → Django returned 403 → axiosConfig redirected to login ✅ **fixed**

3. **Cross-origin cookie** — API on port `8000`, frontend on port `9000`
   → different origins → `SameSite=Lax` cookie not sent on cross-origin XHR ✅ **fixed by proxy**

4. **`SESSION_COOKIE_SECURE=True`** in dev → Safari silently drops cookie over HTTP ✅ **fixed**
