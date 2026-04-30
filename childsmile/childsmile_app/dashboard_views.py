"""
Dashboard views for analytics and AI video generation
"""
from django.http import JsonResponse, FileResponse, HttpResponse
from rest_framework.decorators import api_view
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta
import json
import os
import tempfile
import uuid
from pathlib import Path

from .models import Children, Tutors, Tutorships, Feedback, Staff, Tasks
from .utils import conditional_csrf
from .audit_utils import is_admin, log_api_action
from .logger import api_logger
from .dashboard_services import (
    generate_dashboard_data,
    generate_ai_video,
    generate_ppt_slide,
    cleanup_temp_files
)


@conditional_csrf
@api_view(['GET'])
def get_dashboard_data(request):
    """Get all dashboard data for charts and KPIs"""
    api_logger.info("get_dashboard_data called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='VIEW_DASHBOARD_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            log_api_action(
                request=request,
                action='VIEW_DASHBOARD_FAILED',
                success=False,
                error_message="System Administrator permission required",
                status_code=403
            )
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='VIEW_DASHBOARD_FAILED',
            success=False,
            error_message="Staff member not found",
            status_code=403
        )
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Get timeframe parameter
        timeframe = request.GET.get('timeframe', 'month')
        
        # Calculate date range
        now = timezone.now()
        if timeframe == 'week':
            start_date = now - timedelta(days=7)
        elif timeframe == 'month':
            start_date = now - timedelta(days=30)
        elif timeframe == 'year':
            start_date = now - timedelta(days=365)
        else:  # 'all'
            start_date = None
        
        # KPI Cards
        total_families = Children.objects.count()
        
        # Families waiting for tutor (no tutorship record)
        waiting_families = Children.objects.filter(
            tutorships__isnull=True
        ).count()
        
        # Active tutorships (families that have a tutorship with active tutors)
        active_tutorships = Tutorships.objects.filter(tutor__staff__is_active=True).count()
        
        # Pending tutors (active tutors without tutees)
        pending_tutors = Tutors.objects.filter(
            staff__is_active=True,
            tutorship_status='אין_חניך'  # No Tutee
        ).count()
        
        staff_count = Staff.objects.filter(registration_approved=True, is_active=True).count()
        
        # Tutorship Status Distribution
        tutorship_with = active_tutorships
        tutorship_waiting = waiting_families
        
        # Tutors Status
        tutors_pending = pending_tutors
        tutors_active = Tutors.objects.filter(
            staff__is_active=True,
            tutorship_status='יש_חניך'  # Has Tutee
        ).count()
        
        # Feedback by Type
        feedback_query = Feedback.objects.all()
        if start_date:
            feedback_query = feedback_query.filter(timestamp__gte=start_date)
        
        feedback_data = {
            'tutor_fun_day': feedback_query.filter(feedback_type='tutor_fun_day').count(),
            'general_volunteer_fun_day': feedback_query.filter(feedback_type='general_volunteer_fun_day').count(),
            'general_volunteer_hospital_visit': feedback_query.filter(feedback_type='general_volunteer_hospital_visit').count(),
            'general_house_visit': feedback_query.filter(feedback_type='general_house_visit').count(),
            'tutorship': feedback_query.filter(feedback_type='tutorship').count()
        }
        
        # New families this month
        new_families_month = Children.objects.filter(
            registrationdate__gte=now - timedelta(days=30)
        ).count()
        
        # Cities with waiting families
        cities_data = Children.objects.filter(
            tutorships__isnull=True
        ).values('city').annotate(
            count=Count('child_id')
        ).order_by('-count')[:12]
        
        # Recent tutorships
        recent_tutorships = Tutorships.objects.select_related(
            'child', 'tutor', 'tutor__id'
        ).filter(tutor__staff__is_active=True).order_by('-created_date')[:10]
        
        recent_data = []
        for t in recent_tutorships:
            days_active = (now - t.created_date).days if t.created_date else 0
            child_name = f"{t.child.childfirstname} {t.child.childsurname}" if t.child else f"Child {t.child.child_id}"
            tutor_name = f"{t.tutor.id.first_name} {t.tutor.id.surname}" if t.tutor and t.tutor.id else "Unknown Tutor"
            recent_data.append({
                'child_name': child_name,
                'tutor_name': tutor_name,
                'days': days_active
            })
        
        # Age group opportunities (waiting families by age)
        age_groups = {
            '6-8': Children.objects.filter(
                tutorships__isnull=True,
                date_of_birth__lte=now - timedelta(days=6*365),
                date_of_birth__gte=now - timedelta(days=9*365)
            ).count(),
            '9-11': Children.objects.filter(
                tutorships__isnull=True,
                date_of_birth__lte=now - timedelta(days=9*365),
                date_of_birth__gte=now - timedelta(days=12*365)
            ).count(),
            '12-14': Children.objects.filter(
                tutorships__isnull=True,
                date_of_birth__lte=now - timedelta(days=12*365),
                date_of_birth__gte=now - timedelta(days=15*365)
            ).count(),
            '15-17': Children.objects.filter(
                tutorships__isnull=True,
                date_of_birth__lte=now - timedelta(days=15*365),
                date_of_birth__gte=now - timedelta(days=18*365)
            ).count(),
        }
        
        # Recent active tutorships table
        table_data = []
        for t in Tutorships.objects.select_related('child', 'tutor', 'tutor__id').order_by('-created_date')[:20]:
            weeks_active = (now - t.created_date).days // 7 if t.created_date else 0
            child_name = f"{t.child.childfirstname} {t.child.childsurname}" if t.child else f"משפחה {t.child.child_id}"
            tutor_name = f"{t.tutor.id.first_name} {t.tutor.id.surname}" if t.tutor and t.tutor.id else "Unknown Tutor"
            table_data.append({
                'child_name': child_name,
                'tutor_name': tutor_name,
                'start_date': t.created_date.strftime('%d/%m/%Y') if t.created_date else 'N/A',
                'duration': f"{weeks_active} שבועות",
                'status': 'פעיל'
            })
        
        response_data = {
            'kpis': {
                'total_families': total_families,
                'waiting_families': waiting_families,
                'active_tutorships': active_tutorships,
                'pending_tutors': pending_tutors,
                'staff_count': staff_count,
                'new_families_month': new_families_month
            },
            'charts': {
                'tutorship_status': {
                    'with_tutor': tutorship_with,
                    'waiting': tutorship_waiting
                },
                'tutors_status': {
                    'pending': tutors_pending,
                    'active': tutors_active
                },
                'feedback_by_type': feedback_data,
                'cities': [{'city': item['city'], 'count': item['count']} for item in cities_data],
                'recent_tutorships': recent_data,
                'age_groups': age_groups
            },
            'table': table_data
        }
        
        log_api_action(
            request=request,
            action='VIEW_DASHBOARD',
            success=True,
            status_code=200
        )
        
        return JsonResponse(response_data)
        
    except Exception as e:
        log_api_action(
            request=request,
            action='VIEW_DASHBOARD_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        api_logger.error(f"Error in get_dashboard_data: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['POST'])
def generate_video_ai(request):
    """Generate AI video based on dashboard data"""
    api_logger.info("generate_video_ai called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='GENERATE_VIDEO_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            log_api_action(
                request=request,
                action='GENERATE_VIDEO_FAILED',
                success=False,
                error_message="System Administrator permission required",
                status_code=403
            )
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Parse request body
        data = json.loads(request.body)
        
        timeframe = data.get('timeframe', 'חודש אחרון')
        duration = data.get('duration', '2-3 דקות')
        pages = data.get('pages', [])
        style = data.get('style', 'מקצועי ורשמי')
        
        # Generate unique video ID
        video_id = str(uuid.uuid4())
        
        # Get dashboard data
        dashboard_data = generate_dashboard_data(timeframe)
        
        # Generate video (simulated - returns temp file path)
        try:
            video_path = generate_ai_video(
                video_id=video_id,
                dashboard_data=dashboard_data,
                timeframe=timeframe,
                duration=duration,
                pages=pages,
                style=style
            )
            
            # Schedule cleanup after 1 hour
            cleanup_temp_files(video_path, delay_minutes=60)
            
            return JsonResponse({
                'success': True,
                'video_id': video_id,
                'download_url': f'/api/dashboard/download-video/{video_id}/',
                'title': f'סקירת מערכת - חיוך של ילד - {timeframe}',
                'duration_text': duration,
                'style': style
            })
        except Exception as video_error:
            error_msg = str(video_error)
            api_logger.error(f"Video generation failed: {error_msg}")
            return JsonResponse({
                'error': f'Video generation failed: {error_msg}'
            }, status=500)
        
    except Exception as e:
        api_logger.error(f"Unexpected error in generate_video_ai: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['GET'])
def download_video(request, video_id):
    """Download generated video"""
    api_logger.info("download_video called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Get video path from cache
        temp_dir = Path(tempfile.gettempdir()) / 'childsmile_videos'
        video_path = temp_dir / f"{video_id}.mp4"
        
        if not video_path.exists():
            return JsonResponse({'error': 'Video not found or expired'}, status=404)
        
        # Return file
        response = FileResponse(
            open(video_path, 'rb'),
            content_type='video/mp4',
            as_attachment=True,
            filename=f'ChildSmile_Marketing_{video_id[:8]}.mp4'
        )
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['GET'])
def video_generation_status(request, video_id):
    """Check if video generation is complete"""
    api_logger.info(f"video_generation_status called for {video_id}")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Check if video file exists
        temp_dir = Path(tempfile.gettempdir()) / 'childsmile_videos'
        video_path = temp_dir / f"{video_id}.mp4"
        
        if video_path.exists():
            # Get file size
            file_size = video_path.stat().st_size
            return JsonResponse({
                'status': 'completed',
                'video_id': video_id,
                'file_size': file_size,
                'download_url': f'/api/dashboard/download-video/{video_id}/'
            })
        else:
            return JsonResponse({
                'status': 'generating',
                'video_id': video_id,
                'message': 'Video is being generated, please wait...'
            })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['POST'])
def export_ppt(request):
    """Export dashboard as PowerPoint slide"""
    api_logger.info("export_ppt called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='EXPORT_PPT_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            log_api_action(
                request=request,
                action='EXPORT_PPT_FAILED',
                success=False,
                error_message="System Administrator permission required",
                status_code=403
            )
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Parse request body
        data = json.loads(request.body)
        
        # Get dashboard data
        dashboard_data = generate_dashboard_data('month')
        
        # Generate PPT
        ppt_id = str(uuid.uuid4())
        ppt_path = generate_ppt_slide(ppt_id, dashboard_data)
        
        # Schedule cleanup after 1 hour
        cleanup_temp_files(ppt_path, delay_minutes=60)
        
        return JsonResponse({
            'success': True,
            'download_url': f'/api/dashboard/download-ppt/{ppt_id}/',
            'filename': 'ChildSmile_Dashboard.pptx'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['GET'])
def download_ppt(request, ppt_id):
    """Download generated PPT"""
    api_logger.info("download_ppt called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Get PPT path from cache
        temp_dir = Path(tempfile.gettempdir()) / 'childsmile_ppts'
        ppt_path = temp_dir / f"{ppt_id}.pptx"
        
        if not ppt_path.exists():
            return JsonResponse({'error': 'File not found or expired'}, status=404)
        
        # Return file
        response = FileResponse(
            open(ppt_path, 'rb'),
            content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation',
            as_attachment=True,
            filename='ChildSmile_Dashboard.pptx'
        )
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['GET'])
def get_feedback_data(request):
    """Get feedback data filtered by timeframe"""
    api_logger.info("get_feedback_data called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        # Get timeframe parameter
        timeframe = request.GET.get('timeframe', 'month')
        
        # Calculate date range
        now = timezone.now()
        if timeframe == 'week':
            start_date = now - timedelta(days=7)
        elif timeframe == 'month':
            start_date = now - timedelta(days=30)
        elif timeframe == 'year':
            start_date = now - timedelta(days=365)
        else:  # 'all'
            start_date = None
        
        # Get feedback by type
        feedback_query = Feedback.objects.all()
        if start_date:
            feedback_query = feedback_query.filter(timestamp__gte=start_date)
        
        feedback_data = {
            'tutor_fun_day': feedback_query.filter(feedback_type='tutor_fun_day').count(),
            'general_volunteer_fun_day': feedback_query.filter(feedback_type='general_volunteer_fun_day').count(),
            'general_volunteer_hospital_visit': feedback_query.filter(feedback_type='general_volunteer_hospital_visit').count(),
            'general_house_visit': feedback_query.filter(feedback_type='general_house_visit').count(),
            'tutorship': feedback_query.filter(feedback_type='tutorship').count(),
        }
        
        return JsonResponse(feedback_data)
        
    except Exception as e:
        api_logger.error(f"Error in get_feedback_data: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@conditional_csrf
@api_view(['POST'])
def ai_chat(request):
    """Handle AI chat messages"""
    api_logger.info("ai_chat called")
    
    # Check user authentication
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    
    # Check if user is System Administrator
    try:
        staff = Staff.objects.get(staff_id=user_id)
        if not is_admin(staff):
            return JsonResponse(
                {"error": "System Administrator permission required."}, status=403
            )
    except Staff.DoesNotExist:
        return JsonResponse({"error": "Staff member not found."}, status=403)
    
    try:
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        
        # Simple AI response logic
        response = get_ai_chat_response(message)
        
        return JsonResponse({
            'success': True,
            'response': response
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def get_ai_chat_response(message):
    """Generate AI chat response"""
    
    message_lower = message.lower()
    
    if 'וידאו' in message or 'סרטון' in message:
        return (
            'מצוין! אני רואה שבחרת:<br>'
            '• טווח זמן: חודש אחרון<br>'
            '• משך: 2-3 דקות<br>'
            '• עמודים: לוח בקרה, משפחות, חונכים, מתנדבים<br>'
            '• סגנון: מקצועי ורשמי<br><br>'
            'האם תרצה לשנות משהו לפני שאתחיל לייצר את הסרטון?'
        )
    
    if 'כן' in message or 'התחל' in message or 'בסדר' in message:
        return (
            'נהדר! מתחיל לייצר את הסרטון עכשיו... 🎬<br>'
            'לחץ על כפתור "צור סרטון סקירה" למטה כדי להתחיל!'
        )
    
    if 'משפחות' in message or 'נתונים' in message:
        total = Children.objects.count()
        new_month = Children.objects.filter(
            registrationdate__gte=timezone.now() - timedelta(days=30)
        ).count()
        waiting = Children.objects.filter(
            tutorships__isnull=True
        ).count()
        active = Tutorships.objects.count()
        
        return (
            f'בחודש האחרון:<br>'
            f'• {total} משפחות רשומות במערכת<br>'
            f'• {new_month} משפחות חדשות<br>'
            f'• {waiting} משפחות ממתינות לחונך<br>'
            f'• {active} חונכויות פעילות<br><br>'
            f'האם תרצה לראות את הנתונים האלה בסרטון?'
        )
    
    return (
        'אני כאן לעזור! אפשר לשאול אותי על:<br>'
        '• נתוני המערכת<br>'
        '• יצירת סרטון סקירה<br>'
        '• התאמת אפשרויות הסרטון<br>'
        '• או כל שאלה אחרת 😊'
    )


@conditional_csrf
@api_view(['GET'])
def get_coordinator_workload(request):
    """Return workload stats per coordinator: families, open tasks, overdue reviews"""
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    today = timezone.now().date()

    # Get all coordinators (roles containing 'coordinator')
    coordinators = Staff.objects.filter(
        roles__role_name__icontains='coordinator',
        is_active=True
    ).distinct()

    result = []
    for coord in coordinators:
        full_name = f"{coord.first_name} {coord.last_name}"

        # Families this coordinator is responsible for
        families_count = Children.objects.filter(
            responsible_coordinator=full_name
        ).count()

        # Open tasks assigned to this coordinator (not completed)
        open_tasks = Tasks.objects.filter(
            assigned_to=coord,
        ).exclude(status='הושלמה').count()

        # Overdue reviews: 'שיחת ביקורת' tasks past due_date and not completed
        overdue_reviews = Tasks.objects.filter(
            assigned_to=coord,
            task_type__task_type='שיחת ביקורת',
            due_date__lt=today,
        ).exclude(status='הושלמה').count()

        result.append({
            'name': full_name,
            'families': families_count,
            'open_tasks': open_tasks,
            'overdue_reviews': overdue_reviews,
        })

    # Sort by open_tasks descending so the busiest coordinator is first
    result.sort(key=lambda x: x['open_tasks'], reverse=True)

    return JsonResponse({'coordinators': result})
