# Phase POS - Roles and Permissions Requirements

## English

- Document Type: Functional Requirements
- Scope: POS Roles, User Access, and Screen Visibility
- Phase: POS / Point of Sale Access Control
- Total Requirements: 45

This document captures the baseline requirements for user roles and permissions related to the POS module inside the accounting system. The current scope focuses only on two operational roles: `cashier` and `accountant`. The POS is designed as a controlled sales interface where the cashier performs daily sales operations, while the accountant reviews completed POS sales and posts the related accounting entries.

The main access-control principle is that each user shall log in with a unique username and password, and the system shall determine what the user can see and do based on the assigned role and permissions. Cashiers should see only the POS-related operational screens. Accountants should see the accounting system screens plus POS review, reporting, and posting screens.

### Proposed module slices

- `authentication`
- `role-permission-control`
- `cashier-access`
- `accountant-access`
- `pos-session-control`
- `pos-sales-visibility`
- `pos-accounting-review`
- `menu-and-route-visibility`
- `audit-trail`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: صلاحيات المستخدمين وإظهار الشاشات داخل وحدة نقاط البيع
- المرحلة: نقاط البيع / التحكم بالوصول
- إجمالي المتطلبات: 45

هذا الملف يوثّق خط الأساس لمتطلبات الأدوار والصلاحيات الخاصة بإضافة وحدة نقاط البيع داخل نظام المحاسبة. النطاق الحالي يركز فقط على دورين تشغيليين: `cashier` و `accountant`. تم تصميم نقاط البيع كواجهة بيع مضبوطة؛ حيث يقوم الكاشير بعمليات البيع اليومية، بينما يقوم المحاسب بمراجعة مبيعات نقاط البيع المكتملة وترحيل القيود المحاسبية المرتبطة بها.

المبدأ الأساسي للتحكم بالوصول هو أن كل مستخدم يجب أن يدخل إلى النظام باسم مستخدم وكلمة مرور خاصة به، ثم يحدد النظام ما يمكنه رؤيته وتنفيذه بناءً على الدور والصلاحيات المرتبطة به. يجب أن يرى الكاشير فقط شاشات نقاط البيع التشغيلية، بينما يرى المحاسب شاشات النظام المحاسبي بالإضافة إلى شاشات مراجعة نقاط البيع والتقارير والترحيل.

### التقسيم المقترح للوحدات الفرعية

- `authentication`
- `role-permission-control`
- `cashier-access`
- `accountant-access`
- `pos-session-control`
- `pos-sales-visibility`
- `pos-accounting-review`
- `menu-and-route-visibility`
- `audit-trail`
- `validation-control`

## 1. Authentication & User Accounts | تسجيل الدخول وحسابات المستخدمين

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RL-001 | The system shall require every user to log in using a unique username and password. | يجب أن يطلب النظام من كل مستخدم تسجيل الدخول باستخدام اسم مستخدم وكلمة مرور خاصة به. |
| REQ-POS-RL-002 | The system shall store user passwords as secure password hashes and shall not store plain text passwords. | يجب أن يحفظ النظام كلمات المرور كقيم مشفرة آمنة ولا يجوز حفظ كلمات المرور كنص صريح. |
| REQ-POS-RL-003 | The system shall assign one or more roles to each active user account. | يجب أن يسمح النظام بتعيين دور واحد أو أكثر لكل حساب مستخدم نشط. |
| REQ-POS-RL-004 | The system shall determine allowed screens, actions, and API access based on the user role and permissions after login. | يجب أن يحدد النظام الشاشات والإجراءات وواجهات البرمجة المسموحة بناءً على دور المستخدم وصلاحياته بعد تسجيل الدخول. |
| REQ-POS-RL-005 | The system shall prevent inactive users from logging in. | يجب أن يمنع النظام المستخدمين غير النشطين من تسجيل الدخول. |
| REQ-POS-RL-006 | The system shall record the user ID on all POS sales, sessions, payments, approvals, and posting actions. | يجب أن يسجل النظام رقم المستخدم على جميع عمليات البيع والورديات والدفع والاعتمادات والترحيلات الخاصة بنقاط البيع. |

