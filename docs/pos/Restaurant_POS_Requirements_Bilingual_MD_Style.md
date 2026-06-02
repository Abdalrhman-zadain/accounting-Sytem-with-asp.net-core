# Restaurant POS Requirements Addendum

## ملحق متطلبات نقطة البيع للمطاعم

## 1. Document Summary | ملخص المستند

### English

- Document type: Functional requirements addendum
- Target phase: Restaurant POS / later POS phase
- Scope: Dine-in, takeaway, delivery, pickup, kitchen workflow, table operations, cashier session closing, accountant review, and controlled corrections
- Total requirements in this addendum: 90

### العربية

- نوع المستند: ملحق متطلبات وظيفية
- المرحلة المستهدفة: نقطة بيع المطاعم / مرحلة لاحقة من POS
- النطاق: الطلبات الداخلية، السفري، التوصيل، الاستلام، سير عمل المطبخ، إدارة الطاولات، إغلاق وردية الكاشير، مراجعة المحاسب، والتصحيحات المضبوطة
- إجمالي المتطلبات في هذا الملحق: 90

## 2. Purpose and Positioning | الهدف ومكان هذا الملحق

This document extends the base POS requirements with restaurant-specific operations. It should be treated as a planning and design baseline for a separate Restaurant POS phase, not as proof that these features are already implemented.

هذا المستند يوسّع متطلبات POS الأساسية بإجراءات خاصة بالمطاعم. ويجب التعامل معه كمرجع تخطيطي وتصميمي لمرحلة مستقلة من Restaurant POS، وليس كدليل على أن هذه الميزات منفذة بالفعل.

## 3. Operating Principles | المبادئ التشغيلية

- Cashier session submission is operational only unless explicit auto-posting or accountant approval is enabled.
- Final accounting posting remains under accountant control.
- Completed orders must not be deleted directly.
- Sensitive corrections must be controlled by permissions, reasons, audit trail, and accountant approval when required.

- تسليم وردية الكاشير هو إجراء تشغيلي فقط ما لم يتم تفعيل الترحيل التلقائي أو اعتماد المحاسب بشكل صريح.
- الترحيل المحاسبي النهائي يبقى من صلاحية المحاسب.
- لا يجوز حذف الطلبات المكتملة مباشرة.
- يجب ضبط التصحيحات الحساسة من خلال الصلاحيات والأسباب وسجل التدقيق وموافقة المحاسب عند الحاجة.

## 4. Roles in Scope | الأدوار ضمن النطاق

- Waiter | النادل
- Cashier | الكاشير
- Kitchen User | مستخدم المطبخ
- Accountant | المحاسب

## 5. Table of Contents | المحتويات

1. Restaurant Operating Modes | أنماط تشغيل المطعم
2. Table Management | إدارة الطاولات
3. Waiter and Cashier Workflow | سير عمل النادل والكاشير
4. Kitchen Order Ticket / KOT | تذكرة طلب المطبخ
5. Kitchen Display System | شاشة المطبخ
6. Menu Items, Recipes, and Inventory | أصناف المنيو والوصفات والمخزون
7. Delivery Orders | طلبات التوصيل
8. Restaurant Payment and Billing | الدفع والفوترة في المطعم
9. Restaurant Permissions | صلاحيات المطعم
10. POS Session Closing and Sales Reports | إغلاق الوردية وتقارير المبيعات
11. Cashier Session Submission | تسليم أو ترحيل وردية الكاشير
12. Order Type Correction | تصحيح نوع الطلب
13. Correction Restrictions | قيود التصحيح
14. Accountant Review Screen | شاشة مراجعة المحاسب
15. Payment Breakdown in Closing Report | تفصيل طرق الدفع في تقرير الإغلاق
16. Allowed Correction Examples | أمثلة على التصحيحات المسموحة
17. Recommended Restaurant Flow | مسار العمل المقترح للمطعم
18. Cashier Session Closing and Submission Flow | تدفق إغلاق وتسليم وردية الكاشير
19. Suggested Permission Codes | أكواد الصلاحيات المقترحة
20. Suggested Session Closing Report Layout | شكل تقرير إغلاق الوردية المقترح
21. Accounting Treatment for Delivery Companies | المعالجة المحاسبية لشركات التوصيل
22. Recommended Control Split | الفصل الرقابي المقترح

## 6. Detailed Requirements | المتطلبات التفصيلية

## 6.1 Restaurant Operating Modes | أنماط تشغيل المطعم

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-001 | The system shall support restaurant order types: Dine-in, Takeaway, Delivery, and Pickup. | يجب أن يدعم النظام أنواع طلبات المطعم: داخل المطعم، سفري، توصيل، واستلام من الفرع. |
| REQ-POS-RST-002 | The system shall allow the cashier or waiter to select the order type before or during order creation. | يجب أن يسمح النظام للكاشير أو النادل باختيار نوع الطلب قبل أو أثناء إنشاء الطلب. |
| REQ-POS-RST-003 | The system shall apply different workflows depending on the order type, such as table selection for dine-in and customer address for delivery. | يجب أن يطبق النظام مسارات عمل مختلفة حسب نوع الطلب، مثل اختيار الطاولة للطلبات الداخلية وعنوان العميل للتوصيل. |
| REQ-POS-RST-004 | The system shall allow switching an order type before final payment if no restricted kitchen or delivery action prevents the change. | يجب أن يسمح النظام بتغيير نوع الطلب قبل الدفع النهائي إذا لم يكن هناك إجراء مطبخ أو توصيل يمنع هذا التغيير. |

