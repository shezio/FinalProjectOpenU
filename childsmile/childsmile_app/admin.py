from django.contrib import admin
from .models import (
    Family,
    FamilyMember,
    Permissions,
    Staff,
    Tutor,
    Tutorship,
    TutorshipStatus,
    Volunteer,
    Mature,
    HealthyKid,
)

admin.site.register(Family)
admin.site.register(FamilyMember)
admin.site.register(Permissions)
admin.site.register(Staff)
admin.site.register(Tutor)
admin.site.register(Tutorship)
admin.site.register(TutorshipStatus)
admin.site.register(Volunteer)
admin.site.register(Mature)
admin.site.register(HealthyKid)

