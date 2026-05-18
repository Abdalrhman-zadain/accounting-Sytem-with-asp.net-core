# POS Module Requirements

## متطلبات وحدة نقطة البيع

### English

- Document Type: Functional Requirements
- Scope: POS Module integrated with Accounting and Inventory
- Design: POS creates operational completed sales; accounting posting is reviewed by accountant
- Total Requirements: 95
### العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة نقطة البيع المرتبطة بالمحاسبة والمخزون
- التصميم: POS يتمم البيع تشغيليًا، بينما يعتمد المحاسب الترحيل المحاسبي لاحقًا
- إجمالي المتطلبات: 95
> This document follows the bilingual Markdown-style structure: English requirement and Arabic translation in the same table row.

## Implementation Tracking | تتبع التنفيذ

Current engineering snapshot for this repository:

- `IMPLEMENTED`: requirement is covered by the current codebase
- `PARTIAL`: requirement exists, but not yet at the exact depth/control/model described here
- `DEFERRED`: intentionally not implemented yet and planned for later work

Outstanding requirements that are not fully implemented yet:

| Req ID | Status | Gap Summary | ملخص الفجوة |
| --- | --- | --- | --- |
| REQ-POS-008 | PARTIAL | The system blocks more than one open session per cashier, but not with a dedicated same-register-or-same-branch rule model. | النظام يمنع أكثر من جلسة مفتوحة للكاشير، لكن ليس من خلال نموذج صريح لقاعدة نفس الصندوق أو نفس الفرع. |
| REQ-POS-017 | PARTIAL | Most item data is loaded into the POS flow, but not every listed field is persisted/surfaced exactly as a POS line snapshot. | يتم تحميل معظم بيانات الصنف في مسار POS، لكن ليست كل الحقول المذكورة محفوظة أو ظاهرة بدقة كسnapshot لبند البيع. |
| REQ-POS-019 | PARTIAL | Commercial line values are stored, but sale-side cost snapshot coverage is not fully explicit at the sales-line level. | يتم حفظ القيم التجارية للبند، لكن تغطية لقطة التكلفة على مستوى بند البيع ليست صريحة بالكامل. |
| REQ-POS-022 | PARTIAL | Invoice-level discount policy is applied operationally, but the invoice discount is not modeled as a first-class persisted field in the exact form described here. | يتم تطبيق سياسة خصم الفاتورة تشغيليًا، لكن خصم الفاتورة ليس ممثلًا كحقل محفوظ مستقل بالشكل المذكور هنا. |
| REQ-POS-024 | PARTIAL | Tax, discount, and amount values are stored, but explicit tax-rate/net/gross snapshot coverage is not fully modeled exactly as stated. | يتم حفظ الضريبة والخصومات والمبالغ، لكن حفظ نسبة الضريبة وصافي/إجمالي المبلغ بشكل صريح ليس ممثلًا بالكامل كما هو مذكور. |
| REQ-POS-048 | PARTIAL | Accountant review exists, but the review experience does not yet expose every listed detail with the full richness described here. | توجد مراجعة محاسبية، لكن تجربة المراجعة لا تعرض بعد كل التفاصيل المذكورة بنفس مستوى العمق المطلوب هنا. |
| REQ-POS-063 | PARTIAL | Receipt output is richer now, but company and tax identity are still configuration-driven rather than linked to a dedicated branch/company master model. | مخرجات الإيصال أصبحت أغنى، لكن هوية الشركة والرقم الضريبي ما زالا معتمدين على الإعدادات وليس على نموذج master مخصص للشركة/الفرع. |
| REQ-POS-068 | PARTIAL | Major account validation exists, but not every mapping category listed here is enforced as explicitly as written. | يوجد تحقق رئيسي للحسابات، لكن ليست كل فئات الربط المذكورة هنا مفروضة بشكل صريح كما هو مكتوب. |
| REQ-POS-070 | PARTIAL | Posting blocks missing required accounts, but the fallback/default-account behavior is not yet as complete and systematic as described here. | الترحيل يمنع غياب الحسابات المطلوبة، لكن سلوك الحسابات الافتراضية/البديلة ليس كاملًا ومنهجيًا بعد كما هو موصوف هنا. |
| REQ-POS-075 | PARTIAL | POS permissions exist, but the system still relies mainly on role/env-based checks instead of a fully fine-grained permission administration model. | صلاحيات POS موجودة، لكن النظام لا يزال يعتمد أساسًا على الأدوار وإعدادات البيئة بدل نموذج إدارة صلاحيات دقيق بالكامل. |
| REQ-POS-076 | PARTIAL | High discount control currently depends on privileged access, not a dedicated manager approval workflow record. | التحكم في الخصومات العالية يعتمد حاليًا على الصلاحية المرتفعة، وليس على مسار اعتماد مستقل من المدير. |
| REQ-POS-078 | PARTIAL | Session closing rights are configurable by role/environment, but not yet through a richer dedicated permission administration model. | صلاحيات إغلاق الجلسة قابلة للتهيئة بحسب الدور/الإعدادات، لكن ليس بعد عبر نموذج إدارة صلاحيات مخصص وأكثر تفصيلًا. |
| REQ-POS-079 | PARTIAL | Audit coverage is broad, but not every event is modeled as a distinct purpose-built audit event exactly as described here. | تغطية التدقيق واسعة، لكن ليست كل الأحداث ممثلة كأحداث تدقيق مستقلة ومخصصة تمامًا كما هو موصوف هنا. |
| REQ-POS-080 | PARTIAL | Important metadata fields exist in many places, but they are not yet represented uniformly across all relevant POS records exactly as stated. | حقول البيانات المهمة موجودة في عدة مواضع، لكنها ليست ممثلة بشكل موحد بعد عبر جميع سجلات POS ذات العلاقة كما هو مذكور هنا. |