## 6.2 Table Management | إدارة الطاولات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-005 | The system shall provide a restaurant floor/table screen showing table numbers, capacity, status, and assigned waiter. | يجب أن يوفر النظام شاشة لطاولات المطعم تعرض رقم الطاولة والسعة والحالة والنادل المسؤول. |
| REQ-POS-RST-006 | The system shall support table statuses such as Available, Occupied, Reserved, Waiting for Payment, and Cleaning. | يجب أن يدعم النظام حالات الطاولات مثل متاحة، مشغولة، محجوزة، بانتظار الدفع، وتحت التنظيف. |
| REQ-POS-RST-007 | The system shall allow opening an order linked to a selected table. | يجب أن يسمح النظام بفتح طلب مرتبط بطاولة محددة. |
| REQ-POS-RST-008 | The system shall prevent opening more than one active order on the same table unless split-table mode is enabled. | يجب أن يمنع النظام فتح أكثر من طلب نشط على نفس الطاولة إلا إذا كان وضع تقسيم الطاولة مفعّلًا. |
| REQ-POS-RST-009 | The system shall allow transferring an active order from one table to another authorized table. | يجب أن يسمح النظام بنقل طلب نشط من طاولة إلى طاولة أخرى مصرح بها. |
| REQ-POS-RST-010 | The system shall allow merging two or more tables into one bill when authorized. | يجب أن يسمح النظام بدمج طاولتين أو أكثر في فاتورة واحدة عند وجود صلاحية. |
| REQ-POS-RST-011 | The system shall allow splitting one table bill by item, guest, amount, or percentage. | يجب أن يسمح النظام بتقسيم فاتورة الطاولة حسب الصنف أو الضيف أو المبلغ أو النسبة. |

## 6.3 Waiter and Cashier Workflow | سير عمل النادل والكاشير

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-012 | The system shall allow a waiter to create and update dine-in orders according to assigned permissions. | يجب أن يسمح النظام للنادل بإنشاء وتعديل طلبات داخل المطعم حسب الصلاحيات الممنوحة. |
| REQ-POS-RST-013 | The system shall allow the cashier to create takeaway, pickup, and delivery orders. | يجب أن يسمح النظام للكاشير بإنشاء طلبات السفري والاستلام والتوصيل. |
| REQ-POS-RST-014 | The system shall record the waiter, cashier, table, order type, and session on each restaurant order. | يجب أن يسجل النظام النادل والكاشير والطاولة ونوع الطلب والوردية على كل طلب مطعم. |
| REQ-POS-RST-015 | The system shall allow authorized users to add order notes at item level and order level. | يجب أن يسمح النظام للمستخدمين المخولين بإضافة ملاحظات على مستوى الصنف ومستوى الطلب. |
| REQ-POS-RST-016 | The system shall support modifiers such as size, extras, add-ons, cooking level, and special instructions. | يجب أن يدعم النظام الإضافات والتعديلات مثل الحجم، والإضافات، ودرجة النضج، والتعليمات الخاصة. |

## 6.4 Kitchen Order Ticket / KOT | تذكرة طلب المطبخ

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-017 | The system shall generate a Kitchen Order Ticket when restaurant items are sent to the kitchen. | يجب أن ينشئ النظام تذكرة طلب مطبخ عند إرسال أصناف المطعم إلى المطبخ. |
| REQ-POS-RST-018 | The KOT shall include order number, table number, waiter, order type, items, quantities, modifiers, notes, and time sent. | يجب أن تحتوي تذكرة المطبخ على رقم الطلب ورقم الطاولة والنادل ونوع الطلب والأصناف والكميات والإضافات والملاحظات ووقت الإرسال. |
| REQ-POS-RST-019 | The system shall prevent direct modification of items already sent to the kitchen unless an authorized correction or cancellation is recorded. | يجب أن يمنع النظام تعديل الأصناف المرسلة إلى المطبخ مباشرة إلا من خلال تصحيح أو إلغاء مصرح ومسجل. |
| REQ-POS-RST-020 | The system shall allow adding new items to an existing open restaurant order and send only the new items to the kitchen. | يجب أن يسمح النظام بإضافة أصناف جديدة إلى طلب مطعم مفتوح وإرسال الأصناف الجديدة فقط إلى المطبخ. |
| REQ-POS-RST-021 | The system shall support KOT reprint only for authorized users and record the reprint action in the audit trail. | يجب أن يسمح النظام بإعادة طباعة تذكرة المطبخ فقط للمستخدمين المخولين وأن يسجل ذلك في سجل التدقيق. |

## 6.5 Kitchen Display System | شاشة المطبخ

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-022 | The system shall provide a kitchen display screen showing active orders grouped by preparation area. | يجب أن يوفر النظام شاشة مطبخ تعرض الطلبات النشطة مجمعة حسب منطقة التحضير. |
| REQ-POS-RST-023 | The system shall support preparation areas such as Kitchen, Grill, Bar, Desserts, and Drinks. | يجب أن يدعم النظام مناطق تحضير مثل المطبخ، والمشاوي، والبار، والحلويات، والمشروبات. |
| REQ-POS-RST-024 | The kitchen screen shall allow authorized kitchen users to mark items as New, Preparing, Ready, or Served. | يجب أن تسمح شاشة المطبخ للمستخدمين المخولين بتغيير حالة الأصناف إلى جديد، أو قيد التحضير، أو جاهز، أو تم التقديم. |
| REQ-POS-RST-025 | The system shall show order waiting time and highlight delayed orders based on configured preparation time. | يجب أن يعرض النظام وقت انتظار الطلب وأن يميز الطلبات المتأخرة حسب وقت التحضير المحدد. |
| REQ-POS-RST-026 | The system shall update the waiter or cashier when kitchen items become ready. | يجب أن يحدث النظام النادل أو الكاشير عند جاهزية أصناف المطبخ. |

