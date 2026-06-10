"""
URL configuration for the Notification Center.
Included under /api/notifications/ from main urls.py.
"""

from django.urls import path
from .notification_views import (
    get_notifications,
    get_notification_templates,
    create_notification,
    update_notification,
    delete_notification,
    refresh_birthday_notifications,
)

urlpatterns = [
    path("",                              get_notifications,            name="get_notifications"),
    path("templates/",                    get_notification_templates,   name="get_notification_templates"),
    path("create/",                       create_notification,          name="create_notification"),
    path("update/<int:notification_id>/", update_notification,          name="update_notification"),
    path("delete/<int:notification_id>/", delete_notification,          name="delete_notification"),
    path("refresh-birthdays/",            refresh_birthday_notifications, name="refresh_birthday_notifications"),
]
