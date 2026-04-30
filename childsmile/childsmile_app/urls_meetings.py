from django.urls import path
from . import meeting_views

urlpatterns = [
    path("", meeting_views.meetings_list, name="meetings_list"),
    path("recipients/", meeting_views.meeting_recipients, name="meeting_recipients"),
    path("<int:meeting_id>/", meeting_views.meeting_detail, name="meeting_detail"),
    path("<int:meeting_id>/send-reminders/", meeting_views.send_reminders_now, name="send_reminders_now"),
]
