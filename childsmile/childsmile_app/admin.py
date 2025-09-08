from django.contrib import admin
from .models import (
    Permissions,
    Role,
    Staff,
    SignedUp,
    General_Volunteer,
    Pending_Tutor,
    Tutors,
    Children,
    Tutorships,
    Matures,
    Feedback,
    Tutor_Feedback,
    General_V_Feedback,
    Tasks,
    PossibleMatches,  # Add this line
    InitialFamilyData,
    PrevTutorshipStatuses,
)

admin.site.register(Permissions)
admin.site.register(Role)
admin.site.register(Staff)
admin.site.register(SignedUp)
admin.site.register(General_Volunteer)
admin.site.register(Pending_Tutor)
admin.site.register(Tutors)
admin.site.register(Children)
admin.site.register(Tutorships)
admin.site.register(Matures)
admin.site.register(Feedback)
admin.site.register(Tutor_Feedback)
admin.site.register(General_V_Feedback)
admin.site.register(Tasks)
admin.site.register(PossibleMatches)  # Add this line
admin.site.register(InitialFamilyData)
admin.site.register(PrevTutorshipStatuses)