"""
URL patterns for dashboard endpoints
"""
from django.urls import path
from . import dashboard_views

urlpatterns = [
    path('data/', dashboard_views.get_dashboard_data, name='dashboard_data'),
    path('feedback/', dashboard_views.get_feedback_data, name='feedback_data'),
    path('generate-video/', dashboard_views.generate_video_ai, name='generate_video'),
    path('video-status/<str:video_id>/', dashboard_views.video_generation_status, name='video_status'),
    path('download-video/<str:video_id>/', dashboard_views.download_video, name='download_video'),
    path('export-ppt/', dashboard_views.export_ppt, name='export_ppt'),
    path('download-ppt/<str:ppt_id>/', dashboard_views.download_ppt, name='download_ppt'),
    path('ai-chat/', dashboard_views.ai_chat, name='ai_chat'),
]
