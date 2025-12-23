"""
WSGI config for childsmile project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)  # עכשיו כל import יחפש כאן קודם

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')

application = get_wsgi_application()