Deferred for later work and intentionally outside the first POS version:

| Req ID | Status | Gap Summary | ملخص الفجوة |
| --- | --- | --- | --- |
| REQ-POS-094 | DEFERRED | The current first POS version still excludes offline mode, restaurant tables, kitchen screens, loyalty points, coupons, gift cards, complex promotions, advanced returns, and multi-currency POS. | النسخة الحالية الأولى من POS ما زالت تستبعد وضع عدم الاتصال، طاولات المطاعم، شاشات المطبخ، نقاط الولاء، الكوبونات، بطاقات الهدايا، العروض المعقدة، المرتجعات المتقدمة، وتعدد العملات. |

All other requirements are currently treated as implemented in the current codebase snapshot.

## 1. Core Design Decision | قرار التصميم الأساسي

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-001 | The system shall implement POS as a sales-invoice type, not as a fully separate sales engine. Each POS sale shall be saved as a Sales Invoice with invoiceType = POS. | يجب أن ينفذ النظام الـ POS كنوع من فواتير المبيعات وليس كمحرك بيع منفصل بالكامل. يجب حفظ كل عملية بيع POS كفاتورة مبيعات بنوع invoiceType = POS. |
| REQ-POS-002 | The system shall separate the operational sale status from the accounting status so the cashier can complete the sale while the accountant reviews posting later. | يجب أن يفصل النظام حالة البيع التشغيلية عن الحالة المحاسبية حتى يتمكن الكاشير من إتمام البيع بينما يراجع المحاسب الترحيل لاحقًا. |
| REQ-POS-003 | The system shall support operational statuses: DRAFT, HELD, COMPLETED, VOIDED, and REFUNDED. | يجب أن يدعم النظام حالات تشغيلية تشمل: مسودة، معلقة، مكتملة، ملغاة، ومستردة. |
| REQ-POS-004 | The system shall support accounting statuses: UNPOSTED, PENDING_REVIEW, POSTED, REJECTED, and REVERSED. | يجب أن يدعم النظام حالات محاسبية تشمل: غير مرحلة، بانتظار المراجعة، مرحلة، مرفوضة، ومعكوسة. |