## 2. Roles & Permission Model | نموذج الأدوار والصلاحيات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RL-007 | The system shall support a role-based access control model for POS access. | يجب أن يدعم النظام نموذج التحكم بالوصول بناءً على الأدوار لصلاحيات نقاط البيع. |
| REQ-POS-RL-008 | The system shall support at least two POS-related roles: Cashier and Accountant. | يجب أن يدعم النظام على الأقل دورين متعلقين بنقاط البيع: الكاشير والمحاسب. |
| REQ-POS-RL-009 | The system shall allow each role to be linked to a defined list of permissions. | يجب أن يسمح النظام بربط كل دور بقائمة محددة من الصلاحيات. |
| REQ-POS-RL-010 | The system shall not rely only on frontend menu hiding for security; backend APIs shall also validate permissions. | يجب ألا يعتمد النظام فقط على إخفاء القوائم من الواجهة للحماية، بل يجب أن تتحقق واجهات البرمجة الخلفية أيضًا من الصلاحيات. |
| REQ-POS-RL-011 | The system shall deny access to any route, screen, or API endpoint that is not included in the user's permissions. | يجب أن يمنع النظام الوصول إلى أي مسار أو شاشة أو واجهة برمجة غير موجودة ضمن صلاحيات المستخدم. |
| REQ-POS-RL-012 | The system shall redirect users to their default allowed page after login based on their role. | يجب أن يوجه النظام المستخدمين بعد تسجيل الدخول إلى الصفحة الافتراضية المسموحة حسب الدور. |

## 3. Cashier Role | دور الكاشير

The cashier is responsible for operational POS sales only. The cashier should not access accounting, general ledger, purchases, bank reconciliation, inventory management, system settings, or accounting posting screens.

