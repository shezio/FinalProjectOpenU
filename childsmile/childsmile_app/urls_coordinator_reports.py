"""
urls_coordinator_reports.py - URL routing for coordinator progress reports

Endpoints:
  GET    /api/coordinator-reports/                  - list all reports
  GET    /api/coordinator-reports/<id>/             - get report details
  PUT    /api/coordinator-reports/<id>/             - update report (reviewed, notes)
  POST   /api/coordinator-reports/send-now/         - manually trigger weekly request
  GET    /api/coordinator-reports/summary/          - dashboard summary stats
"""

from django.urls import path
from . import coordinator_reports_views

urlpatterns = [
    path("", coordinator_reports_views.coordinator_reports_list, name="coordinator_reports_list"),
    path("summary/", coordinator_reports_views.coordinator_reports_summary, name="coordinator_reports_summary"),
    path("send-now/", coordinator_reports_views.send_weekly_request_now, name="send_weekly_request_now"),
    path("<int:report_id>/", coordinator_reports_views.coordinator_report_detail, name="coordinator_report_detail"),
]
