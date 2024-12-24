from django import forms
from .models import Family, FamilyMember

class FamilyForm(forms.ModelForm):
    class Meta:
        model = Family
        fields = '__all__'

class FamilyMemberForm(forms.ModelForm):
    class Meta:
        model = FamilyMember
        fields = '__all__'