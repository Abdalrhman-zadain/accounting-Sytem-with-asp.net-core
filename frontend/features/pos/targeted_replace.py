import re
from pathlib import Path

filepath = Path('/home/whitespider/Desktop/work_project/simple-account/frontend/features/pos/pos-page.tsx')
content = filepath.read_text(encoding='utf-8')

# A dictionary of exact replacements.
# Note: For JSX attributes like title="...", we need to replace the quotes with curly braces if we call a function.
# Or if it's already a JS string, just wrap it.

replacements = [
    # pushMessage argument
    (r'pushMessage\("Customer created successfully / تم إنشاء العميل بنجاح"\)', r'pushMessage(getLocalizedText("Customer created successfully / تم إنشاء العميل بنجاح", language))'),
    
    # Simple strings in JS code or JSX text nodes
    (r'"Select a customer for partial payment or credit / اختر عميلاً للبيع الآجل أو الجزئي"', r'getLocalizedText("Select a customer for partial payment or credit / اختر عميلاً للبيع الآجل أو الجزئي", language)'),
    (r'"Close blocked: drafts or held sales exist / الإغلاق ممنوع: توجد مسودات أو معلقة"', r'getLocalizedText("Close blocked: drafts or held sales exist / الإغلاق ممنوع: توجد مسودات أو معلقة", language)'),
    (r'"Enter actual cash counted in the drawer / أدخل النقد الفعلي"', r'getLocalizedText("Enter actual cash counted in the drawer / أدخل النقد الفعلي", language)'),
    (r'"You do not have permission to cancel this sale / لا تملك صلاحية إلغاء البيع"', r'getLocalizedText("You do not have permission to cancel this sale / لا تملك صلاحية إلغاء البيع", language)'),
    (r'"Paid / تم الدفع"', r'getLocalizedText("Paid / تم الدفع", language)'),
    (r'"Pay Sale / دفع الفاتورة"', r'getLocalizedText("Pay Sale / دفع الفاتورة", language)'),
    (r'"Select a customer to continue with partial or credit payment / اختر عميلاً لإكمال الدفع الجزئي أو الآجل"', r'getLocalizedText("Select a customer to continue with partial or credit payment / اختر عميلاً لإكمال الدفع الجزئي أو الآجل", language)'),
    (r'"Tendered amount is below total and credit is disabled / المدفوع أقل من الإجمالي والبيع الآجل غير مفعّل"', r'getLocalizedText("Tendered amount is below total and credit is disabled / المدفوع أقل من الإجمالي والبيع الآجل غير مفعّل", language)'),
    (r'"Creating… / جارٍ الإنشاء…"', r'getLocalizedText("Creating… / جارٍ الإنشاء…", language)'),
    (r'"Create & Select / إنشاء واختيار"', r'getLocalizedText("Create & Select / إنشاء واختيار", language)'),
    (r'"Requires POS_OPEN_SESSION permission / يتطلب صلاحية فتح الجلسة"', r'getLocalizedText("Requires POS_OPEN_SESSION permission / يتطلب صلاحية فتح الجلسة", language)'),
    (r'"Out of stock / نفد"', r'getLocalizedText("Out of stock / نفد", language)'),

    # JSX Attributes that currently use string literals
    (r'placeholder="Walk-In Customer / زبون عابر"', r'placeholder={getLocalizedText("Walk-In Customer / زبون عابر", language)}'),
    (r'title="Quick-add customer / إضافة عميل سريع"', r'title={getLocalizedText("Quick-add customer / إضافة عميل سريع", language)}'),
    (r'placeholder="Amount / المبلغ"', r'placeholder={getLocalizedText("Amount / المبلغ", language)}'),
    (r'placeholder="Reference / المرجع"', r'placeholder={getLocalizedText("Reference / المرجع", language)}'),
    (r'title="Held & drafts / معلقة ومسودات"', r'title={getLocalizedText("Held & drafts / معلقة ومسودات", language)}'),
    (r'title="Cancel sale\? / إلغاء البيع\?"', r'title={getLocalizedText("Cancel sale? / إلغاء البيع؟", language)}'),
    (r'title="New Customer / عميل جديد"', r'title={getLocalizedText("New Customer / عميل جديد", language)}'),
    (r'title="Line discount / خصم السطر"', r'title={getLocalizedText("Line discount / خصم السطر", language)}'),
    (r'>No customer found / لا يوجد عميل<', r'>{getLocalizedText("No customer found / لا يوجد عميل", language)}<'),
    (r'>Exact / تماماً<', r'>{getLocalizedText("Exact / تماماً", language)}<'),
]

for old, new in replacements:
    content = re.sub(old, new, content)

filepath.write_text(content, encoding='utf-8')
print("Replacements done.")
