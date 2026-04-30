import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'childsmile.settings')
django.setup()

from childsmile_app.models import Tasks, Staff, Role, Task_Types, Children
from django.utils import timezone

print('=== Task statuses ===')
for s in Tasks.objects.values_list('status', flat=True).distinct():
    print(repr(s))

print('\n=== Task types ===')
for t in Task_Types.objects.all():
    print(repr(t.task_type))

print('\n=== Coordinator roles ===')
for r in Role.objects.filter(role_name__icontains='coordinator'):
    print(repr(r.role_name))

today = timezone.now().date()
overdue = Tasks.objects.filter(due_date__lt=today).exclude(status__icontains='הושלמ')
print(f'\n=== Overdue tasks count: {overdue.count()} ===')
for t in overdue[:5]:
    print(f'  status={repr(t.status)} due={t.due_date} type={repr(t.task_type.task_type)} assigned={t.assigned_to.first_name} {t.assigned_to.last_name}')

print('\n=== Coordinators in Staff ===')
coords = Staff.objects.filter(roles__role_name__icontains='coordinator', is_active=True).distinct()
for c in coords:
    fname = f"{c.first_name} {c.last_name}"
    fam = Children.objects.filter(responsible_coordinator=fname).count()
    print(f'  {fname} | families={fam}')

print('\n=== Children responsible_coordinator values ===')
for v in Children.objects.values_list('responsible_coordinator', flat=True).distinct()[:20]:
    print(repr(v))
