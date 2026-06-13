import { amountInWordsAr } from "@/lib/amount-in-words-ar";
import type { PosMarketAccountStatementReport } from "@/lib/api/pos-market";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatReportDate(value: string): string {
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (isoDateMatch) {
    return `${isoDateMatch[1]}/${isoDateMatch[2]}/${isoDateMatch[3]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatReportDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const datePart = formatReportDate(value);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const period = hours >= 12 ? "م" : "ص";
  const hour12 = String(hours % 12 || 12).padStart(2, "0");
  return `${datePart} ${hour12}:${minutes}:${seconds} ${period}`;
}

function amountCell(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) {
    return "0.000";
  }
  return amount.toFixed(3);
}

export function buildPosMarketAccountStatementA4Html(
  report: PosMarketAccountStatementReport,
  options: { generatedBy?: string | null } = {},
): string {
  const companyName = escapeHtml(report.companyName);
  const customerName = escapeHtml(report.customer.customerName);
  const customerCode = escapeHtml(report.customer.customerCode);
  const contactInfo = escapeHtml(report.customer.contactInfo ?? "");
  const generatedBy = escapeHtml(options.generatedBy ?? "—");
  const amountWords = escapeHtml(
    amountInWordsAr(report.totals.closingBalance, "دينار"),
  );

  const tableRows = report.lines
    .map(
      (line) => `
        <tr>
          <td class="type">${escapeHtml(line.documentType)}</td>
          <td class="num">${escapeHtml(line.documentNumber)}</td>
          <td class="date">${escapeHtml(line.documentDate)}</td>
          <td class="details">${escapeHtml(line.details)}</td>
          <td class="money">${amountCell(line.debit)}</td>
          <td class="money">${amountCell(line.credit)}</td>
          <td class="money balance">${amountCell(line.balance)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>كشف حساب — ${customerName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #000;
      font-family: Arial, Tahoma, sans-serif;
      font-size: 11px;
      direction: rtl;
      background: #fff;
    }
    .page {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }
    .company-line {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .title-box {
      border: 1px solid #000;
      text-align: center;
      padding: 6px 10px;
      margin: 0 auto 10px;
      width: 180px;
      font-size: 16px;
      font-weight: 800;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
      font-size: 11px;
    }
    .meta-row .left { text-align: left; direction: rtl; }
    .meta-row .right { text-align: right; }
    .account-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.8fr;
      gap: 6px 12px;
      margin-bottom: 10px;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    thead { display: table-header-group; }
    th, td {
      border: 1px solid #000;
      padding: 4px 5px;
      vertical-align: top;
    }
    th {
      text-align: center;
      font-weight: 800;
      background: #fff;
    }
    td.details { text-align: right; min-width: 180px; }
    td.type, td.num, td.date { text-align: center; white-space: nowrap; }
    td.money {
      text-align: left;
      direction: ltr;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    td.balance { font-weight: 700; }
    .summary-box {
      margin-top: 10px;
      border: 1px solid #000;
      padding: 8px;
      font-size: 11px;
    }
    .summary-total-row td {
      font-weight: 800;
      background: #f8f8f8;
    }
    .summary-words {
      margin-top: 8px;
      font-weight: 700;
      line-height: 1.6;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 8px;
      font-size: 10px;
    }
    .disclaimer {
      margin-top: 8px;
      font-size: 10px;
      text-align: center;
    }
    .footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #000;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="company-line">
      <span>${companyName}</span>
      <span>${companyName}</span>
    </div>

    <div class="title-box">كشف الحساب</div>

    <div class="meta-row">
      <div class="right">
        <div>من تاريخ : ${formatReportDate(report.fromDate)}</div>
        <div>إلى تاريخ : ${formatReportDate(report.toDate)}</div>
      </div>
      <div class="left">
        <div>التاريخ : ${formatReportDate(report.generatedAt)}</div>
        <div>الوقت : ${formatReportDateTime(report.generatedAt).split(" ").slice(1).join(" ")}</div>
      </div>
    </div>

    <div class="account-grid">
      <div>رقم الحساب : ${customerCode} — ${customerName}</div>
      <div>العنوان : ${contactInfo || "—"}</div>
      <div>العملة : ${escapeHtml(report.currencyLabel)}</div>
      ${
        report.customer.salesRepName
          ? `<div>المندوب : ${escapeHtml(report.customer.salesRepName)}</div>`
          : ""
      }
    </div>

    <table>
      <thead>
        <tr>
          <th>نوع المستند</th>
          <th>رقم المستند</th>
          <th>تاريخ المستند</th>
          <th>التفاصيل</th>
          <th>منه</th>
          <th>له</th>
          <th>الرصيد</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr class="summary-total-row">
          <td colspan="4" style="text-align:left;">المجموع :</td>
          <td class="money">${amountCell(report.totals.debit)}</td>
          <td class="money">${amountCell(report.totals.credit)}</td>
          <td class="money balance">${amountCell(report.totals.closingBalance)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-words">المجموع : ${amountWords}</div>
      <div class="summary-stats">
        <div>عدد الحركات: ${report.totals.transactionCount}</div>
        <div>الرصيد الختامي: ${amountCell(report.totals.closingBalance)}</div>
        <div>الرصيد الافتتاحي: ${amountCell(report.openingBalance)}</div>
      </div>
      <div class="disclaimer">
        يعتبر هذا الرصيد صحيحاً ما لم يردنا أي اعتراض خلال خمسة عشر يوماً من تاريخه
      </div>
    </div>

    <div class="footer">
      <div>
        <div>Simple Account</div>
      </div>
      <div style="text-align:left;">
        <div>إسم المستخدم : ${generatedBy}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