## 6.6 Menu Items, Recipes, and Inventory | أصناف المنيو والوصفات والمخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-027 | The system shall support restaurant menu categories such as appetizers, main dishes, drinks, desserts, and combos. | يجب أن يدعم النظام تصنيفات منيو المطعم مثل المقبلات، والأطباق الرئيسية، والمشروبات، والحلويات، والوجبات المركبة. |
| REQ-POS-RST-028 | The system shall allow each menu item to be linked to a recipe or bill of materials when inventory tracking is required. | يجب أن يسمح النظام بربط كل صنف منيو بوصفة أو مكونات عند الحاجة لتتبع المخزون. |
| REQ-POS-RST-029 | The system shall deduct ingredients from inventory based on the recipe when the order is completed or when configured to deduct at kitchen confirmation. | يجب أن يخصم النظام المكونات من المخزون حسب الوصفة عند إتمام الطلب أو عند تأكيد المطبخ حسب الإعداد. |
| REQ-POS-RST-030 | The system shall support different units of measure between purchased ingredients and sold menu items. | يجب أن يدعم النظام اختلاف وحدات القياس بين المكونات المشتراة وأصناف المنيو المباعة. |
| REQ-POS-RST-031 | The system shall calculate estimated food cost per menu item based on ingredient cost. | يجب أن يحسب النظام تكلفة الطعام التقديرية لكل صنف منيو بناءً على تكلفة المكونات. |
| REQ-POS-RST-032 | The system shall allow marking menu items as temporarily unavailable. | يجب أن يسمح النظام بتحديد أصناف المنيو كغير متوفرة مؤقتًا. |

## 6.7 Delivery Orders | طلبات التوصيل

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-033 | The system shall support delivery customer information including name, phone number, address, area, and delivery notes. | يجب أن يدعم النظام معلومات عميل التوصيل مثل الاسم ورقم الهاتف والعنوان والمنطقة وملاحظات التوصيل. |
| REQ-POS-RST-034 | The system shall allow assigning a delivery order to a driver. | يجب أن يسمح النظام بتعيين طلب التوصيل إلى سائق. |
| REQ-POS-RST-035 | The system shall support delivery statuses such as Pending, Preparing, Ready for Delivery, Out for Delivery, Delivered, and Cancelled. | يجب أن يدعم النظام حالات التوصيل مثل قيد الانتظار، وقيد التحضير، وجاهز للتوصيل، وخرج للتوصيل، وتم التسليم، وملغى. |
| REQ-POS-RST-036 | The system shall allow adding a delivery fee and mapping it to a delivery income account. | يجب أن يسمح النظام بإضافة رسوم توصيل وربطها بحساب إيراد التوصيل. |

## 6.8 Restaurant Payment and Billing | الدفع والفوترة في المطعم

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-037 | The system shall allow payment only after the restaurant order has at least one valid item and is ready for billing. | يجب أن يسمح النظام بالدفع فقط بعد أن يحتوي طلب المطعم على صنف صحيح واحد على الأقل ويكون جاهزًا للفوترة. |
| REQ-POS-RST-038 | The system shall support partial payments and split payments for restaurant bills. | يجب أن يدعم النظام الدفع الجزئي والدفع المقسم لفواتير المطعم. |
| REQ-POS-RST-039 | The system shall allow printing a pre-bill before final payment. | يجب أن يسمح النظام بطباعة فاتورة أولية قبل الدفع النهائي. |
| REQ-POS-RST-040 | The final receipt shall include order type, table number where applicable, cashier, waiter, items, modifiers, tax, service charge, discount, total, payment method, and thank-you message. | يجب أن يحتوي الإيصال النهائي على نوع الطلب ورقم الطاولة عند التطبيق والكاشير والنادل والأصناف والإضافات والضريبة ورسوم الخدمة والخصم والإجمالي وطريقة الدفع ورسالة شكر. |
| REQ-POS-RST-041 | The system shall support optional service charge according to restaurant configuration. | يجب أن يدعم النظام رسوم خدمة اختيارية حسب إعدادات المطعم. |

## 6.9 Restaurant Permissions | صلاحيات المطعم

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-RST-042 | The system shall support restaurant permissions for table opening, table transfer, bill split, bill merge, KOT send, KOT cancel, kitchen status update, delivery assignment, and service charge override. | يجب أن يدعم النظام صلاحيات المطعم لفتح الطاولات ونقل الطاولة وتقسيم الفاتورة ودمج الفواتير وإرسال تذكرة المطبخ وإلغائها وتحديث حالة المطبخ وتعيين التوصيل وتجاوز رسوم الخدمة. |
| REQ-POS-RST-043 | The system shall allow defining restaurant roles such as Waiter, Cashier, Kitchen User, and Accountant. | يجب أن يسمح النظام بتعريف أدوار المطعم مثل النادل والكاشير ومستخدم المطبخ والمحاسب. |
| REQ-POS-RST-044 | Accountant approval shall be required for cancelling sent kitchen items, applying high discounts, deleting orders, or overriding service charges. | يجب أن تكون موافقة المحاسب مطلوبة لإلغاء أصناف مرسلة للمطبخ أو تطبيق خصومات عالية أو حذف الطلبات أو تجاوز رسوم الخدمة. |
| REQ-POS-RST-045 | All restaurant order actions shall be recorded in the audit trail with user, timestamp, action type, table/order reference, and reason where applicable. | يجب تسجيل جميع إجراءات طلبات المطعم في سجل التدقيق مع المستخدم والتاريخ ونوع الإجراء ومرجع الطاولة أو الطلب والسبب عند التطبيق. |

