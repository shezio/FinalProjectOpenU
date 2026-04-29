"""
Management command: python manage.py send_weekly_digest

Run manually or called by the scheduler.
  --dry-run        Build digest and print HTML to stdout, no emails sent
  --to EMAIL       Send to a specific address instead of real recipients (for testing)
"""

from django.core.management.base import BaseCommand
from childsmile_app.weekly_digest import send_weekly_digest, build_digest_data, build_digest_html
from childsmile_app.logger import api_logger
from django.conf import settings
from django.core.mail import send_mail


class Command(BaseCommand):
    help = "Send the weekly digest email to all active staff members"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Build the digest and print HTML to stdout without sending",
        )
        parser.add_argument(
            "--to",
            dest="to_email",
            default=None,
            help="Send digest to this email address instead of real recipients (testing)",
        )

    def handle(self, *args, **options):
        if options["dry_run"]:
            data = build_digest_data()
            html = build_digest_html(data)
            self.stdout.write(html)
            self.stdout.write(self.style.SUCCESS("\n[DRY RUN] Digest HTML written to stdout — no emails sent"))
            return

        to_email = options.get("to_email")
        if to_email:
            self.stdout.write(f"📤 Sending weekly digest to {to_email} (test mode)...")
            data = build_digest_data()
            html = build_digest_html(data)
            subject = f"📋 [TEST] סיכום שבועי – חיוך של ילד | {data['week_start']} – {data['generated_at'][:10]}"
            try:
                send_mail(
                    subject=subject,
                    message="",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[to_email],
                    fail_silently=False,
                    html_message=html,
                )
                self.stdout.write(self.style.SUCCESS(f"✅ Test digest sent to {to_email}"))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"❌ Failed to send to {to_email}: {e}"))
            return

        self.stdout.write("📤 Sending weekly digest...")
        result = send_weekly_digest()

        if result.get("error"):
            self.stderr.write(self.style.ERROR(f"❌ Error: {result['error']}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Sent: {result['sent']} | Failed: {result.get('failed', 0)}"
                )
            )
