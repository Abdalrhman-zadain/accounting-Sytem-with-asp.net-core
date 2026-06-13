const ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function joinArabicParts(parts: string[]): string {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) {
    return "";
  }
  if (filtered.length === 1) {
    return filtered[0]!;
  }
  if (filtered.length === 2) {
    return `${filtered[0]} و${filtered[1]}`;
  }
  return `${filtered.slice(0, -1).join(" و")} و${filtered[filtered.length - 1]}`;
}

function belowHundred(value: number): string {
  if (value === 0) {
    return "";
  }
  if (value < 20) {
    return ONES[value]!;
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (ones === 0) {
    return TENS[tens]!;
  }
  return joinArabicParts([ONES[ones]!, TENS[tens]!]);
}

function belowThousand(value: number): string {
  if (value === 0) {
    return "";
  }
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return joinArabicParts([HUNDREDS[hundreds]!, belowHundred(remainder)]);
}

function integerToArabicWords(value: number): string {
  if (value === 0) {
    return "صفر";
  }

  const scales: Array<{ value: number; singular: string; dual: string; plural: string }> = [
    { value: 1_000_000_000, singular: "مليار", dual: "ملياران", plural: "مليارات" },
    { value: 1_000_000, singular: "مليون", dual: "مليونان", plural: "ملايين" },
    { value: 1_000, singular: "ألف", dual: "ألفان", plural: "آلاف" },
  ];

  let remaining = value;
  const parts: string[] = [];

  for (const scale of scales) {
    if (remaining < scale.value) {
      continue;
    }
    const count = Math.floor(remaining / scale.value);
    remaining %= scale.value;

    if (count === 1) {
      parts.push(scale.singular);
      continue;
    }
    if (count === 2) {
      parts.push(scale.dual);
      continue;
    }
    if (count >= 3 && count <= 10) {
      parts.push(`${integerToArabicWords(count)} ${scale.plural}`);
      continue;
    }
    parts.push(`${integerToArabicWords(count)} ${scale.singular}`);
  }

  if (remaining > 0) {
    parts.push(belowThousand(remaining));
  }

  return joinArabicParts(parts);
}

function dinarLabel(count: number): string {
  if (count === 0) {
    return "";
  }
  if (count === 1) {
    return "دينار";
  }
  if (count === 2) {
    return "ديناران";
  }
  if (count >= 3 && count <= 10) {
    return "دينارات";
  }
  return "ديناراً";
}

function filsLabel(count: number): string {
  if (count === 0) {
    return "";
  }
  if (count === 1) {
    return "فلس";
  }
  if (count === 2) {
    return "فلسان";
  }
  if (count >= 3 && count <= 10) {
    return "فلوس";
  }
  return "فلس";
}

export function amountInWordsAr(
  value: string | number,
  currencyName = "دينار",
): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  const sign = amount < 0 ? "سالب " : "";
  const absolute = Math.abs(amount);
  const dinars = Math.floor(absolute);
  const fils = Math.round((absolute - dinars) * 1000);

  const dinarWords = integerToArabicWords(dinars);
  const filsWords = fils > 0 ? integerToArabicWords(fils) : "";

  const parts: string[] = [];
  if (dinars > 0) {
    parts.push(`${dinarWords} ${dinarLabel(dinars).replace("دينار", currencyName) || currencyName}`);
  }
  if (fils > 0) {
    parts.push(`${filsWords} ${filsLabel(fils)}`);
  }
  if (parts.length === 0) {
    return `${sign}صفر ${currencyName} فقط`;
  }

  return `${sign}${joinArabicParts(parts)} فقط`;
}
