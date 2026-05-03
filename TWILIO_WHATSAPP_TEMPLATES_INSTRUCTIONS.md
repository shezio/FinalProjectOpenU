# Twilio WhatsApp Templates for Meeting Lifecycle Events

Create these 3 new templates in your Twilio Console for the new instant meeting notifications.

---

## 📋 Template Setup Instructions

1. **Go to Twilio Console** → **Messaging** → **Content Templates**
2. **Create Content Template** for each one below
3. **Set Category**: `UTILITY` (required by Meta for non-marketing messages)
4. **Copy the Template SID** and add to your `.env` file or GitHub Secrets
5. **Language**: Hebrew (he)

---

## Template 1: Meeting Created (NEW)
**Env Var Name**: `TWILIO_MEETING_TEMPLATE_CREATED`

**Template Name**: `childsmile_meeting_created`

**Language**: Hebrew (he)

**Content Body**:
```
פגישה חדשה : {{3}}

🗓 {{1}} מועד הפגישה:
📍 מיקום: {{2}}

מערכת חיוך של ילד
```

**Variables**:
- `{{1}}` = date_str (e.g., "יום שני 05/05/2026 בשעה 10:00")
- `{{2}}` = location (e.g., "חדר ישיבות 2")
- `{{3}}` = meeting_title (e.g., "פגישת צוות חודשית")

**Category**: UTILITY

---

## Template 2: Meeting Updated (NEW)
**Env Var Name**: `TWILIO_MEETING_TEMPLATE_UPDATED`

**Template Name**: `childsmile_meeting_updated`

**Language**: Hebrew (he)

**Content Body**:
```
עדכון פגישה : {{3}}

🗓 {{1}} מועד הפגישה:
📍 מיקום: {{2}}

מערכת חיוך של ילד
```

**Variables**:
- `{{1}}` = date_str (e.g., "יום שני 05/05/2026 בשעה 10:00")
- `{{2}}` = location (e.g., "חדר ישיבות 2")
- `{{3}}` = meeting_title (e.g., "פגישת צוות חודשית")

**Category**: UTILITY

---

## Template 3: Meeting Cancelled (NEW)
**Env Var Name**: `TWILIO_MEETING_TEMPLATE_CANCELLED`

**Template Name**: `childsmile_meeting_cancelled`

**Language**: Hebrew (he)

**Content Body**:
```
ביטול פגישה : {{3}}

🗓 {{1}} מועד הפגישה:
📍 מיקום: {{2}}

מערכת חיוך של ילד
```

**Variables**:
- `{{1}}` = date_str (e.g., "יום שני 05/05/2026 בשעה 10:00")
- `{{2}}` = location (e.g., "חדר ישיבות 2")
- `{{3}}` = meeting_title (e.g., "פגישת צוות חודשית")

**Category**: UTILITY

---

## 🔧 Environment Variables to Add

Once all 3 templates are **approved by Meta** in Twilio, add these to your `.env` or GitHub Secrets:

```env
TWILIO_MEETING_TEMPLATE_CREATED=HT1234567890abcdef1234567890abcdef
TWILIO_MEETING_TEMPLATE_UPDATED=HT1234567890abcdef1234567890abcdef
TWILIO_MEETING_TEMPLATE_CANCELLED=HT1234567890abcdef1234567890abcdef
```
