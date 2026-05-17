// POS UI palette reference
// Keep future POS screens aligned with the approved screenshot palette unless
// the user explicitly asks for a visual redesign.
export const POS_THEME = {
  colors: {
    primary: "#46644b",
    primaryDark: "#223228",
    primaryMuted: "#4b6250",
    primarySoft: "#eef3ef",
    primarySoftAlt: "#f7faf8",
    primaryBorder: "#c7d3cc",
    primaryBorderStrong: "#b7c7bb",
    pageSurface: "#fbf9f8",
    cardSurface: "#ffffff",
    cardSurfaceAlt: "#fcfcfb",
    cardSurfaceMuted: "#f9faf8",
    cardSurfaceSoft: "#f4f7f4",
    outline: "#d7ddd8",
    outlineSoft: "#dbe2dd",
    outlineMuted: "#d4ddd7",
    text: "#233329",
    textStrong: "#223228",
    textMuted: "#596760",
    textSoft: "#6c7a72",
    textPlaceholder: "#76867c",
    success: "#46644b",
    dangerBg: "#ead7d5",
    dangerText: "#7d3f38",
    heroGradient:
      "radial-gradient(circle at top left, rgba(201,235,204,0.95), rgba(251,249,248,0.98) 45%, rgba(244,240,237,1) 100%)",
  },
  shadows: {
    hero: "0 32px 100px -55px rgba(35,51,41,0.45)",
    card: "0 24px 80px -48px rgba(40,64,48,0.45)",
    cardSoft: "0 18px 55px -40px rgba(40,64,48,0.45)",
    metric: "0 18px 40px -32px rgba(35,51,41,0.5)",
  },
} as const;

export const POS_THEME_GUIDANCE =
  "Use the POS_THEME palette for POS pages and components. This palette is anchored to the approved POS screenshot and stitch design reference.";