## 6.10 POS Session Closing and Sales Reports | إغلاق الوردية وتقارير المبيعات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-096 | The system shall require the cashier to count and enter the actual cash balance at the end of the POS session before closing the session. | يجب أن يطلب النظام من الكاشير عد وإدخال رصيد النقد الفعلي في نهاية الوردية قبل إغلاقها. |
| REQ-POS-097 | The system shall calculate the expected cash balance based on opening cash, cash sales, cash refunds, and cash withdrawals if applicable. | يجب أن يحسب النظام رصيد النقد المتوقع بناءً على رصيد الافتتاح والمبيعات النقدية والمرتجعات النقدية وأي سحوبات نقدية إن وجدت. |
| REQ-POS-098 | The system shall compare the actual cash entered by the cashier with the expected cash balance and calculate any cash shortage or overage. | يجب أن يقارن النظام بين النقد الفعلي الذي أدخله الكاشير والنقد المتوقع، وأن يحسب أي عجز أو زيادة في الصندوق. |
| REQ-POS-099 | The system shall require the cashier to enter a note or reason when there is a cash difference above the allowed tolerance. | يجب أن يطلب النظام من الكاشير إدخال ملاحظة أو سبب في حال وجود فرق نقدي أعلى من الحد المسموح. |
| REQ-POS-100 | The system shall allow printing a session closing report after the cashier closes the POS session. | يجب أن يسمح النظام بطباعة تقرير إغلاق الوردية بعد قيام الكاشير بإغلاق وردية نقاط البيع. |
| REQ-POS-101 | The session closing report shall show total sales separated by payment method, including cash sales, card/Visa sales, wallet sales, bank transfer sales, CliQ sales, and mixed payments. | يجب أن يعرض تقرير إغلاق الوردية إجمالي المبيعات مفصلة حسب طريقة الدفع، وتشمل المبيعات النقدية ومبيعات البطاقة أو الفيزا والمحافظ الإلكترونية والتحويل البنكي وكليك والمدفوعات المختلطة. |
| REQ-POS-102 | The session closing report shall show sales received through delivery companies such as Talabat, Careem, Jahez, or other configured delivery partners. | يجب أن يعرض تقرير إغلاق الوردية المبيعات المستلمة من خلال شركات التوصيل مثل طلبات وكريم وجاهز أو أي شركات توصيل معرفة في النظام. |
| REQ-POS-103 | The system shall allow defining delivery companies as separate payment or settlement channels for reporting and accounting purposes. | يجب أن يسمح النظام بتعريف شركات التوصيل كقنوات دفع أو تسوية منفصلة لأغراض التقارير والمحاسبة. |
| REQ-POS-104 | The report shall show gross sales, discounts, returns, refunds, service charges, delivery fees, tax amount, net sales, and total collected amount. | يجب أن يعرض التقرير إجمالي المبيعات والخصومات والمرتجعات والمبالغ المستردة ورسوم الخدمة ورسوم التوصيل والضريبة وصافي المبيعات وإجمالي المبالغ المحصلة. |
| REQ-POS-105 | The report shall show invoice count by order type, including dine-in, takeaway, delivery, pickup, and delivery-company orders where applicable. | يجب أن يعرض التقرير عدد الفواتير حسب نوع الطلب، مثل داخل المطعم وسفري وتوصيل واستلام وطلبات شركات التوصيل عند التطبيق. |
| REQ-POS-106 | The system shall allow the cashier to print a detailed sales report showing invoices, payment methods, cashier name, session number, opening time, closing time, and totals. | يجب أن يسمح النظام للكاشير بطباعة تقرير مبيعات تفصيلي يعرض الفواتير وطرق الدفع واسم الكاشير ورقم الوردية ووقت الفتح ووقت الإغلاق والإجماليات. |
| REQ-POS-107 | The system shall allow the accountant to print a summary report for all cashiers and all sessions within a selected date range. | يجب أن يسمح النظام للمحاسب بطباعة تقرير ملخص لجميع الكاشيرين وجميع الورديات ضمن فترة زمنية محددة. |
| REQ-POS-108 | The system shall prevent closing the session if the cashier has not entered the actual cash count, unless the user has accountant-authorized override permission. | يجب أن يمنع النظام إغلاق الوردية إذا لم يقم الكاشير بإدخال العد النقدي الفعلي، إلا إذا كان لدى المستخدم صلاحية تجاوز معتمدة من المحاسب. |
| REQ-POS-109 | The system shall record the session closing action, actual cash amount, cash difference, printed reports, and closing user in the audit trail. | يجب أن يسجل النظام عملية إغلاق الوردية ومبلغ النقد الفعلي وفرق الصندوق والتقارير المطبوعة والمستخدم الذي أغلق الوردية في سجل التدقيق. |

## 6.11 Cashier Session Submission | تسليم أو ترحيل وردية الكاشير

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-110 | The system shall allow the cashier to submit/post the full POS session at the end of the shift after entering the actual cash count. | يجب أن يسمح النظام للكاشير بترحيل أو تسليم الوردية كاملة في نهاية الدوام بعد إدخال العد النقدي الفعلي. |
| REQ-POS-111 | Cashier session posting shall be operational posting only and shall not create final accounting journal entries unless auto-posting is enabled or accountant approval is completed. | يجب أن يكون ترحيل الكاشير للوردية ترحيلاً تشغيليًا فقط، وألا ينشئ قيودًا محاسبية نهائية إلا إذا كان الترحيل التلقائي مفعلاً أو تم اعتماد المحاسب. |
| REQ-POS-112 | The system shall prevent cashier session posting if there are unresolved draft, held, unpaid, or incomplete orders within the session. | يجب أن يمنع النظام ترحيل وردية الكاشير إذا كانت هناك طلبات مسودة أو معلقة أو غير مدفوعة أو غير مكتملة داخل الوردية. |
| REQ-POS-113 | The system shall show a final session review screen before posting, including cash count, payment breakdown, sales by order type, refunds, discounts, delivery company sales, and cash difference. | يجب أن يعرض النظام شاشة مراجعة نهائية للوردية قبل الترحيل، تشمل العد النقدي وتفصيل طرق الدفع والمبيعات حسب نوع الطلب والمرتجعات والخصومات ومبيعات شركات التوصيل وفرق الصندوق. |
| REQ-POS-114 | After cashier session posting, the system shall lock the session from normal cashier editing. | بعد ترحيل الوردية من الكاشير، يجب أن يقفل النظام الوردية من التعديل العادي بواسطة الكاشير. |
| REQ-POS-115 | After session posting, the session status shall become Submitted or Pending Accounting Review. | بعد ترحيل الوردية، يجب أن تصبح حالة الوردية مسلمة أو بانتظار المراجعة المحاسبية. |
| REQ-POS-116 | The accountant shall be able to review the submitted session before final accounting posting. | يجب أن يستطيع المحاسب مراجعة الوردية المسلمة قبل الترحيل المحاسبي النهائي. |
| REQ-POS-117 | The system shall record the cashier session posting action in the audit trail with cashier name, session number, date/time, total sales, actual cash, and cash difference. | يجب أن يسجل النظام عملية ترحيل وردية الكاشير في سجل التدقيق مع اسم الكاشير ورقم الوردية والتاريخ والوقت وإجمالي المبيعات والنقد الفعلي وفرق الصندوق. |

