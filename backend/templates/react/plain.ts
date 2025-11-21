import type {
  LayoutId,
  TemplateContext,
  TemplateMap,
  TemplateResult,
} from "../types";
import { renderPlainLayout } from "../layouts/plain";

const indent = (code: string, spaces = 4) =>
  code
    .trim()
    .split("\n")
    .map((line) => `${" ".repeat(spaces)}${line}`)
    .join("\n");

const wrapPlainReactComponent = (
  ctx: TemplateContext,
  layout: LayoutId
): TemplateResult => {
  const componentName = ctx.componentName || "Page";
  const { helpers, markup } = renderPlainLayout(layout, ctx);
  const indentedMarkup = indent(markup);
  const helperBlock = helpers.trim().length
    ? `${helpers.trim()}
`
    : "";

  const helperLines = helperBlock
    .split("\n")
    .map((line) => (line.length ? `  ${line}` : line))
    .join("\n");

  const code = `import React from "react";

const ${componentName} = () => {
${helperLines}
  return (
${indentedMarkup}
  );
};

export default ${componentName};
`;

  return { code, metadata: {} };
};

const createTemplate = (layout: LayoutId) => (ctx: TemplateContext) =>
  wrapPlainReactComponent(ctx, layout);

export const reactPlainTemplates: TemplateMap = {
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
