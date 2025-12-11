# ChildSmile Azure VM Deployment Checklist

## Pre-Deployment (Before Day 1)
- [ ] Read full `DEPLOYMENT_GUIDE.md`
- [ ] Create Azure VM (Ubuntu 22.04 LTS) or use your existing one
- [ ] Note down VM IP address and domain name
- [ ] Get PostgreSQL connection string (if using Azure Database for PostgreSQL)
- [ ] Have AWS S3 credentials ready (for frontend and file storage)
- [ ] Have Google OAuth credentials ready (client ID + secret)
- [ ] Generate Django SECRET_KEY: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`

## Day 1: Initial VM Setup

### SSH and Update System
- [ ] SSH into VM: `ssh azureuser@your-ip-address`
- [ ] Run system updates: `sudo apt update && sudo apt upgrade -y`

### Install System Dependencies (Step 1 of guide)
- [ ] Install Python 3.11: `sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip`
- [ ] Install PostgreSQL client: `sudo apt install -y postgresql-client`
- [ ] Install ffmpeg: `sudo apt install -y ffmpeg libsm6 libxext6 libxrender-dev`
- [ ] Verify ffmpeg: `ffmpeg -version`
- [ ] Install Git: `sudo apt install -y git`

### Clone Repository and Setup (Step 2-3 of guide)
- [ ] Create app directory: `sudo mkdir -p /var/www/childsmile && sudo chown $USER:$USER /var/www/childsmile`
- [ ] Clone repo: `cd /var/www/childsmile && git clone --branch desktop <YOUR_REPO_URL> .`
- [ ] Create virtual env: `python3.11 -m venv venv`
- [ ] Activate venv: `source venv/bin/activate`
- [ ] Upgrade pip: `pip install --upgrade pip setuptools wheel`
- [ ] Install Python packages: `cd childsmile && pip install -r requirements.txt`
- [ ] Install additional packages:
  - `pip install gunicorn`
  - `pip install gTTS moviepy python-pptx`
- [ ] Verify key packages installed: `pip list | grep -E "gunicorn|gTTS|moviepy|django"`

### Configure Environment (Step 4 of guide)
- [ ] Copy .env from local: `scp childsmile/.env azureuser@your-ip:/var/www/childsmile/childsmile/.env`
- [ ] Or create manually: `nano childsmile/.env`
- [ ] Verify all DB and email credentials are correct for production
- [ ] Verify DEBUG=False in .env

### Database Setup (Step 5 of guide)
- [ ] Test PostgreSQL connection: `psql -h <db-host> -U <db-user> -d childsmile_db -c "SELECT 1;"`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create superuser (optional): `python manage.py createsuperuser`
- [ ] Verify migrations: `python manage.py migrate --check`

### Systemd Service Setup (Step 6 of guide)
- [ ] Create log directory: `sudo mkdir -p /var/log/childsmile && sudo chown www-data:www-data /var/log/childsmile`
- [ ] Create service file: `sudo nano /etc/systemd/system/childsmile.service`
- [ ] Copy content from guide's childsmile.service
- [ ] Set permissions: `sudo systemctl daemon-reload`
- [ ] Enable service: `sudo systemctl enable childsmile`
- [ ] Start service: `sudo systemctl start childsmile`
- [ ] Check status: `sudo systemctl status childsmile`
- [ ] Verify running: `curl http://127.0.0.1:8000/`

### Nginx Reverse Proxy Setup (Step 7 of guide)
- [ ] Verify Gunicorn is running: `curl http://127.0.0.1:8000/`
- [ ] Check service status: `sudo systemctl status childsmile`
- [ ] If needed, setup Nginx as reverse proxy (optional)

## Day 2: Frontend Deployment and Testing

### Deploy Frontend to AWS S3 (Step 8 of guide)
- [ ] On local machine, navigate to: `childsmile/frontend`
- [ ] Build frontend: `npm run build`
- [ ] Verify build directory created: `ls -la dist/`
- [ ] Configure AWS credentials: `aws configure`
- [ ] Sync to S3: `aws s3 sync dist/ s3://your-bucket-name/ --delete`
- [ ] Verify files on S3: `aws s3 ls s3://your-bucket-name/`

### Testing and Verification

#### API Testing
- [ ] Test dashboard endpoint: `curl https://your-domain.com/api/dashboard/`
- [ ] Test dashboard data loads: Check browser console (Network tab)
- [ ] Test video generation endpoint: `curl https://your-domain.com/api/dashboard/generate-video/`
- [ ] Test feedback endpoint: `curl "https://your-domain.com/api/dashboard/feedback/?timeframe=month"`

#### Service Testing
- [ ] Test service restart: `sudo systemctl restart childsmile`
- [ ] Check service status: `sudo systemctl status childsmile`
- [ ] Check logs: `sudo journalctl -u childsmile -n 50`
- [ ] Verify Nginx logs: `sudo tail -f /var/log/nginx/error.log`

#### Database Testing
- [ ] Connect to database: `psql -h <host> -U <user> -d childsmile_db`
- [ ] Run query: `SELECT COUNT(*) FROM childsmile_app_feedback;`
- [ ] Verify tables exist: `\dt`

#### Frontend Testing
- [ ] Open S3 URL in browser
- [ ] Check console for errors
- [ ] Test login flow
- [ ] Test dashboard page loads
- [ ] Test timeframe buttons (week/month/year)
- [ ] Test video generation feature
- [ ] Check video generation console logs

#### Full Integration Testing
- [ ] Create test feedback record in database
- [ ] Verify it appears in dashboard pie chart
- [ ] Test video generation with real data
- [ ] Download generated video and verify
- [ ] Check video has correct duration and quality

## Post-Deployment

### Monitoring
- [ ] Setup log rotation: `sudo apt install -y logrotate`
- [ ] Create logrotate config for Gunicorn logs
- [ ] Monitor disk space: `df -h`
- [ ] Monitor memory: `free -h`
- [ ] Monitor service: `sudo systemctl status childsmile --full`

### Backup Strategy
- [ ] Setup daily database backups (see guide)
- [ ] Setup media files backup
- [ ] Test backup restoration

### Performance Tuning
- [ ] Adjust Gunicorn workers based on CPU cores (see guide)
- [ ] Enable database connection pooling (see guide)
- [ ] Setup caching if needed

### Security
- [ ] Verify DEBUG=False
- [ ] Verify SECURE_SSL_REDIRECT=True
- [ ] Setup WAF if available
- [ ] Setup DDoS protection
- [ ] Verify SECRET_KEY is strong

## Ongoing Maintenance

### Weekly
- [ ] Check service status
- [ ] Review logs for errors
- [ ] Monitor disk space

### Monthly
- [ ] Test backup restoration
- [ ] Update system packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Review security updates
- [ ] Check service performance

### For Deployments
- [ ] Use the deploy script:
  ```bash
  cd /var/www/childsmile
  ./deploy.sh
  ```

## Troubleshooting Quick Links

If something goes wrong, check:
- Service logs: `sudo journalctl -u childsmile -f`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Database connection: `psql -h <host> -U <user> -d childsmile_db`
- Python errors: Check service stderr output
- Permission issues: `sudo chown -R www-data:www-data /var/www/childsmile`

See full `DEPLOYMENT_GUIDE.md` for detailed troubleshooting section.

---

**Total Estimated Time:** 2-3 hours for full deployment
**Critical Path:** System setup → Clone repo → Install packages → Configure env → Run migrations → Start service → Deploy frontend