## 6.12 Order Type Correction | تصحيح نوع الطلب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-118 | The system shall allow authorized users to correct the order type when an order was entered incorrectly, such as changing Dine-in to Takeaway, Delivery to Pickup, or Delivery Company to Direct Delivery. | يجب أن يسمح النظام للمستخدمين المخولين بتصحيح نوع الطلب إذا تم إدخاله بشكل خاطئ، مثل تغيير داخل المطعم إلى سفري أو توصيل إلى استلام أو شركة توصيل إلى توصيل مباشر. |
| REQ-POS-119 | The system shall allow order type correction before session posting if the order is completed but not yet submitted to accounting review. | يجب أن يسمح النظام بتصحيح نوع الطلب قبل ترحيل الوردية إذا كان الطلب مكتملاً ولم يتم تسليمه بعد للمراجعة المحاسبية. |
| REQ-POS-120 | The system shall require a correction reason when changing the order type of a completed order. | يجب أن يطلب النظام إدخال سبب التصحيح عند تغيير نوع طلب مكتمل. |
| REQ-POS-121 | The system shall prevent order type correction if the change affects payment settlement and the related payment method is already reconciled, unless accountant override is granted. | يجب أن يمنع النظام تصحيح نوع الطلب إذا كان التغيير يؤثر على التسوية المالية وكانت طريقة الدفع المرتبطة قد تمت تسويتها بالفعل، إلا إذا تم منح صلاحية تجاوز من المحاسب. |
| REQ-POS-122 | If the order type correction affects delivery company settlement, the system shall update the related delivery company receivable account or settlement channel. | إذا كان تصحيح نوع الطلب يؤثر على تسوية شركة التوصيل، يجب أن يحدث النظام حساب الذمم أو قناة التسوية المرتبطة بشركة التوصيل. |
| REQ-POS-123 | If the order type correction affects service charge, delivery fee, or table information, the system shall recalculate the affected values before saving the correction. | إذا كان تصحيح نوع الطلب يؤثر على رسوم الخدمة أو رسوم التوصيل أو معلومات الطاولة، يجب أن يعيد النظام احتساب القيم المتأثرة قبل حفظ التصحيح. |
| REQ-POS-124 | The system shall keep the original order type and corrected order type in the audit trail. | يجب أن يحتفظ النظام بنوع الطلب الأصلي ونوع الطلب بعد التصحيح في سجل التدقيق. |
| REQ-POS-125 | The system shall show corrected orders in the session closing report with a correction indicator. | يجب أن يعرض النظام الطلبات التي تم تصحيحها داخل تقرير إغلاق الوردية مع إشارة توضح أنها مصححة. |

## 6.13 Correction Restrictions | قيود التصحيح

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-126 | The cashier shall not be allowed to change order type after the session has been submitted unless the session is reopened by the accountant. | لا يجوز للكاشير تغيير نوع الطلب بعد تسليم الوردية إلا إذا تم إعادة فتح الوردية من المحاسب. |
| REQ-POS-127 | The system shall not allow order type correction to reduce or remove tax, service charge, or delivery fee without authorization. | يجب ألا يسمح النظام بتصحيح نوع الطلب بطريقة تؤدي إلى تخفيض أو إزالة الضريبة أو رسوم الخدمة أو رسوم التوصيل دون صلاحية. |
| REQ-POS-128 | The system shall prevent deleting completed orders; corrections shall be handled through controlled correction, reversal, refund, or adjustment workflows. | يجب أن يمنع النظام حذف الطلبات المكتملة، ويجب معالجة التصحيحات من خلال تصحيح مضبوط أو عكس أو مرتجع أو تسوية. |
| REQ-POS-129 | The system shall require accountant approval for correcting delivery company orders after payment completion. | يجب أن يطلب النظام موافقة المحاسب لتصحيح طلبات شركات التوصيل بعد إتمام الدفع. |

