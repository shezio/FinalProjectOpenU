from django.contrib import admin
from .models import (
    Family,
    FamilyMember,
    Permissions,
    Staff,
    Tutor,
    Tutorship,
    Volunteer,
    Mature,
    HealthyKid,
    Feedback,
    TutorFeedback,
    VolunteerFeedback,
    Task,
)

admin.site.register(Family)
admin.site.register(FamilyMember)
admin.site.register(Permissions)
admin.site.register(Staff)
admin.site.register(Tutor)
admin.site.register(Tutorship)
admin.site.register(Volunteer)
admin.site.register(Mature)
admin.site.register(HealthyKid)
admin.site.register(Feedback)
admin.site.register(TutorFeedback)
admin.site.register(VolunteerFeedback)
admin.site.register(Task)