## 2. POS Session / Cashier Shift | وردية الكاشير / جلسة نقطة البيع

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-005 | The system shall require the cashier to open a POS session before creating POS sales. | يجب أن يطلب النظام من الكاشير فتح وردية POS قبل إنشاء عمليات بيع. |
| REQ-POS-006 | The POS session shall store the session number, branch, warehouse, cashier, cash account, opening cash, expected cash, actual cash, difference, status, opened date/time, and closed date/time. | يجب أن تحفظ وردية POS رقم الوردية والفرع والمستودع والكاشير وحساب الصندوق ورصيد الافتتاح والكاش المتوقع والكاش الفعلي والفرق والحالة وتاريخ/وقت الفتح والإغلاق. |
| REQ-POS-007 | The system shall prevent selling without an open POS session. | يجب أن يمنع النظام البيع في حال عدم وجود وردية POS مفتوحة. |
| REQ-POS-008 | The system shall prevent one cashier from opening more than one active session on the same register or branch at the same time. | يجب أن يمنع النظام الكاشير من فتح أكثر من وردية نشطة على نفس الصندوق أو الفرع في نفس الوقت. |
| REQ-POS-009 | Each POS session shall be linked to a warehouse, and that warehouse shall be used as the default issue warehouse for inventory items sold from the POS screen. | يجب ربط كل وردية POS بمستودع، ويستخدم هذا المستودع كمستودع افتراضي لصرف المواد المخزنية المباعة من شاشة POS. |
| REQ-POS-010 | The system shall require opening cash when opening a POS session. | يجب أن يطلب النظام إدخال رصيد الصندوق الافتتاحي عند فتح وردية POS. |
| REQ-POS-011 | The system shall allow the cashier or authorized user to close the POS session at the end of the shift. | يجب أن يسمح النظام للكاشير أو المستخدم المخول بإغلاق وردية POS في نهاية الشفت. |
| REQ-POS-012 | The session closing screen shall show opening cash, cash sales, cash refunds, expected cash, actual cash, difference, card sales, CliQ sales, total sales, discounts, tax, and invoice count. | يجب أن تعرض شاشة إغلاق الوردية رصيد الافتتاح ومبيعات الكاش ومرتجعات الكاش والكاش المتوقع والكاش الفعلي والفرق ومبيعات البطاقة ومبيعات CliQ وإجمالي المبيعات والخصومات والضريبة وعدد الفواتير. |
| REQ-POS-013 | The system shall calculate Expected Cash = Opening Cash + Cash Sales - Cash Refunds, and Difference = Actual Cash - Expected Cash. | يجب أن يحسب النظام الكاش المتوقع = رصيد الافتتاح + مبيعات الكاش - مرتجعات الكاش، والفرق = الكاش الفعلي - الكاش المتوقع. |

## 3. POS Sales Screen | شاشة البيع في نقطة البيع

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-014 | The system shall provide a fast POS selling screen with barcode input, item search, cart, quantity controls, discounts, tax calculation, payment section, hold, void, complete sale, and receipt print actions. | يجب أن يوفر النظام شاشة POS سريعة تحتوي على إدخال باركود، بحث عن الأصناف، سلة بيع، التحكم بالكمية، الخصومات، احتساب الضريبة، قسم الدفع، تعليق، إلغاء، إتمام البيع، وطباعة الإيصال. |
| REQ-POS-015 | The system shall allow adding items by barcode scanning. If the item already exists in the cart, the quantity shall increase automatically. | يجب أن يسمح النظام بإضافة الأصناف من خلال قراءة الباركود. وإذا كان الصنف موجودًا في السلة، يجب زيادة الكمية تلقائيًا. |
| REQ-POS-016 | The system shall allow manual item search by item name, item code, barcode, and category. | يجب أن يسمح النظام بالبحث اليدوي عن الصنف باستخدام اسم الصنف أو كوده أو الباركود أو التصنيف. |
| REQ-POS-017 | When an item is selected, the system shall automatically load item ID, name, unit, price, tax rate, warehouse, available quantity, item type, average cost, and relevant accounts. | عند اختيار الصنف، يجب أن يجلب النظام تلقائيًا رقم الصنف والاسم والوحدة والسعر ونسبة الضريبة والمستودع والكمية المتاحة ونوع الصنف ومتوسط التكلفة والحسابات المرتبطة. |
| REQ-POS-018 | The system shall allow the cashier to add one or more items to the cart before completing the sale. | يجب أن يسمح النظام للكاشير بإضافة صنف واحد أو عدة أصناف إلى سلة البيع قبل إتمام العملية. |
| REQ-POS-019 | Each POS invoice line shall store item, warehouse, quantity, unit price, discount amount, tax amount, line total, unit cost, and total cost. | يجب أن يحفظ كل بند في فاتورة POS الصنف والمستودع والكمية وسعر الوحدة وقيمة الخصم وقيمة الضريبة وإجمالي البند وتكلفة الوحدة وإجمالي التكلفة. |
| REQ-POS-020 | The system shall allow changing quantity before sale completion and shall recalculate subtotal, discount, tax, line total, and invoice total. | يجب أن يسمح النظام بتعديل الكمية قبل إتمام البيع وأن يعيد احتساب الإجمالي قبل الخصم والخصم والضريبة وإجمالي البند وإجمالي الفاتورة. |