## 6.14 Accountant Review Screen | شاشة مراجعة المحاسب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-130 | The system shall provide an accountant review screen for submitted POS sessions and completed POS invoices pending accounting review. | يجب أن يوفر النظام شاشة مراجعة للمحاسب للورديات المسلّمة وفواتير نقاط البيع المكتملة بانتظار المراجعة المحاسبية. |
| REQ-POS-131 | The accountant review screen shall allow filtering by date, branch, cashier, session number, payment method, order type, and review status. | يجب أن تسمح شاشة مراجعة المحاسب بالتصفية حسب التاريخ والفرع والكاشير ورقم الوردية وطريقة الدفع ونوع الطلب وحالة المراجعة. |
| REQ-POS-132 | The screen shall show summary cards for total sales, net sales, cash sales, card sales, delivery company sales, tax, discounts, refunds, and cash difference. | يجب أن تعرض الشاشة بطاقات ملخص لإجمالي المبيعات وصافي المبيعات والمبيعات النقدية ومبيعات البطاقة ومبيعات شركات التوصيل والضريبة والخصومات والمرتجعات وفرق الصندوق. |
| REQ-POS-133 | The screen shall list submitted sessions with session number, cashier, branch, opening time, closing time, expected cash, actual cash, cash difference, total sales, invoice count, and status. | يجب أن تعرض الشاشة الورديات المسلّمة مع رقم الوردية والكاشير والفرع ووقت الفتح والإغلاق والنقد المتوقع والنقد الفعلي وفرق الصندوق وإجمالي المبيعات وعدد الفواتير والحالة. |
| REQ-POS-134 | The accountant shall be able to open a session review page showing overview, invoices, payments, order types, delivery companies, cash count, inventory impact, accounting entry preview, and audit trail. | يجب أن يستطيع المحاسب فتح صفحة مراجعة للوردية تعرض الملخص والفواتير وطرق الدفع وأنواع الطلبات وشركات التوصيل وعدّ النقد وأثر المخزون ومعاينة القيود المحاسبية وسجل التدقيق. |
| REQ-POS-135 | The payments tab shall separate collected cashier payments from receivables due from delivery companies. | يجب أن يفصل تبويب طرق الدفع بين المدفوعات المحصلة من الكاشير والذمم المستحقة من شركات التوصيل. |
| REQ-POS-136 | The cash count tab shall show opening cash, cash sales, cash refunds, expected cash, actual cash counted, cash difference, and cashier closing notes. | يجب أن يعرض تبويب عدّ النقد رصيد الافتتاح والمبيعات النقدية والمرتجعات النقدية والنقد المتوقع والنقد الفعلي المعدود وفرق الصندوق وملاحظات الكاشير عند الإغلاق. |
| REQ-POS-137 | The accountant shall be able to approve the session, reject the session, request correction, reopen the session with authorization, or post final accounting entries. | يجب أن يستطيع المحاسب اعتماد الوردية أو رفضها أو طلب تصحيح أو إعادة فتحها بصلاحية أو ترحيل القيود المحاسبية النهائية. |
| REQ-POS-138 | The system shall show accounting entry preview before final posting, including sales, VAT, payment accounts, delivery company receivables, COGS, and inventory entries. | يجب أن يعرض النظام معاينة القيود المحاسبية قبل الترحيل النهائي، وتشمل المبيعات والضريبة وحسابات الدفع وذمم شركات التوصيل وتكلفة المبيعات والمخزون. |
| REQ-POS-139 | The system shall prevent accounting posting if required account mappings are missing or if the session was already posted. | يجب أن يمنع النظام الترحيل المحاسبي إذا كانت الحسابات المطلوبة غير مربوطة أو إذا كانت الوردية مرحلة مسبقًا. |
| REQ-POS-140 | The accountant review screen shall allow printing and exporting the session review report to PDF or Excel according to permissions. | يجب أن تسمح شاشة مراجعة المحاسب بطباعة وتصدير تقرير مراجعة الوردية إلى PDF أو Excel حسب الصلاحيات. |

## 7. Supporting Tables and Reference Flows | الجداول المساندة ومسارات العمل المرجعية

## 7.1 Payment Breakdown in Closing Report | تفصيل طرق الدفع في تقرير الإغلاق

| Payment Type | Arabic Label | Show in Report? |
| --- | --- | --- |
| Cash | مبيعات نقدية | Yes / نعم |
| Visa / Card | مبيعات فيزا / بطاقة | Yes / نعم |
| CliQ | مبيعات كليك | Yes / نعم |
| Wallet | مبيعات محافظ إلكترونية | Yes / نعم |
| Bank Transfer | مبيعات تحويل بنكي | Yes / نعم |
| Talabat | مبيعات طلبات | Yes / نعم |
| Careem | مبيعات كريم | Yes / نعم |
| Jahez | مبيعات جاهز | Yes / نعم |
| Other Delivery Company | شركات توصيل أخرى | Yes / نعم |
| Mixed Payment | دفع مختلط | Yes / نعم |

## 7.2 Allowed Correction Examples | أمثلة على التصحيحات المسموحة

| Original Order Type | Corrected Order Type | Notes / ملاحظات |
| --- | --- | --- |
| Dine-in | Takeaway | If the order was entered on a table by mistake. | إذا تم إدخال الطلب على طاولة بالغلط. |
| Takeaway | Dine-in | If the customer sits at a table after order creation. | إذا كان العميل قد جلس على طاولة بعد تسجيل الطلب. |
| Delivery | Pickup | If the customer decides to collect from the branch. | إذا قرر العميل الاستلام من الفرع. |
| Pickup | Delivery | If the order is converted to direct delivery. | إذا تم تحويل الطلب إلى توصيل مباشر. |
| Talabat | Direct Delivery | If the order was wrongly recorded as Talabat. | إذا تم تسجيل الطلب على طلبات بالخطأ. |
| Direct Delivery | Talabat | If the order originally came from Talabat. | إذا كان الطلب أصلًا من طلبات وتم إدخاله كتوصيل مباشر. |
| Careem | Talabat | If the wrong delivery company was selected. | إذا تم اختيار شركة توصيل خاطئة. |

## 7.3 Recommended Restaurant Flow | مسار العمل المقترح للمطعم

```text
User logs in
↓
System loads restaurant role and permissions
↓
User selects order type: Dine-in / Takeaway / Delivery / Pickup
↓
If Dine-in: select table and open table order
↓
Add menu items, modifiers, and notes
↓
Send items to kitchen
↓
Kitchen receives KOT and updates status: New -> Preparing -> Ready -> Served
↓
Print pre-bill if requested
↓
Apply discount, service charge, and tax
↓
Customer pays using cash, card, CliQ, wallet, delivery company, or mixed payment
↓
System completes POS restaurant sale
↓
System updates inventory based on recipe/ingredients
↓
System prints final receipt
↓
Sale becomes Pending Accounting Review
↓
Accountant reviews and posts accounting entries
```

