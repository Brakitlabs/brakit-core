import type {
  LayoutId,
  TemplateContext,
  TemplateMap,
  TemplateResult,
} from "../types";
import {
  renderTailwindLayout,
  type TailwindLayout,
} from "../layouts/tailwind";

const indent = (code: string, spaces = 4) =>
  code
    .trim()
    .split("\n")
    .map((line) => `${" ".repeat(spaces)}${line}`)
    .join("\n");

const wrapNextAppPage = (
  ctx: TemplateContext,
  layout: TailwindLayout
): TemplateResult => {
  const baseName = ctx.componentName || "Page";
  const componentName = baseName.endsWith("Page") ? baseName : `${baseName}Page`;
  const content = indent(layout.body);

  const importStatements = new Set<string>();
  layout.imports?.forEach((imp) => {
    const trimmed = imp.trim();
    if (trimmed.length) {
      importStatements.add(trimmed);
    }
  });
  const importBlock = importStatements.size
    ? `${Array.from(importStatements).join("\n")}\n\n`
    : "";

  const hoisted =
    layout.hoistedCode && layout.hoistedCode.length
      ? `${layout.hoistedCode.filter(Boolean).join("\n\n")}\n\n`
      : "";

  const setup =
    layout.setupCode && layout.setupCode.length
      ? `${indent(layout.setupCode.filter(Boolean).join("\n\n"), 2)}\n\n`
      : "";

  const code = `"use client";
${importBlock}${hoisted}export default function ${componentName}() {
${setup}  return (
${content}
  );
}
`;

  return {
    code,
    metadata: {
      requiredShadcnComponents: layout.shadcnComponents,
      requiresFormDependencies: layout.requiresFormDependencies,
    },
  };
};

const createTemplate = (layout: LayoutId) => (ctx: TemplateContext) =>
  wrapNextAppPage(ctx, renderTailwindLayout(layout, ctx));

export const nextAppTemplates: TemplateMap = {
  blank: createTemplate("blank"),
  hero: createTemplate("hero"),
  twoColumn: createTemplate("twoColumn"),
  contentSplit: createTemplate("contentSplit"),
  dashboard: createTemplate("dashboard"),
  form: createTemplate("form"),
  pricing: createTemplate("pricing"),
  sidebarLeft: createTemplate("sidebarLeft"),
  docs: createTemplate("docs"),
};
