from django.core.management.base import BaseCommand
from childsmile_app.models import Tutorships

class Command(BaseCommand):
    help = 'Fix tutorship activation status based on approval_counter'

    def handle(self, *args, **options):
        # Update tutorships with approval_counter >= 2 to 'active'
        updated_count = 0
        
        for tutorship in Tutorships.objects.all():
            if tutorship.approval_counter >= 2 and tutorship.tutorship_activation != 'active':
                tutorship.tutorship_activation = 'active'
                tutorship.save()
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated tutorship ID {tutorship.id} (child: {tutorship.child_id}, tutor: {tutorship.tutor_id}) to active'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nTotal tutorships updated: {updated_count}')
        )