## 7.4 Cashier Session Closing and Submission Flow | تدفق إغلاق وتسليم وردية الكاشير

```text
Cashier opens session
↓
Cashier creates orders
↓
Cashier completes payments
↓
Cashier reviews session closing screen
↓
Cashier corrects wrong order types if needed
↓
Cashier enters actual cash count
↓
System calculates cash difference
↓
Cashier prints closing report
↓
Cashier submits/posts full session operationally
↓
Session status becomes Pending Accounting Review
↓
Accountant reviews session
↓
Accountant approves and posts final accounting entries
```

## 7.5 Suggested Permission Codes | أكواد الصلاحيات المقترحة

- `RST_VIEW_TABLE_SCREEN`
- `RST_OPEN_TABLE_ORDER`
- `RST_TRANSFER_TABLE`
- `RST_MERGE_TABLES`
- `RST_SPLIT_BILL`
- `RST_CREATE_TAKEAWAY_ORDER`
- `RST_CREATE_DELIVERY_ORDER`
- `RST_ASSIGN_DRIVER`
- `RST_SEND_KOT`
- `RST_CANCEL_KOT_ITEM`
- `RST_REPRINT_KOT`
- `RST_VIEW_KITCHEN_SCREEN`
- `RST_UPDATE_KITCHEN_STATUS`
- `RST_MARK_ITEM_UNAVAILABLE`
- `RST_APPLY_SERVICE_CHARGE`
- `RST_OVERRIDE_SERVICE_CHARGE`
- `RST_PRINT_PRE_BILL`
- `RST_COMPLETE_RESTAURANT_PAYMENT`
- `RST_CANCEL_RESTAURANT_ORDER`
- `RST_VIEW_RESTAURANT_REPORTS`
- `POS_ENTER_ACTUAL_CASH_COUNT`
- `POS_PRINT_SESSION_CLOSING_REPORT`
- `POS_SUBMIT_SESSION`
- `POS_CORRECT_ORDER_TYPE`
- `POS_APPROVE_ORDER_TYPE_CORRECTION`
- `POS_REOPEN_SUBMITTED_SESSION`

## 7.6 Suggested Session Closing Report Layout | شكل تقرير إغلاق الوردية المقترح

```text
POS Session Closing Report
Session No: SESSION-20260531-001
Cashier: Ahmad
Branch: Amman Branch
Opened At: 09:00 AM
Closed At: 11:30 PM
Opening Cash: 100.000 JOD
Expected Cash: 735.000 JOD
Actual Cash Counted: 730.000 JOD
Cash Difference: -5.000 JOD

Sales Summary:
Cash Sales: 635.000 JOD
Visa/Card Sales: 420.000 JOD
CliQ Sales: 85.000 JOD
Wallet Sales: 30.000 JOD
Talabat Sales: 260.000 JOD
Careem Sales: 110.000 JOD
Other Delivery Companies: 75.000 JOD
Gross Sales: 1,700.000 JOD
Discounts: 45.000 JOD
Returns: 20.000 JOD
Tax: 210.000 JOD
Net Sales: 1,635.000 JOD
Invoice Count: 145
Dine-in Orders: 65
Takeaway Orders: 32
Delivery Orders: 18
Delivery Company Orders: 30
```

## 7.7 Accounting Treatment for Delivery Companies | المعالجة المحاسبية لشركات التوصيل

When a sale is made through Talabat | عند البيع عن طريق طلبات

```text
Dr. Talabat Receivable
Cr. Sales Revenue
Cr. Output VAT
```

When Talabat transfers money to bank | عند تحويل طلبات المبلغ إلى البنك

```text
Dr. Bank
Dr. Delivery Company Commission Expense
Cr. Talabat Receivable
```

## 7.8 Recommended Control Split | الفصل الرقابي المقترح

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| CTRL-001 | Cashier closes the session, counts cash, prints reports, and submits the session operationally. | الكاشير يغلق الوردية ويعد النقد ويطبع التقارير ويسلم أو يرحل الوردية تشغيليًا. |
| CTRL-002 | Accountant approves sensitive differences, corrections, reopened sessions, high discounts, and delivery-company corrections when needed. | المحاسب يعتمد الفروقات الحساسة والتصحيحات وإعادة فتح الورديات والخصومات العالية وتصحيحات شركات التوصيل عند الحاجة. |
| CTRL-003 | Accountant reviews submitted sessions and performs final accounting posting to the general ledger. | المحاسب يراجع الورديات المسلمة وينفذ الترحيل المحاسبي النهائي إلى دفتر الأستاذ. |

## POS Session-Level Sales Posting Without COGS Entry

## ترحيل مبيعات نقاط البيع على مستوى الوردية بدون قيد تكلفة البضاعة

