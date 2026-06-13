import { amountInWordsAr } from "@/lib/amount-in-words-ar";
import type { PosMarketRepStatementReport } from "@/lib/api/pos-market";

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
    return `${isoDateMatch[3]}-${isoDateMatch[2]}-${isoDateMatch[1]}`;
  }
  const slashMatch = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value.trim());
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
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

export function buildPosMarketRepStatementA4Html(
  report: PosMarketRepStatementReport,
  options: { generatedBy?: string | null } = {},
): string {
  const companyName = escapeHtml(report.companyName);
  const repName = escapeHtml(report.salesRep.salesRepName);
  const repCode = escapeHtml(report.salesRep.salesRepCode);
  const generatedBy = escapeHtml(options.generatedBy ?? "—");
  const amountWords = escapeHtml(amountInWordsAr(report.totals.totalAmount, "دينار"));

  const tableRows = report.lines
    .map(
      (line) => `
        <tr>
          <td class="type">${escapeHtml(line.documentType)}</td>
          <td class="num">${escapeHtml(line.documentNumber)}</td>
          <td class="date">${escapeHtml(formatReportDate(line.documentDate))}</td>
          <td class="pay">${escapeHtml(line.paymentMode)}</td>
          <td class="code">${escapeHtml(line.customerCode)}</td>
          <td class="customer">${escapeHtml(line.customerName)}</td>
          <td class="rep">${escapeHtml(line.salesRepName)}</td>
          <td class="money">${amountCell(line.documentValue)}</td>
        </tr>`,
    )
    .join("");

  const marketFilterRow = report.customerFilter
    ? `<div>السوق : ${escapeHtml(report.customerFilter.customerCode)} — ${escapeHtml(report.customerFilter.customerName)}</div>`
    : `<div>السوق : جميع الأسواق</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>كشف مبيعات مندوب — ${repName}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #000;
      font-family: Arial, Tahoma, sans-serif;
      font-size: 10px;
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
      width: 220px;
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
      grid-template-columns: 1.2fr 1fr;
      gap: 6px 12px;
      margin-bottom: 10px;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
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
    td.type, td.num, td.date, td.pay, td.code { text-align: center; white-space: nowrap; }
    td.customer, td.rep { text-align: right; }
    td.money {
      text-align: left;
      direction: ltr;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .summary-total-row td {
      font-weight: 800;
      background: #f8f8f8;
    }
    .summary-box {
      margin-top: 10px;
      border: 1px solid #000;
      padding: 8px;
      font-size: 11px;
    }
    .summary-words {
      margin-top: 4px;
      font-weight: 700;
      line-height: 1.6;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 8px;
      font-size: 10px;
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

    <div class="title-box">كشف مبيعات مندوب</div>

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
      <div>المندوب : ${repCode} — ${repName}</div>
      <div>العملة : ${escapeHtml(report.currencyLabel)}</div>
      ${marketFilterRow}
    </div>

    <table>
      <thead>
        <tr>
          <th>نوع السند</th>
          <th>رقم السند</th>
          <th>تاريخ السند</th>
          <th>ذمم - نقدي</th>
          <th>رمز العميل</th>
          <th>العميل</th>
          <th>مندوب المبيعات</th>
          <th>قيمة السند</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr class="summary-total-row">
          <td colspan="7" style="text-align:left;">المجموع</td>
          <td class="money">${amountCell(report.totals.totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-words">المجموع : ${amountWords}</div>
      <div class="summary-stats">
        <div>عدد السندات: ${report.totals.documentCount}</div>
        <div>إجمالي قيمة السندات: ${amountCell(report.totals.totalAmount)}</div>
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
