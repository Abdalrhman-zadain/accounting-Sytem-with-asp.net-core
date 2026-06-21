import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function writeReceiptPreviewIndex(previewDir: string): void {
  const indexHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>POS Print Previews</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f4f4; max-width: 1400px; margin: 0 auto; }
    h1 { margin-bottom: 4px; }
    h2.section { margin: 32px 0 12px; font-size: 20px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
    p { color: #555; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; }
    .card h3 { margin: 0; padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #eee; }
    iframe { width: 100%; height: 720px; border: 0; background: #e8e8e8; }
    a { display: inline-block; margin: 8px 16px 16px; color: #1d4ed8; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; direction: ltr; display: inline-block; }
  </style>
</head>
<body>
  <h1>معاينة الطباعة قبل النشر</h1>
  <p>
    لتوليد الملفات من مجلد <code>frontend</code>:
    <code>npm test -- --run scripts/preview-pos-receipt.test.ts scripts/preview-kot-receipt.test.ts scripts/preview-session-roll.test.ts</code>
  </p>

  <h2 class="section">تقارير إغلاق الوردية</h2>
  <div class="grid">
    <div class="card">
      <h3>تقرير إغلاق الوردية</h3>
      <iframe src="session-roll-closing.html" title="Session closing"></iframe>
      <a href="session-roll-closing.html" target="_blank">فتح بصفحة كاملة</a>
    </div>
    <div class="card">
      <h3>قائمة الفواتير</h3>
      <iframe src="session-roll-invoice-list.html" title="Invoice list"></iframe>
      <a href="session-roll-invoice-list.html" target="_blank">فتح بصفحة كاملة</a>
    </div>
    <div class="card">
      <h3>كل الإيصالات</h3>
      <iframe src="session-roll-all-receipts.html" title="All receipts"></iframe>
      <a href="session-roll-all-receipts.html" target="_blank">فتح بصفحة كاملة</a>
    </div>
  </div>

  <h2 class="section">إيصال العميل</h2>
  <div class="grid">
    <div class="card">
      <h3>صالة — طاولة</h3>
      <iframe src="customer-dine-in.html" title="Dine-in receipt"></iframe>
      <a href="customer-dine-in.html" target="_blank">فتح</a>
    </div>
    <div class="card">
      <h3>سفري</h3>
      <iframe src="customer-takeaway.html" title="Takeaway receipt"></iframe>
      <a href="customer-takeaway.html" target="_blank">فتح</a>
    </div>
    <div class="card">
      <h3>توصيل</h3>
      <iframe src="customer-delivery.html" title="Delivery receipt"></iframe>
      <a href="customer-delivery.html" target="_blank">فتح</a>
    </div>
    <div class="card">
      <h3>بيع عادي — نقد</h3>
      <iframe src="standard-sale.html" title="Standard sale"></iframe>
      <a href="standard-sale.html" target="_blank">فتح</a>
    </div>
  </div>

  <h2 class="section">تذكرة المطبخ (KOT)</h2>
  <p><a href="kot-index.html">فهرس كل معاينات KOT</a></p>
  <div class="grid">
    <div class="card">
      <h3>صالة + إضافات</h3>
      <iframe src="kot-dine-in.html" title="KOT dine-in"></iframe>
      <a href="kot-dine-in.html" target="_blank">فتح</a>
    </div>
    <div class="card">
      <h3>سفري</h3>
      <iframe src="kot-takeaway.html" title="KOT takeaway"></iframe>
      <a href="kot-takeaway.html" target="_blank">فتح</a>
    </div>
    <div class="card">
      <h3>تحديث مطبخ</h3>
      <iframe src="kot-update.html" title="KOT update"></iframe>
      <a href="kot-update.html" target="_blank">فتح</a>
    </div>
  </div>
</body>
</html>`;

  writeFileSync(join(previewDir, "index.html"), indexHtml, "utf8");
}
