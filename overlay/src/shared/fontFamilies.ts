export interface FontFamilyOption {
  id: string;
  label: string;
  className: string;
  previewFamily: string;
  description?: string;
}

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  {
    id: "font-sans",
    label: "Sans · System",
    className: "font-sans",
    previewFamily:
      'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif)',
    description: "Clean, modern sans-serif stack.",
  },
  {
    id: "font-serif",
    label: "Serif · Classic",
    className: "font-serif",
    previewFamily:
      'var(--font-serif, "Times New Roman", "Georgia", serif)',
    description: "Traditional serif typography.",
  },
  {
    id: "font-mono",
    label: "Mono · Code",
    className: "font-mono",
    previewFamily:
      'var(--font-mono, "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", monospace)',
    description: "Monospaced type for UI or code.",
  },
  {
    id: "font-geist-sans",
    label: "Geist Sans",
    className: "[font-family:var(--font-geist-sans)]",
    previewFamily:
      'var(--font-geist-sans, "Geist", "Inter", "Segoe UI", sans-serif)',
    description: "Next.js Geist Sans variable font.",
  },
  {
    id: "font-geist-mono",
    label: "Geist Mono",
    className: "[font-family:var(--font-geist-mono)]",
    previewFamily:
      'var(--font-geist-mono, "Geist Mono", "SF Mono", "Menlo", monospace)',
    description: "Next.js Geist Mono variable font.",
  },
];

export function findFontOptionByClass(
  className: string | DOMTokenList | null | undefined
): FontFamilyOption | undefined {
  if (!className) {
    return undefined;
  }

  const classTokens =
    typeof className === "string"
      ? className.split(/\s+/).filter(Boolean)
      : Array.from(className);

  return FONT_FAMILY_OPTIONS.find((option) =>
    classTokens.includes(option.className)
  );
}

export function getDefaultFontOption(): FontFamilyOption {
  return FONT_FAMILY_OPTIONS[0];
}
