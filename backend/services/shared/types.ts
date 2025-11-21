export interface BaseUpdateResult {
  success: boolean;
  message?: string;
  error?: string;
  warning?: boolean;
  details?: string;
  detectedProps?: string[];
  filePath?: string;
  componentName?: string;
  signals?: string[];
}

export interface SearchOptions {
  text: string;
  tag: string;
  file: string;
}

export const COMPONENT_MAP: Record<string, string[]> = {
  a: ["a", "A", "Link"],
  button: ["button", "Button"],
  img: ["img", "Img", "Image"],
  h1: ["h1", "H1"],
  h2: ["h2", "H2"],
  h3: ["h3", "H3"],
  h4: ["h4", "H4"],
  h5: ["h5", "H5"],
  h6: ["h6", "H6"],
  p: ["p", "P"],
  span: ["span", "Span"],
  div: ["div", "Div"],
};

export const SKIP_DIRECTORIES = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  "coverage",
];

export const SEARCH_DIRECTORIES = [
  "src",
  "app",
  "pages",
  "components",
  "lib",
  "ui",
  "views",
  "features",
  "modules",
  "layouts",
  "widgets",
];
