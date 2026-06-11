export function getLocalizedJournalEntryTypeName(name: string, language: string) {
  if (language !== "ar") return name;

  switch (name.trim().toLowerCase()) {
    case "general":
      return "عام";
    case "receipt":
      return "سند قبض";
    case "payment":
      return "سند صرف";
    case "transfer":
      return "تحويل";
    default:
      return name;
  }
}

export function getLocalizedPaymentMethodTypeName(name: string, language: string) {
  if (language !== "ar") return name;

  switch (name.trim().toLowerCase()) {
    case "bank":
      return "بنك";
    case "cash":
      return "نقد";
    default:
      return name;
  }
}