الكاشير مسؤول فقط عن عمليات البيع التشغيلية داخل نقاط البيع. لا يجب أن يصل الكاشير إلى شاشات المحاسبة أو دفتر الأستاذ أو المشتريات أو التسوية البنكية أو إدارة المخزون أو إعدادات النظام أو الترحيل المحاسبي.

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RL-013 | The system shall redirect users with the Cashier role directly to the POS register screen after login. | يجب أن يوجه النظام المستخدمين بدور الكاشير مباشرة إلى شاشة الكاشير بعد تسجيل الدخول. |
| REQ-POS-RL-014 | The system shall show the cashier only POS operational screens. | يجب أن يعرض النظام للكاشير شاشات نقاط البيع التشغيلية فقط. |
| REQ-POS-RL-015 | The system shall allow the cashier to open a POS session when no active session exists for that cashier. | يجب أن يسمح النظام للكاشير بفتح وردية نقاط بيع إذا لم تكن لديه وردية نشطة. |
| REQ-POS-RL-016 | The system shall allow the cashier to enter opening cash when opening a POS session. | يجب أن يسمح النظام للكاشير بإدخال الرصيد الافتتاحي عند فتح وردية نقاط البيع. |
| REQ-POS-RL-017 | The system shall allow the cashier to access the POS sales screen. | يجب أن يسمح النظام للكاشير بالدخول إلى شاشة البيع الخاصة بنقاط البيع. |
| REQ-POS-RL-018 | The system shall allow the cashier to search for items by item name, item code, or barcode. | يجب أن يسمح النظام للكاشير بالبحث عن الأصناف حسب اسم الصنف أو رمزه أو الباركود. |
| REQ-POS-RL-019 | The system shall allow the cashier to add items to the POS cart. | يجب أن يسمح النظام للكاشير بإضافة الأصناف إلى سلة البيع. |
| REQ-POS-RL-020 | The system shall allow the cashier to update item quantity before sale completion. | يجب أن يسمح النظام للكاشير بتعديل كمية الصنف قبل إتمام البيع. |
| REQ-POS-RL-021 | The system shall allow the cashier to remove items from the cart before sale completion. | يجب أن يسمح النظام للكاشير بإزالة الأصناف من السلة قبل إتمام البيع. |
| REQ-POS-RL-022 | The system shall allow the cashier to hold a sale before payment completion. | يجب أن يسمح النظام للكاشير بتعليق عملية البيع قبل إتمام الدفع. |
| REQ-POS-RL-023 | The system shall allow the cashier to resume only held sales created by the same cashier or within the same active session. | يجب أن يسمح النظام للكاشير باستكمال الفواتير المعلقة الخاصة به فقط أو المرتبطة بنفس ورديته النشطة. |
| REQ-POS-RL-024 | The system shall allow the cashier to void draft or held POS sales before completion. | يجب أن يسمح النظام للكاشير بإلغاء فواتير نقاط البيع المسودة أو المعلقة قبل إتمامها. |
| REQ-POS-RL-025 | The system shall allow the cashier to select an allowed payment method such as cash, card, CliQ, wallet, or bank transfer. | يجب أن يسمح النظام للكاشير باختيار طريقة دفع مسموحة مثل النقد أو البطاقة أو كليك أو المحفظة أو التحويل البنكي. |
| REQ-POS-RL-026 | The system shall allow the cashier to complete a POS sale after required validations pass. | يجب أن يسمح النظام للكاشير بإتمام عملية بيع نقاط البيع بعد نجاح قواعد التحقق المطلوبة. |
| REQ-POS-RL-027 | The system shall allow the cashier to print the POS receipt after completing the sale. | يجب أن يسمح النظام للكاشير بطباعة إيصال نقاط البيع بعد إتمام البيع. |
| REQ-POS-RL-028 | The system shall allow the cashier to view only the current active session and own session summary. | يجب أن يسمح النظام للكاشير بعرض ورديته الحالية وملخص ورديته فقط. |
| REQ-POS-RL-029 | The system shall allow the cashier to close only their own POS session. | يجب أن يسمح النظام للكاشير بإغلاق ورديته الخاصة فقط. |
| REQ-POS-RL-030 | The system shall allow the cashier to enter actual cash during session closing so the system can calculate the cash difference. | يجب أن يسمح النظام للكاشير بإدخال النقد الفعلي عند إغلاق الوردية حتى يقوم النظام بحساب فرق الصندوق. |

### Cashier visible screens | الشاشات الظاهرة للكاشير

| Screen / Route | English Visibility Rule | قاعدة الإظهار بالعربية |
| --- | --- | --- |
| `/pos/register` | Visible and default page after login. | ظاهرة وهي الصفحة الافتراضية بعد تسجيل الدخول. |
| `/pos/session` | Visible for opening, viewing, and closing own session. | ظاهرة لفتح وعرض وإغلاق وردية الكاشير الخاصة. |
| `/pos/held-sales` | Visible only for own held sales or current session held sales. | ظاهرة فقط للفواتير المعلقة الخاصة بالكاشير أو ورديته الحالية. |
| `/pos/receipt` | Visible only for receipts created by the cashier within the allowed session context. | ظاهرة فقط للإيصالات التي أنشأها الكاشير ضمن سياق الوردية المسموح. |

### Cashier hidden screens | الشاشات المخفية عن الكاشير

| Module / Screen | English Rule | القاعدة بالعربية |
| --- | --- | --- |
| Chart of Accounts | Hidden and blocked. | مخفي وممنوع. |
| Journal Entries | Hidden and blocked. | مخفي وممنوع. |
| General Ledger | Hidden and blocked. | مخفي وممنوع. |
| Bank & Cash management | Hidden and blocked except selecting configured POS payment methods. | مخفي وممنوع باستثناء اختيار طرق الدفع المعرفة لنقاط البيع. |
| Bank Reconciliation | Hidden and blocked. | مخفي وممنوع. |
| Purchases | Hidden and blocked. | مخفي وممنوع. |
| Inventory management | Hidden and blocked except stock validation performed by the system. | مخفي وممنوع باستثناء تحقق النظام من الكمية المتاحة. |
| System Settings | Hidden and blocked. | مخفي وممنوع. |
| POS Accounting Review | Hidden and blocked. | مخفي وممنوع. |
| POS Reports for all users | Hidden and blocked. | مخفي وممنوع. |

