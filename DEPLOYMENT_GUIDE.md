# ChildSmile Django Server Deployment Guide

This guide covers deploying the Django backend on a new Azure VM (or any Linux VM).

## Prerequisites

- Ubuntu 22.04 LTS (or similar Linux distro)
- SSH access to the VM
- PostgreSQL database (can be Azure Database for PostgreSQL)
- Git installed

---

## Step 1: Initial Setup (SSH into VM)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python, pip, and virtual environment
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install PostgreSQL client (for connecting to Azure Database for PostgreSQL)
sudo apt install -y postgresql-client

# Install system dependencies for video processing
sudo apt install -y ffmpeg libsm6 libxext6 libxrender-dev

# Install git
sudo apt install -y git
```

---

## Step 2: Clone Repository and Setup

```bash
# Clone the repo
git clone <YOUR_REPO_URL> .
# Or if on existing branch
git clone --branch desktop <YOUR_REPO_URL> .

# Navigate to project root
cd /var/www/childsmile

# Create Python virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel
```

---

## Step 3: Install Python Dependencies

```bash
# Navigate to Django app directory
cd childsmile

# Install base requirements
pip install -r requirements.txt

# Install additional packages for video generation and PPT export
pip install gunicorn
pip install gTTS==2.5.1
pip install moviepy==1.0.3
pip install python-pptx==0.6.21
```

### Summary of pip packages:
- **gunicorn** - WSGI server
- **gTTS** - Google Text-to-Speech (for video narration)
- **moviepy** - Video processing (for creating videos from slides)
- **python-pptx** - PowerPoint generation
- **Pillow** - Image processing (already in requirements.txt)

---

## Step 4: Configure Environment Variables

Copy your `.env` file to the production VM:

```bash
# Copy from your local machine to the VM
scp childsmile/.env azureuser@your-ip:/var/www/childsmile/childsmile/.env
```

Or manually create it with your production credentials (following the same format as your development `.env`):
```bash
nano /var/www/childsmile/childsmile/.env
```

Key variables (update for production):
```
SECRET_KEY=your-secret-key-here
DEBUG=False
DB_NAME=childsmile_db
DB_USER=your-prod-user
DB_PASSWORD=your-secure-password
DB_HOST=your-postgres-server
DB_PORT=5432
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

**Note:** Your Django settings.py already uses `load_dotenv()`, so environment variables from `.env` will be loaded automatically.

---

## Step 5: Setup Database

```bash
# Ensure psycopg2 is installed
pip install psycopg2-binary

# Navigate to Django project
cd /var/www/childsmile/childsmile

# Run migrations
python manage.py migrate

# Create superuser (optional, for admin)
python manage.py createsuperuser

# Collect static files (if needed)
python manage.py collectstatic --noinput
```

---

## Step 6: Create Systemd Service File

```bash
# Create systemd service file
sudo nano /etc/systemd/system/childsmile.service
```

Add the following content:
```ini
[Unit]
Description=ChildSmile Django Application
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/childsmile/childsmile

# Activate virtual environment and run gunicorn
ExecStart=/var/www/childsmile/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/childsmile/access.log \
    --error-logfile /var/log/childsmile/error.log \
    childsmile.wsgi:application

Restart=always
RestartSec=10

# Environment file
EnvironmentFile=/var/www/childsmile/childsmile/.env

[Install]
WantedBy=multi-user.target
```

Create log directory:
```bash
sudo mkdir -p /var/log/childsmile
sudo chown www-data:www-data /var/log/childsmile
sudo chmod 755 /var/log/childsmile
```

---

## Step 7: Start the Service

```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable childsmile

# Start the service
sudo systemctl start childsmile

# Check status
sudo systemctl status childsmile

# View logs
sudo journalctl -u childsmile -f
```

---

## Step 8: Frontend Deployment (AWS S3)

```bash
# From your local machine, sync frontend build to S3
cd /Users/shlomosmac/Applications/dev/FinalProjectOpenU/childsmile/frontend

# Build the frontend
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Optional: Invalidate CloudFront cache if using CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Verification Checklist

- [ ] Django app running: `curl http://127.0.0.1:8000/`
- [ ] Nginx proxying correctly: `curl http://localhost/`
- [ ] Database migrations complete: `python manage.py migrate --check`
- [ ] Static files collected: Check `/var/www/childsmile/childsmile/static/`
- [ ] Service auto-restarts: Test with `sudo systemctl restart childsmile`
- [ ] Logs are being written: `tail -f /var/log/childsmile/error.log`
- [ ] API endpoints responding: Test dashboard endpoint
- [ ] S3 frontend accessible: Check CloudFront/S3 URL

---

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u childsmile -n 50 --no-pager
```

### Database connection fails
```bash
# Test PostgreSQL connection
psql -h your-postgres-server.postgres.database.azure.com \
     -U admin@yourserver \
     -d childsmile_db
```

### Permission denied errors
```bash
sudo chown -R www-data:www-data /var/www/childsmile
sudo chmod -R 755 /var/www/childsmile
```

### Video generation fails
```bash
# Ensure ffmpeg is installed
which ffmpeg
ffmpeg -version

# Check temp directory permissions
ls -la /tmp/ | grep childsmile
```

---

## Performance Tuning

### Gunicorn Workers
```bash
# Formula: (2 × CPU cores) + 1
# For 2-core VM: 5 workers
# For 4-core VM: 9 workers
# Update in childsmile.service --workers flag
```

### Database Connection Pooling
Add to `settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Connection pooling
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

---

## Backup Strategy

```bash
# Daily database backup
sudo crontab -e

# Add this line:
0 2 * * * pg_dump -h your-postgres-server.postgres.database.azure.com \
    -U admin@yourserver childsmile_db | \
    gzip > /backups/childsmile_db_$(date +\%Y\%m\%d).sql.gz
```

---

## Quick Deployment Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
set -e

cd /var/www/childsmile
source venv/bin/activate
cd childsmile

# Pull latest code
git pull origin desktop

# Install requirements
pip install -r requirements.txt --upgrade
pip install gunicorn gTTS moviepy python-pptx

# Run migrations
python manage.py migrate

# Restart service
sudo systemctl restart childsmile
sudo systemctl restart nginx

echo "✅ Deployment complete!"
sudo systemctl status childsmile
```

Make it executable:
```bash
chmod +x deploy.sh

# Run anytime:
./deploy.sh
```

---

## Summary of All Commands

```bash
# One-time setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3.11-dev postgresql-client ffmpeg git

cd /var/www/childsmile
git clone --branch desktop <REPO_URL> .

cd childsmile
python3.11 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
pip install gunicorn gTTS moviepy python-pptx

# Copy .env from local machine or create manually
scp local:/path/to/.env .

# Database setup
python manage.py migrate
python manage.py createsuperuser

# Systemd setup
sudo nano /etc/systemd/system/childsmile.service
sudo mkdir -p /var/log/childsmile
sudo chown www-data:www-data /var/log/childsmile

# Start services
sudo systemctl daemon-reload
sudo systemctl enable childsmile
sudo systemctl start childsmile

# Verify running
curl http://127.0.0.1:8000/api/dashboard/
```

That's it! Your Django app is ready to serve API requests on port 8000.
**Frontend:** Deploy separately to AWS S3 using `npm run build && aws s3 sync dist/ s3://your-bucket/`