## 4. Discounts and Tax | الخصومات والضريبة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-021 | The system shall support line-level discounts as fixed amount or percentage. | يجب أن يدعم النظام الخصم على مستوى البند كمبلغ ثابت أو كنسبة مئوية. |
| REQ-POS-022 | The system shall support invoice-level discounts and shall apply them according to the configured tax policy before or after tax. | يجب أن يدعم النظام الخصم على مستوى الفاتورة وأن يطبقه حسب سياسة الضريبة المحددة، قبل الضريبة أو بعدها. |
| REQ-POS-023 | The system shall automatically calculate tax based on item tax setup or the selected tax code. | يجب أن يحتسب النظام الضريبة تلقائيًا حسب إعدادات ضريبة الصنف أو كود الضريبة المختار. |
| REQ-POS-024 | The system shall store tax rate, tax amount, net amount, gross amount, and discount values for reporting and accounting review. | يجب أن يحفظ النظام نسبة الضريبة وقيمة الضريبة وصافي المبلغ والإجمالي وقيم الخصم لأغراض التقارير والمراجعة المحاسبية. |

## 5. Draft, Hold, and Void | المسودة والتعليق والإلغاء

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-025 | While the cashier is adding items, the POS invoice shall remain in DRAFT status with accountingStatus = UNPOSTED. | أثناء إضافة الأصناف من الكاشير، يجب أن تبقى فاتورة POS بحالة مسودة مع الحالة المحاسبية غير مرحلة. |
| REQ-POS-026 | Draft POS invoices shall not affect inventory, accounting, or cash balances. | يجب ألا تؤثر فواتير POS المسودة على المخزون أو المحاسبة أو أرصدة الصندوق. |
| REQ-POS-027 | The system shall allow the cashier to hold a sale and resume it later during the same session. | يجب أن يسمح النظام للكاشير بتعليق عملية بيع والعودة إليها لاحقًا خلال نفس الوردية. |
| REQ-POS-028 | Held POS invoices shall not affect inventory, accounting, or cash balances until completed. | يجب ألا تؤثر فواتير POS المعلقة على المخزون أو المحاسبة أو أرصدة الصندوق إلى أن يتم إكمالها. |
| REQ-POS-029 | The system shall allow authorized users to void DRAFT or HELD sales without inventory or accounting impact. | يجب أن يسمح النظام للمستخدمين المخولين بإلغاء عمليات البيع المسودة أو المعلقة بدون أثر مخزني أو محاسبي. |

## 6. Stock Validation | التحقق من المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-030 | Before completing a sale, the system shall validate available quantity for each inventory item in the selected warehouse. | قبل إتمام البيع، يجب أن يتحقق النظام من الكمية المتاحة لكل مادة مخزنية في المستودع المحدد. |
| REQ-POS-031 | The system shall block sale completion if sold quantity exceeds available quantity, unless negative-stock permission is explicitly granted. | يجب أن يمنع النظام إتمام البيع إذا كانت الكمية المباعة أكبر من الكمية المتاحة، إلا إذا تم منح صلاحية البيع بالسالب صراحةً. |
| REQ-POS-032 | Negative stock shall be disabled by default in the first POS version. | يجب أن يكون البيع بالسالب معطلًا افتراضيًا في النسخة الأولى من POS. |
| REQ-POS-033 | Service items shall not create inventory movements or require stock validation. | يجب ألا تنشئ الخدمات حركات مخزون ولا تحتاج إلى تحقق من الرصيد. |
| REQ-POS-034 | Inventory items shall create inventory issue movements when the POS sale is completed. | يجب أن تنشئ المواد المخزنية حركات خروج مخزون عند إتمام بيع POS. |

## 7. Complete Sale Flow | مسار إتمام البيع

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-035 | On Complete Sale, the system shall validate open session, cart lines, stock availability, payment method, paid amount, required accounts, and warehouse per inventory line. | عند إتمام البيع، يجب أن يتحقق النظام من وجود وردية مفتوحة وبنود في السلة وتوفر المخزون وطريقة الدفع وكفاية المبلغ المدفوع والحسابات المطلوبة ووجود مستودع لكل بند مخزني. |
| REQ-POS-036 | After successful completion, the POS invoice shall become operationalStatus = COMPLETED and accountingStatus = PENDING_REVIEW. | بعد الإتمام بنجاح، يجب أن تصبح فاتورة POS بالحالة التشغيلية مكتملة وبالحالة المحاسبية بانتظار المراجعة. |
| REQ-POS-037 | On sale completion, the system shall immediately create inventory movements for inventory items and update item-warehouse balances. | عند إتمام البيع، يجب أن ينشئ النظام فورًا حركات مخزون للمواد المخزنية وأن يحدث أرصدة الأصناف حسب المستودع. |
| REQ-POS-038 | On sale completion, the system shall record the payment operationally and include it in the POS session report. | عند إتمام البيع، يجب أن يسجل النظام الدفع تشغيليًا وأن يظهره ضمن تقرير وردية POS. |
| REQ-POS-039 | On sale completion, the system shall not create final posted journal entries unless the Auto Post setting is enabled. | عند إتمام البيع، يجب ألا ينشئ النظام قيود يومية مرحلة نهائيًا إلا إذا كان إعداد الترحيل التلقائي مفعلًا. |
| REQ-POS-040 | The system may optionally create draft journal entries for accountant review without affecting the general ledger until approval. | يمكن للنظام اختياريًا إنشاء قيود مسودة لمراجعة المحاسب دون التأثير على دفتر الأستاذ إلى أن يتم اعتمادها. |

