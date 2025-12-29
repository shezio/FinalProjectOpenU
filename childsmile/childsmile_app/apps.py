from django.apps import AppConfig


class ChildsmileAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'childsmile_app'

    def ready(self):
        """
        Initialize background scheduler when Django app is ready.
        This will run the monthly task check at 4:00 AM Israel time daily.
        """
        from .scheduler import start_scheduler
        start_scheduler()