## 4. Accountant Role | دور المحاسب

The accountant is responsible for reviewing completed POS sales and posting the accounting impact. The accountant should not normally perform cashier sales operations unless the user is explicitly assigned both roles.

المحاسب مسؤول عن مراجعة مبيعات نقاط البيع المكتملة وترحيل الأثر المحاسبي. لا يجب أن يقوم المحاسب عادة بعمليات البيع من شاشة الكاشير إلا إذا تم منحه دور الكاشير أيضًا بشكل صريح.

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RL-031 | The system shall allow the accountant to access the accounting dashboard and standard accounting modules according to accounting permissions. | يجب أن يسمح النظام للمحاسب بالدخول إلى لوحة التحكم المحاسبية والوحدات المحاسبية القياسية حسب صلاحيات المحاسبة. |
| REQ-POS-RL-032 | The system shall show the POS module to the accountant for review, reporting, and posting purposes. | يجب أن يعرض النظام وحدة نقاط البيع للمحاسب لأغراض المراجعة والتقارير والترحيل. |
| REQ-POS-RL-033 | The system shall allow the accountant to view completed POS sales pending accounting review. | يجب أن يسمح النظام للمحاسب بعرض مبيعات نقاط البيع المكتملة بانتظار المراجعة المحاسبية. |
| REQ-POS-RL-034 | The system shall allow the accountant to view POS invoice details, items, quantities, discounts, taxes, payment methods, cashier, session, and warehouse impact. | يجب أن يسمح النظام للمحاسب بعرض تفاصيل فاتورة نقاط البيع والبنود والكميات والخصومات والضرائب وطرق الدفع والكاشير والوردية وأثر المستودع. |
| REQ-POS-RL-035 | The system shall allow the accountant to view POS inventory movements generated by completed POS sales. | يجب أن يسمح النظام للمحاسب بعرض حركات المخزون الناتجة عن مبيعات نقاط البيع المكتملة. |
| REQ-POS-RL-036 | The system shall allow the accountant to view POS session reports for all cashiers. | يجب أن يسمح النظام للمحاسب بعرض تقارير ورديات نقاط البيع لجميع الكاشيرين. |
| REQ-POS-RL-037 | The system shall allow the accountant to approve POS sales for accounting posting. | يجب أن يسمح النظام للمحاسب باعتماد مبيعات نقاط البيع للترحيل المحاسبي. |
| REQ-POS-RL-038 | The system shall allow the accountant to reject POS sales from accounting review with a required rejection reason. | يجب أن يسمح النظام للمحاسب برفض مبيعات نقاط البيع من المراجعة المحاسبية مع إلزام إدخال سبب الرفض. |
| REQ-POS-RL-039 | The system shall allow the accountant to post POS sales by invoice. | يجب أن يسمح النظام للمحاسب بترحيل مبيعات نقاط البيع حسب الفاتورة. |
| REQ-POS-RL-040 | The system shall allow the accountant to post POS sales by session. | يجب أن يسمح النظام للمحاسب بترحيل مبيعات نقاط البيع حسب الوردية. |
| REQ-POS-RL-041 | The system shall allow the accountant to view the journal entries generated from POS posting. | يجب أن يسمح النظام للمحاسب بعرض قيود اليومية الناتجة عن ترحيل نقاط البيع. |
| REQ-POS-RL-042 | The system shall allow the accountant to export POS review and session reports to PDF or Excel if export permission is granted. | يجب أن يسمح النظام للمحاسب بتصدير تقارير مراجعة وورديات نقاط البيع إلى PDF أو Excel إذا كانت لديه صلاحية التصدير. |