## 8. Payment Requirements | متطلبات الدفع

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-041 | The POS shall support Cash, Card, CliQ, Bank Transfer, Wallet, and Mixed Payment methods. | يجب أن يدعم POS طرق الدفع: نقدًا، بطاقة، CliQ، تحويل بنكي، محفظة، ودفع مختلط. |
| REQ-POS-042 | Each payment method shall be mapped to an accounting account, such as Cash on Hand, Card Clearing, Bank Account, or Wallet Clearing. | يجب ربط كل طريقة دفع بحساب محاسبي مثل الصندوق، حساب وسيط للبطاقات، حساب البنك، أو حساب وسيط للمحفظة. |
| REQ-POS-043 | The system shall support mixed payment, where one invoice can be paid using more than one payment method. | يجب أن يدعم النظام الدفع المختلط بحيث يمكن دفع فاتورة واحدة بأكثر من طريقة دفع. |
| REQ-POS-044 | For cash payment, the system shall support invoice total, tendered amount, and change amount. | في حالة الدفع النقدي، يجب أن يدعم النظام إجمالي الفاتورة والمبلغ المستلم من الزبون ومبلغ الباقي. |
| REQ-POS-045 | The accounting paid amount shall equal the invoice total, not the tendered amount. Change amount is operational cashier information. | يجب أن يساوي مبلغ الدفع المحاسبي إجمالي الفاتورة وليس المبلغ المستلم من الزبون؛ أما الباقي فهو معلومة تشغيلية للكاشير. |
| REQ-POS-046 | For card, CliQ, bank transfer, and wallet payments, the system shall allow reference number, authorization code, or bank reference. | في مدفوعات البطاقة وCliQ والتحويل البنكي والمحفظة، يجب أن يسمح النظام بإدخال رقم مرجع أو كود تفويض أو مرجع بنكي. |

## 9. Accounting Review | المراجعة المحاسبية

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-047 | The system shall provide a Pending Accounting Review screen listing all completed POS invoices with accountingStatus = PENDING_REVIEW. | يجب أن يوفر النظام شاشة مراجعة محاسبية تعرض كل فواتير POS المكتملة ذات الحالة المحاسبية بانتظار المراجعة. |
| REQ-POS-048 | The accountant shall be able to review invoice details, items, discounts, tax, payments, inventory movements, cost of goods sold, cashier, session, and warehouse. | يجب أن يستطيع المحاسب مراجعة تفاصيل الفاتورة والأصناف والخصومات والضريبة والمدفوعات وحركات المخزون وتكلفة المبيعات والكاشير والوردية والمستودع. |
| REQ-POS-049 | The accountant shall be able to approve and post one POS invoice or a group of POS invoices. | يجب أن يستطيع المحاسب اعتماد وترحيل فاتورة POS واحدة أو مجموعة فواتير POS. |
| REQ-POS-050 | When approved, the accounting status shall become POSTED and the system shall create final journal entries. | عند الاعتماد، يجب أن تصبح الحالة المحاسبية مرحلة وأن ينشئ النظام قيود اليومية النهائية. |
| REQ-POS-051 | The system shall create a sales journal entry debiting the payment account and crediting sales revenue and output VAT where applicable. | يجب أن ينشئ النظام قيد مبيعات يجعل حساب الدفع مدينًا ويجعل إيراد المبيعات وضريبة المخرجات دائنين عند التطبيق. |
| REQ-POS-052 | The system shall create a cost-of-goods-sold journal entry debiting COGS and crediting Inventory for inventory items. | يجب أن ينشئ النظام قيد تكلفة بضاعة مباعة يجعل تكلفة المبيعات مدينة والمخزون دائنًا للمواد المخزنية. |
| REQ-POS-053 | The system shall support posting per invoice or grouped posting by POS session. | يجب أن يدعم النظام الترحيل لكل فاتورة أو الترحيل المجمع حسب وردية POS. |
| REQ-POS-054 | For the first version, session-level grouped posting is recommended to keep the general ledger cleaner. | في النسخة الأولى، يوصى بالترحيل المجمع على مستوى الوردية للحفاظ على دفتر الأستاذ أكثر ترتيبًا. |
| REQ-POS-055 | If the accountant rejects a completed POS sale, the system shall not delete the transaction; it shall require reversal, correction, or adjustment. | إذا رفض المحاسب عملية POS مكتملة، يجب ألا يحذف النظام العملية؛ بل يجب أن يتطلب عكسًا أو تصحيحًا أو تسوية. |

