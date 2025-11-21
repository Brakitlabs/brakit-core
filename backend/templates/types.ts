import type { FrameworkInfo } from "../utils/detectFramework";

export type LayoutId =
  | "blank"
  | "hero"
  | "twoColumn"
  | "contentSplit"
  | "dashboard"
  | "form"
  | "pricing"
  | "sidebarLeft"
  | "docs";

export const LAYOUT_IDS: LayoutId[] = [
  "blank",
  "hero",
  "twoColumn",
  "contentSplit",
  "dashboard",
  "form",
  "pricing",
  "sidebarLeft",
  "docs",
];

export interface TemplateContext {
  pageName: string;
  slug: string;
  componentName: string;
  hasTailwind: boolean;
}

export interface TemplateMetadata {
  requiredShadcnComponents?: string[];
  requiresFormDependencies?: boolean;
}

export interface TemplateResult {
  code: string;
  metadata?: TemplateMetadata;
}

export type TemplateGenerator = (ctx: TemplateContext) => TemplateResult;

export type TemplateMap = Record<LayoutId, TemplateGenerator>;

export type { FrameworkInfo };