### Accountant visible screens | الشاشات الظاهرة للمحاسب

| Screen / Route | English Visibility Rule | قاعدة الإظهار بالعربية |
| --- | --- | --- |
| `/dashboard` | Visible as the default accounting landing page. | ظاهرة كصفحة افتراضية للمحاسبة. |
| `/sales-receivables` | Visible according to accounting permissions. | ظاهرة حسب صلاحيات المحاسبة. |
| `/pos/accounting-review` | Visible for reviewing pending POS sales. | ظاهرة لمراجعة مبيعات نقاط البيع المعلقة محاسبيًا. |
| `/pos/sessions` | Visible for reviewing all POS sessions. | ظاهرة لمراجعة جميع ورديات نقاط البيع. |
| `/pos/completed-sales` | Visible for reviewing completed POS invoices. | ظاهرة لمراجعة فواتير نقاط البيع المكتملة. |
| `/pos/reports` | Visible for POS reports. | ظاهرة لتقارير نقاط البيع. |
| `/journal-entries` | Visible according to accounting permissions. | ظاهرة حسب صلاحيات المحاسبة. |
| `/general-ledger` | Visible according to accounting permissions. | ظاهرة حسب صلاحيات المحاسبة. |
| `/inventory/movements` | Visible for reviewing inventory movements, not for cashier selling. | ظاهرة لمراجعة حركات المخزون وليس للبيع التشغيلي. |

### Accountant restricted screens | الشاشات المقيدة على المحاسب

| Module / Screen | English Rule | القاعدة بالعربية |
| --- | --- | --- |
| `/pos/register` | Hidden by default unless the accountant is also assigned the Cashier role. | مخفية افتراضيًا إلا إذا كان المحاسب لديه دور الكاشير أيضًا. |
| POS sale modification after completion | Blocked; completed sales cannot be edited directly. | ممنوع؛ لا يجوز تعديل البيع المكتمل مباشرة. |
| POS session opening as cashier | Blocked unless Cashier role is assigned. | ممنوع إلا إذا تم منح دور الكاشير. |
| Deleting completed POS sales | Blocked; correction shall be through rejection, reversal, return, or adjustment. | ممنوع؛ التصحيح يجب أن يتم من خلال الرفض أو العكس أو المرتجع أو التسوية. |

## 5. Menu & Route Visibility | إظهار القوائم والمسارات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RL-043 | The system shall build the sidebar and top navigation dynamically based on the logged-in user's permissions. | يجب أن يبني النظام القائمة الجانبية والعلوية ديناميكيًا بناءً على صلاحيات المستخدم المسجل دخوله. |
| REQ-POS-RL-044 | The system shall hide all accounting, purchases, inventory management, reports, and settings menu items from users with only the Cashier role. | يجب أن يخفي النظام جميع عناصر المحاسبة والمشتريات وإدارة المخزون والتقارير والإعدادات عن المستخدمين الذين لديهم دور الكاشير فقط. |
| REQ-POS-RL-045 | The system shall show the POS module differently depending on the user role: operational POS screens for cashiers and review/posting screens for accountants. | يجب أن يعرض النظام وحدة نقاط البيع بشكل مختلف حسب دور المستخدم: شاشات تشغيلية للكاشير وشاشات مراجعة وترحيل للمحاسب. |

## 6. Recommended Permission Codes | أكواد الصلاحيات المقترحة

### Cashier permissions | صلاحيات الكاشير

```text
POS_OPEN_SESSION
POS_CLOSE_OWN_SESSION
POS_VIEW_POS_SCREEN
POS_SCAN_BARCODE
POS_SEARCH_ITEM
POS_ADD_ITEM_TO_CART
POS_UPDATE_ITEM_QUANTITY
POS_REMOVE_ITEM_FROM_CART
POS_HOLD_SALE
POS_RESUME_OWN_HELD_SALE
POS_VOID_DRAFT_SALE
POS_COMPLETE_SALE
POS_SELECT_PAYMENT_METHOD
POS_PRINT_RECEIPT
POS_VIEW_OWN_SESSION_REPORT
```