| Req ID      | English Requirement                                                                                                                                   | الترجمة العربية                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| REQ-POS-151 | The system shall support session-level grouped accounting posting for POS sales instead of creating a separate journal entry for each POS invoice.    | يجب أن يدعم النظام الترحيل المحاسبي المجمع لمبيعات نقاط البيع على مستوى الوردية بدل إنشاء قيد مستقل لكل فاتورة POS.               |
| REQ-POS-152 | When posting a POS session, the system shall aggregate all completed POS invoices in the session by payment method, revenue account, and tax account. | عند ترحيل وردية نقاط البيع، يجب أن يجمع النظام جميع فواتير POS المكتملة داخل الوردية حسب طريقة الدفع وحساب الإيراد وحساب الضريبة. |
| REQ-POS-153 | The system shall create one grouped sales journal entry for the POS session debiting payment accounts and crediting sales revenue and output VAT.     | يجب أن ينشئ النظام قيد مبيعات مجمع واحد للوردية يجعل حسابات الدفع مدينة ويجعل إيرادات المبيعات وضريبة المخرجات دائنة.             |
| REQ-POS-154 | The system shall not create Cost of Goods Sold and Inventory journal entries from POS session posting when COGS posting is disabled.                  | يجب ألا ينشئ النظام قيود تكلفة البضاعة المباعة والمخزون من ترحيل وردية POS عندما يكون ترحيل التكلفة معطلًا.                       |
| REQ-POS-155 | The system shall keep item cost and inventory movement details for operational reporting even when COGS journal posting is disabled.                  | يجب أن يحتفظ النظام بتفاصيل تكلفة الأصناف وحركات المخزون لأغراض التقارير التشغيلية حتى لو كان ترحيل قيد التكلفة معطلًا.           |
| REQ-POS-156 | The POS session journal entry shall reference the POS session as the main source document and shall allow drill-down to all included POS invoices.    | يجب أن يشير قيد الوردية إلى وردية POS كمستند مصدر رئيسي وأن يسمح بالوصول إلى جميع الفواتير المشمولة.                              |
| REQ-POS-157 | The system shall prevent posting the same POS session more than once.                                                                                 | يجب أن يمنع النظام ترحيل نفس وردية POS أكثر من مرة.                                                                               |
| REQ-POS-158 | The system shall provide a setting named POS_COGS_POSTING_ENABLED to control whether COGS and Inventory entries are created from POS posting.         | يجب أن يوفر النظام إعدادًا باسم POS_COGS_POSTING_ENABLED للتحكم فيما إذا كان سيتم إنشاء قيود تكلفة البضاعة والمخزون من ترحيل POS. |
| REQ-POS-159 | If POS_COGS_POSTING_ENABLED is false, the accounting preview shall show only the grouped sales and payment entry.                                     | إذا كان إعداد POS_COGS_POSTING_ENABLED غير مفعّل، يجب أن تعرض معاينة القيد المحاسبي فقط قيد المبيعات والمدفوعات المجمع.           |
| REQ-POS-160 | The system may allow COGS to be posted later through a separate daily, monthly, or inventory adjustment process.                                      | يمكن أن يسمح النظام بترحيل تكلفة البضاعة لاحقًا من خلال عملية منفصلة يومية أو شهرية أو من خلال تسوية مخزون.                       |

| Req ID      | English Requirement                                                                                                                                                       | الترجمة العربية                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-POS-161 | The system shall allow authorized users to correct the payment method of a completed POS invoice before final accounting posting.                                         | يجب أن يسمح النظام للمستخدمين المخولين بتصحيح طريقة الدفع لفاتورة POS مكتملة قبل الترحيل المحاسبي النهائي.                                            |
| REQ-POS-162 | Payment method correction shall require a correction reason and shall be recorded in the audit trail.                                                                     | يجب أن يتطلب تصحيح طريقة الدفع إدخال سبب التصحيح وأن يتم تسجيله في سجل التدقيق.                                                                       |
| REQ-POS-163 | When the payment method is corrected, the system shall update session payment totals, expected cash, card totals, delivery company totals, and accounting entry preview.  | عند تصحيح طريقة الدفع، يجب أن يحدث النظام إجماليات طرق الدفع في الوردية والنقد المتوقع ومبيعات البطاقات ومبيعات شركات التوصيل ومعاينة القيد المحاسبي. |
| REQ-POS-164 | The system shall prevent direct payment method correction after the POS session has been finally posted unless a reversal or adjustment workflow is used.                 | يجب أن يمنع النظام التصحيح المباشر لطريقة الدفع بعد ترحيل الوردية نهائيًا إلا من خلال مسار عكس أو تسوية.                                              |
| REQ-POS-165 | If the corrected payment method requires a reference number, such as card, CliQ, wallet, or delivery company order, the system shall require the related reference field. | إذا كانت طريقة الدفع المصححة تتطلب رقم مرجع مثل البطاقة أو كليك أو المحفظة أو طلب شركة التوصيل، يجب أن يطلب النظام حقل المرجع المناسب.                |


| Req ID      | English Requirement                                                                                                                                                                                                                   | الترجمة العربية                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-POS-166 | The system shall support printing the POS session closing report using thermal receipt roll format.                                                                                                                                   | يجب أن يدعم النظام طباعة تقرير إغلاق وردية POS بصيغة رول كاشير حراري.                                                                                                                                               |
| REQ-POS-167 | The roll report shall be optimized for 80mm receipt printers.                                                                                                                                                                         | يجب أن يكون تقرير الرول مناسبًا لطابعات الإيصالات الحرارية بعرض 80mm.                                                                                                                                               |
| REQ-POS-168 | The roll report shall include session number, cashier, branch, warehouse, opening time, closing time, invoice count, sales totals, payment breakdown, tax, discounts, expected cash, actual cash, cash difference, and review status. | يجب أن يحتوي تقرير الرول على رقم الوردية والكاشير والفرع والمستودع ووقت الفتح والإغلاق وعدد الفواتير وإجماليات المبيعات وتفصيل طرق الدفع والضريبة والخصومات والنقد المتوقع والنقد الفعلي وفرق الكاش وحالة المراجعة. |
| REQ-POS-169 | The roll report shall include signature lines for cashier and accountant when enabled.                                                                                                                                                | يجب أن يحتوي تقرير الرول على خانات توقيع للكاشير والمحاسب عند تفعيلها.                                                                                                                                              |
| REQ-POS-170 | The system shall record roll report printing in the audit trail with session ID, print type, printed by, and printed at.                                                                                                              | يجب أن يسجل النظام طباعة تقرير الرول في سجل التدقيق مع رقم الوردية ونوع الطباعة والمستخدم ووقت الطباعة.                                                                                                             |
