 implement the new refund Module (החזרי הוצאות) into the system. 

 Do NOT generate standard Django migration files. but provide the raw PostgreSQL SQL statements required to create the new tables, columns, indexes, and constraints directly in the database cluster.


1. refund Object & Logic:
- Track fields: staff_id (FK from staff table, auto-assigned by the logged in user), staff full name (we get it from the user that logged in), created_at (auto), updated_at (auto), expense_date, requested_amount, approved_amount (nullable, mandatory only if status is partially approved), description, volunteer_comment, and admin_comment (for rejection/partial approval reasons), approved_by, file_url (for receipt storage), status, refund_method, and phone_number.
- Receipt File: Handled via Azure Blob Storage. Ensure the field allows null/blank to support our upcoming historical 2026 Excel data import. File size limit: 10MB. Provide native browser preview URL capability so Liam can view receipts without downloading.
- in UI we must have a Coordinator Approval Checkbox/Dropdown: Hardcoded options only: ('נעם', 'נעם'), ('טל', 'טל'), ('נבו', 'נבו'), ('אורי', 'אורי'), ('ליאם', 'ליאם'). (This captures who approved it verbally offline).
- Statuses: 'ממתין' as default, 'אושר', 'אושר חלקית', 'שולם', 'בוטל/נדחה'.
- Payment Method: Mandatory only when status becomes 'Paid'. Choices: ('ביט', 'ביט'), ('פייבוקס', 'פייבוקס'), ('העברה בנקאית', 'העברה בנקאית'), ('אשראי', 'אשראי'), ('מזומן', 'מזומן').

2. Phone for Bit Integration & History Lookup:
- On form initialization, check the user's historical refund records. If they have a previously used phone number for a successful payout, default to it. Otherwise, fallback to their profile phone number.
- Include a "Use this number" checkbox. If unchecked, expose an alternative phone input field with strict Israeli phone regex validation.
- Include a "Save this number for future payouts" flag to update their historical preference upon submission.

3. Rigid Server-Side Permissions & Security:
- Volunteers access this via the existing feedback/survey route (POST) and a unified "refund" view (GET).
- The GET queryset for non-admins MUST be strictly restricted on the server-side to `request.user` only. Any attempt by a volunteer to query, edit, or delete a record that isn't theirs must instantly trigger a 403 Forbidden / 404 response. No security through obscurity—block it at the API layer.
- Admins (Liam) have full global access to see all requests, modify statuses, edit amounts, leave admin comments, and execute soft-deletes.

4. Notification Hooks & Admin Panel Integration:
- In the views, place explicit comments/placeholders for WhatsApp notifications by adding a WhatsApp util to the utils we already have and also suggest twilio template like the templates we already have - not same but similar in structure and content.:
  - On create (to Liam): "ישנה בקשת החזר חדשה לטיפול - [Name] - [Amount]. פרטים נוספים במסך הניהול."
  - On status change (to Volunteer): Notify them of the status update, including amounts or admin comments - same util for all the notifications to volunteers.
- Integrate into our existing task board system: Creating a request automatically triggers a task assigned to Liam. The collapsed card shows only [Name] and [Amount], and opening it (Split View) shows full details with a deep link to the unified refund screen.

5. Reporting & Management Command:
- Outline a Django Management Command blueprint to import the historical 2026 data from an Excel spreadsheet without requiring receipt files.
- Provide an endpoint structure for generating Monthly, Quarterly, and Annual expense reports, supporting export to PDF (official donor layout) and Excel (internal audit).

Please output the clean Python/Django code matching our existing codebase patterns, followed by the raw PostgreSQL SQL script to manually execute on the DB.

dont make up any design patterns u did not see  - u must follow the same patterns we have in the existing codebase. - for frontend and backend