### Accountant permissions | صلاحيات المحاسب

```text
POS_VIEW_COMPLETED_SALES
POS_VIEW_PENDING_ACCOUNTING
POS_VIEW_POS_INVOICE_DETAILS
POS_VIEW_POS_PAYMENTS
POS_VIEW_POS_INVENTORY_MOVEMENTS
POS_VIEW_SESSIONS
POS_VIEW_SESSION_REPORT
POS_APPROVE_ACCOUNTING
POS_REJECT_ACCOUNTING
POS_POST_BY_INVOICE
POS_POST_BY_SESSION
POS_VIEW_POS_REPORTS
POS_EXPORT_POS_REPORTS
VIEW_JOURNAL_ENTRIES
VIEW_GENERAL_LEDGER
VIEW_INVENTORY_MOVEMENTS
```

## 7. Recommended Access Flow | تدفق الوصول المقترح

```text
User enters username and password
↓
System authenticates the user
↓
System loads assigned role and permissions
↓
If role = Cashier:
    redirect to /pos/register
    show POS operational screens only
↓
If role = Accountant:
    redirect to /dashboard
    show accounting system + POS review and reports
↓
Every page and API request validates permissions again on the backend
```

## 8. Cashier and Accountant Workflow | سير العمل بين الكاشير والمحاسب

```text
Cashier opens POS session
↓
Cashier sells from POS screen
↓
Cashier completes sale
↓
System records payment
↓
System decreases inventory for inventory-tracked items
↓
System prints POS receipt
↓
Sale becomes Pending Accounting Review
↓
Cashier closes own session
↓
Accountant reviews completed POS sales and session report
↓
Accountant approves and posts accounting entries
↓
System creates sales journal entry and COGS journal entry
↓
POS sale accounting status becomes Posted
```

## 9. Status Rules | قواعد الحالات

| Status Area | Cashier Impact | Accountant Impact | الأثر بالعربية |
| --- | --- | --- | --- |
| Draft sale | Cashier can edit, hold, or void. | Accountant does not review. | يمكن للكاشير تعديلها أو تعليقها أو إلغاؤها، ولا يراجعها المحاسب. |
| Held sale | Cashier can resume own held sale. | Accountant does not post. | يمكن للكاشير استكمال الفاتورة المعلقة الخاصة به، ولا يقوم المحاسب بترحيلها. |
| Completed sale | Cashier cannot edit. Inventory and payment are recorded. | Accountant can review. | لا يستطيع الكاشير تعديلها، ويتم تسجيل الدفع والمخزون، ويستطيع المحاسب مراجعتها. |
| Pending Accounting Review | No cashier action except viewing own receipt/session summary. | Accountant can approve, reject, or post. | لا يوجد إجراء للكاشير سوى عرض الإيصال أو ملخص الوردية، ويستطيع المحاسب الاعتماد أو الرفض أو الترحيل. |
| Posted | Cashier cannot edit. | Accountant can view journal entries. | لا يستطيع الكاشير تعديلها، ويستطيع المحاسب عرض القيود. |
| Rejected | Cashier cannot directly delete completed sale. | Accountant must provide rejection reason. | لا يستطيع الكاشير حذف البيع المكتمل مباشرة، ويجب على المحاسب إدخال سبب الرفض. |

## 10. Implementation Notes | ملاحظات تنفيذية

- The UI should hide unauthorized menu items, but backend authorization must remain the final protection layer.
- A cashier-only user should not see the accounting sidebar.
- A cashier-only user should land directly on the POS register page.
- An accountant user should see POS review and reporting screens, not the operational cashier screen by default.
- Completed POS sales should not be deleted; corrections should use rejection, reversal, return, or adjustment workflows.
- Every important POS action should be recorded in the audit trail with user, timestamp, action type, and source document.