## 10. Returns and Refunds | المرتجعات ورد المبالغ

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-056 | The system shall support POS returns for completed POS invoices. | يجب أن يدعم النظام مرتجعات POS للفواتير المكتملة. |
| REQ-POS-057 | POS returns shall be linked to the original invoice whenever possible. | يجب ربط مرتجعات POS بالفاتورة الأصلية قدر الإمكان. |
| REQ-POS-058 | When an inventory item is returned, the system shall create an inventory-in movement for the returned quantity. | عند إرجاع مادة مخزنية، يجب أن ينشئ النظام حركة دخول مخزون للكمية المرتجعة. |
| REQ-POS-059 | The system shall support refund methods such as cash refund, card refund, wallet refund, or store credit. | يجب أن يدعم النظام طرق رد المبلغ مثل رد نقدي أو رد على البطاقة أو المحفظة أو رصيد متجر. |
| REQ-POS-060 | When a return is approved accounting-wise, the system shall create the related sales return and inventory-cost reversal entries. | عند اعتماد المرتجع محاسبيًا، يجب أن ينشئ النظام قيود مردودات المبيعات وعكس تكلفة المخزون ذات العلاقة. |
| REQ-POS-061 | Returns and refunds shall require separate permissions. | يجب أن تتطلب المرتجعات ورد المبالغ صلاحيات منفصلة. |

## 11. Receipt Printing | طباعة الإيصالات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-062 | After completing a sale, the system shall allow printing a POS receipt. | بعد إتمام البيع، يجب أن يسمح النظام بطباعة إيصال POS. |
| REQ-POS-063 | The receipt shall include company name, branch, tax number if applicable, receipt number, date/time, cashier, items, quantity, unit price, discount, tax, total, payment method, change amount, and a thank-you message. | يجب أن يحتوي الإيصال على اسم الشركة والفرع والرقم الضريبي عند التطبيق ورقم الإيصال والتاريخ/الوقت والكاشير والأصناف والكمية وسعر الوحدة والخصم والضريبة والإجمالي وطريقة الدفع والباقي ورسالة شكر. |
| REQ-POS-064 | The system shall allow receipt reprint only for authorized users and shall record the reprint action in the audit trail. | يجب أن يسمح النظام بإعادة طباعة الإيصال فقط للمستخدمين المخولين وأن يسجل عملية إعادة الطباعة في سجل التدقيق. |
| REQ-POS-065 | Each receipt shall have a unique receipt number. | يجب أن يكون لكل إيصال رقم فريد. |

## 12. Numbering | الترقيم

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-066 | POS invoices shall have a unique number series or a clear POS prefix, such as POS-YYYYMMDD-0001. | يجب أن يكون لفواتير POS سلسلة أرقام فريدة أو بادئة واضحة مثل POS-YYYYMMDD-0001. |
| REQ-POS-067 | Each POS session shall have a unique session number, such as SESSION-YYYYMMDD-001. | يجب أن يكون لكل وردية POS رقم فريد مثل SESSION-YYYYMMDD-001. |

## 13. Account Mapping | ربط الحسابات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-068 | Before accounting posting, the system shall validate required account mappings: sales revenue, output VAT, inventory, COGS, cash, card clearing, bank, discount, sales return, and inventory adjustment accounts where applicable. | قبل الترحيل المحاسبي، يجب أن يتحقق النظام من الحسابات المطلوبة: إيراد المبيعات، ضريبة المخرجات، المخزون، تكلفة المبيعات، الصندوق، وسيط البطاقات، البنك، الخصم، مردودات المبيعات، وتسويات المخزون عند التطبيق. |
| REQ-POS-069 | The system shall use item-level accounts when defined, including sales account, inventory account, COGS account, and tax code. | يجب أن يستخدم النظام حسابات الصنف عند تعريفها، بما يشمل حساب المبيعات وحساب المخزون وحساب تكلفة المبيعات وكود الضريبة. |
| REQ-POS-070 | If item-level accounts are missing, the system may use default accounts from system settings; if no account is available, accounting posting shall be blocked. | إذا كانت حسابات الصنف غير موجودة، يمكن للنظام استخدام الحسابات الافتراضية من إعدادات النظام؛ وإذا لم يوجد حساب، يجب منع الترحيل المحاسبي. |

