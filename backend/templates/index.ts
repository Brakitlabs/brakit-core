import type { FrameworkInfo } from "../utils/detectFramework";
import {
  LAYOUT_IDS,
  type LayoutId,
  type TemplateGenerator,
} from "./types";
import { nextAppTemplates } from "./next/app";
import { nextPagesTemplates } from "./next/pages";
import { reactTailwindTemplates } from "./react/tailwind";
import { reactPlainTemplates } from "./react/plain";

const DEFAULT_LAYOUT: LayoutId = "blank";

function isLayoutId(value: string): value is LayoutId {
  return (LAYOUT_IDS as string[]).includes(value);
}

export { type LayoutId } from "./types";

export function selectTemplate(
  info: FrameworkInfo,
  layoutId: string
): TemplateGenerator {
  const layout: LayoutId = isLayoutId(layoutId) ? layoutId : DEFAULT_LAYOUT;

  if (info.framework === "next") {
    const registry =
      info.router === "app" ? nextAppTemplates : nextPagesTemplates;
    return registry[layout] ?? registry[DEFAULT_LAYOUT];
  }

  const registry = info.hasTailwind
    ? reactTailwindTemplates
    : reactPlainTemplates;

  return registry[layout] ?? registry[DEFAULT_LAYOUT];
}
