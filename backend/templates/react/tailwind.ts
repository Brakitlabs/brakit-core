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

const wrapReactComponent = (
  ctx: TemplateContext,
  layout: TailwindLayout
): TemplateResult => {
  const componentName = ctx.componentName || "Page";
  const content = indent(layout.body);
  const imports = new Set<string>([`import React from "react";`]);
  layout.imports?.forEach((imp) => {
    const trimmed = imp.trim();
    if (trimmed.length) {
      imports.add(trimmed);
    }
  });

  const importBlock = Array.from(imports).join("\n");
  const hoisted =
    layout.hoistedCode && layout.hoistedCode.length
      ? `${layout.hoistedCode.filter(Boolean).join("\n\n")}\n\n`
      : "";
  const setup =
    layout.setupCode && layout.setupCode.length
      ? `${indent(layout.setupCode.filter(Boolean).join("\n\n"), 2)}\n\n`
      : "";

  const code = `${importBlock}

${hoisted}const ${componentName} = () => {
${setup}  return (
${content}
  );
};

export default ${componentName};
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
  wrapReactComponent(ctx, renderTailwindLayout(layout, ctx));

export const reactTailwindTemplates: TemplateMap = {
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