## 14. Inventory Movement Requirements | متطلبات حركات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-071 | Every inventory movement created from POS shall be linked to the source sales invoice, invoice line, and warehouse. | يجب ربط كل حركة مخزون ناتجة عن POS بفاتورة المبيعات المصدر وبند الفاتورة والمستودع. |
| REQ-POS-072 | The system shall prevent duplicate inventory movement for the same POS invoice line by checking sourceLineId before creating a new movement. | يجب أن يمنع النظام تكرار حركة المخزون لنفس بند فاتورة POS من خلال فحص sourceLineId قبل إنشاء حركة جديدة. |
| REQ-POS-073 | Each movement shall store running quantity balance and running inventory value balance after the movement. | يجب أن تحفظ كل حركة رصيد الكمية الجاري وقيمة المخزون الجارية بعد الحركة. |
| REQ-POS-074 | The first version shall use weighted average cost for POS inventory costing unless another valuation method is configured. | يجب أن تستخدم النسخة الأولى متوسط التكلفة المرجح لتكلفة مخزون POS ما لم يتم إعداد طريقة تقييم أخرى. |

## 15. Permissions | الصلاحيات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-075 | The system shall support POS permissions for opening sessions, closing sessions, selling, holding sales, voiding sales, applying discounts, changing prices, returns, refunds, receipt reprint, session reports, accounting posting, accounting rejection, and negative stock override. | يجب أن يدعم النظام صلاحيات POS لفتح الورديات وإغلاقها والبيع وتعليق البيع وإلغاء البيع وتطبيق الخصومات وتغيير الأسعار والمرتجعات ورد المبالغ وإعادة طباعة الإيصال وتقرير الوردية والترحيل المحاسبي والرفض المحاسبي وتجاوز البيع بالسالب. |
| REQ-POS-076 | Discounts above the allowed cashier limit shall require manager or authorized approval. | يجب أن تتطلب الخصومات التي تتجاوز حد الكاشير المسموح موافقة المدير أو المستخدم المخول. |
| REQ-POS-077 | Changing item price inside POS shall require a dedicated permission. | يجب أن يتطلب تغيير سعر الصنف داخل POS صلاحية مخصصة. |
| REQ-POS-078 | Session closing rights shall be configurable for cashier, supervisor, or manager roles. | يجب أن تكون صلاحيات إغلاق الوردية قابلة للتهيئة حسب أدوار الكاشير أو المشرف أو المدير. |

## 16. Audit Trail | سجل التدقيق

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-079 | The system shall record audit trail events for opening session, closing session, creating sale, holding sale, voiding sale, completing sale, applying discount, changing price, return, refund, reprinting receipt, accounting approval, and accounting rejection. | يجب أن يسجل النظام أحداث التدقيق لفتح الوردية وإغلاقها وإنشاء البيع وتعليقه وإلغائه وإتمامه وتطبيق الخصم وتغيير السعر والمرتجع ورد المبلغ وإعادة طباعة الإيصال والاعتماد المحاسبي والرفض المحاسبي. |
| REQ-POS-080 | Important records shall include created by/date, updated by/date, approved by/date, voided by/date, and void reason where applicable. | يجب أن تحتوي السجلات المهمة على منشئ السجل وتاريخه، والمحدث وتاريخه، والمعتمد وتاريخه، والملغي وتاريخه، وسبب الإلغاء عند التطبيق. |

## 17. Reports | التقارير

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-081 | The system shall provide a POS session report showing session number, cashier, branch, warehouse, opening cash, cash sales, card sales, CliQ sales, refunds, discounts, tax, expected cash, actual cash, difference, invoice count, and return count. | يجب أن يوفر النظام تقرير وردية POS يعرض رقم الوردية والكاشير والفرع والمستودع ورصيد الافتتاح ومبيعات الكاش ومبيعات البطاقة وCliQ والمرتجعات والخصومات والضريبة والكاش المتوقع والكاش الفعلي والفرق وعدد الفواتير وعدد المرتجعات. |
| REQ-POS-082 | The system shall provide reports for sales by payment method, cashier, branch, and item. | يجب أن يوفر النظام تقارير للمبيعات حسب طريقة الدفع والكاشير والفرع والصنف. |
| REQ-POS-083 | The system shall provide a Pending Accounting Review report for POS sales that affected inventory but are not yet posted accounting-wise. | يجب أن يوفر النظام تقرير المبيعات بانتظار المراجعة المحاسبية لعمليات POS التي أثرت على المخزون ولم ترحل محاسبيًا بعد. |
| REQ-POS-084 | The system shall provide an Inventory Impact report showing POS-related inventory movements. | يجب أن يوفر النظام تقرير أثر المخزون الذي يعرض حركات المخزون المرتبطة بـ POS. |
| REQ-POS-085 | The system shall provide a tax summary report for POS sales. | يجب أن يوفر النظام تقرير ملخص الضريبة لمبيعات POS. |

## 18. Validation Rules | قواعد التحقق

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-086 | The system shall not allow completing an empty POS sale. | يجب ألا يسمح النظام بإتمام عملية POS بدون بنود. |
| REQ-POS-087 | The system shall not allow completing a POS sale without at least one payment method. | يجب ألا يسمح النظام بإتمام بيع POS بدون طريقة دفع واحدة على الأقل. |
| REQ-POS-088 | The system shall not allow sale completion if total paid amount is less than invoice total, unless POS credit sale is explicitly enabled. | يجب ألا يسمح النظام بإتمام البيع إذا كان إجمالي المبلغ المدفوع أقل من إجمالي الفاتورة، إلا إذا تم تفعيل البيع الآجل من POS صراحةً. |
| REQ-POS-089 | The system shall require warehouse selection for every inventory item line. | يجب أن يطلب النظام تحديد مستودع لكل بند مادة مخزنية. |
| REQ-POS-090 | The system shall block accounting posting when required accounts are missing. | يجب أن يمنع النظام الترحيل المحاسبي عند غياب الحسابات المطلوبة. |
| REQ-POS-091 | The system shall prevent closing a POS session if there are unresolved DRAFT sales, unless configured otherwise. | يجب أن يمنع النظام إغلاق وردية POS إذا كانت هناك فواتير مسودة غير معالجة، إلا إذا تم إعداد النظام بخلاف ذلك. |
| REQ-POS-092 | The system shall prevent modifying completed POS sales. Corrections shall be handled through return, refund, correction, or reversal workflows. | يجب أن يمنع النظام تعديل عمليات POS المكتملة. ويجب معالجة التصحيحات من خلال المرتجع أو رد المبلغ أو التصحيح أو العكس. |

## 19. MVP Scope | نطاق النسخة الأولى

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-093 | The first POS version shall include opening session, POS sales screen, barcode/item search, cash and card payment, complete sale, inventory out, pending accounting review, accountant posting, close session, receipt printing, and session report. | يجب أن تشمل النسخة الأولى فتح الوردية، شاشة بيع POS، البحث بالباركود أو الصنف، الدفع النقدي والبطاقة، إتمام البيع، خروج المخزون، المراجعة المحاسبية، ترحيل المحاسب، إغلاق الوردية، طباعة الإيصال، وتقرير الوردية. |
| REQ-POS-094 | The first POS version shall exclude offline mode, restaurant tables, kitchen screens, loyalty points, coupons, gift cards, complex promotions, advanced returns, and multi-currency POS. | يجب أن تستبعد النسخة الأولى وضع عدم الاتصال، طاولات المطاعم، شاشات المطبخ، نقاط الولاء، الكوبونات، بطاقات الهدايا، العروض المعقدة، المرتجعات المتقدمة، وتعدد العملات في POS. |

## 20. Final Recommended Flow | المسار النهائي المقترح

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-POS-095 | The final recommended flow shall be: Open POS Session, Create POS Invoice as DRAFT, Add items, Validate stock, Choose payment, Complete Sale, Set operationalStatus = COMPLETED, Set accountingStatus = PENDING_REVIEW, Create Inventory Movement OUT, Update Item Warehouse Balance, Print Receipt, Close Session, Accountant Review, Approve and Post, Create Sales and COGS Journal Entries, Set accountingStatus = POSTED. | يجب أن يكون المسار النهائي المقترح: فتح وردية POS، إنشاء فاتورة POS كمسودة، إضافة الأصناف، التحقق من المخزون، اختيار الدفع، إتمام البيع، جعل الحالة التشغيلية مكتملة، جعل الحالة المحاسبية بانتظار المراجعة، إنشاء حركة خروج مخزون، تحديث رصيد الصنف حسب المستودع، طباعة الإيصال، إغلاق الوردية، مراجعة المحاسب، الاعتماد والترحيل، إنشاء قيود المبيعات وتكلفة المبيعات، ثم جعل الحالة المحاسبية مرحلة. |
