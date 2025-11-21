import fs from "fs";
import path from "path";
import jscodeshift from "jscodeshift";

export const STYLE_PROPS = [
  "variant",
  "type",
  "color",
  "mode",
  "theme",
  "intent",
  "size",
];

const DYNAMIC_CLASS_HINTS = [
  "${",
  "variant",
  "props.",
  "classnames(",
  "clsx(",
  "cva(",
  "twMerge(",
  "cn(",
  "twJoin(",
];

const CLASSNAME_ACCEPTORS = ["className", "classes", "variants", "styles"];

type CachedAnalysis = {
  mtimeMs: number;
  result: EditRiskAnalysis;
};

const analysisCache = new Map<string, CachedAnalysis>();

export interface EditRiskAnalysis {
  risky: boolean;
  reason?: string;
  detectedProps?: string[];
  filePath: string;
  componentName?: string;
  signals?: string[];
  metadata?: {
    hasClassNameProp?: boolean;
    spreadsProps?: boolean;
    usesVariantProps?: boolean;
    usesDynamicClass?: boolean;
    usesPropDrivenClasses?: boolean;
  };
}

export function analyzeComponentForEditRisk(
  filePath: string
): EditRiskAnalysis {
  let stats: fs.Stats;

  try {
    stats = fs.statSync(filePath);
  } catch (error) {
    analysisCache.delete(filePath);
    return { risky: false, filePath, signals: [] };
  }

  const cached = analysisCache.get(filePath);
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.result;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const j = (
    filePath.endsWith(".ts") || filePath.endsWith(".tsx")
      ? jscodeshift.withParser("tsx")
      : jscodeshift
  ) as typeof jscodeshift;

  const ast = j(source);
  const detectedProps: string[] = [];
  const signals: string[] = [];
  let componentName: string | undefined;

  let hasVariantProp = false;
  let hasDynamicClass = false;
  let hasPropClassUsage = false;
  let hasClassNameProp = false;
  let spreadsProps = false;

  const fileBaseName = path.basename(filePath);

  ast.find(j.ExportDefaultDeclaration).forEach((pathNode: any) => {
    if (componentName) {
      return;
    }

    const declaration: any = pathNode.node.declaration;
    if (!declaration) {
      return;
    }

    if (declaration.type === "Identifier") {
      componentName = declaration.name;
      return;
    }

    if ("id" in declaration && declaration.id?.type === "Identifier") {
      componentName = declaration.id.name;
      return;
    }
  });

  ast.find(j.VariableDeclarator).forEach((pathNode: any) => {
    if (componentName) {
      return;
    }

    const node: any = pathNode.node;
    if (node.id?.type === "Identifier") {
      const candidate = node.id.name;
      if (/^[A-Z]/.test(candidate)) {
        componentName = candidate;
      }
    }
  });

  if (!componentName) {
    const base = fileBaseName.replace(/\.[tj]sx?$/, "");
    if (/^[A-Z]/.test(base)) {
      componentName = base;
    }
  }

  ast.find(j.Identifier).forEach((path: any) => {
    if (STYLE_PROPS.includes(path.node.name)) {
      hasVariantProp = true;
      detectedProps.push(path.node.name);
    }
  });

  ast.find(j.JSXAttribute).forEach((attr: any) => {
    const nameNode: any = attr.node.name;
    const attrName: string | undefined = nameNode?.name;

    if (!attrName) {
      return;
    }

    if (attrName === "className") {
      hasClassNameProp = true;
    }

    if (CLASSNAME_ACCEPTORS.includes(attrName)) {
      const val = attr.node.value;
      if (val?.type === "JSXExpressionContainer") {
        const valAny = val as any;
        const expressionNode: any = valAny.expression ?? valAny;
        const start: number | undefined = expressionNode.start ?? valAny.start;
        const end: number | undefined = expressionNode.end ?? valAny.end;

        if (typeof start === "number" && typeof end === "number") {
          const expr = source.slice(start, end);

          if (DYNAMIC_CLASS_HINTS.some((hint) => expr.includes(hint))) {
            hasDynamicClass = true;
          }
          if (expr.includes("props.")) {
            hasPropClassUsage = true;
          }
          if (expr.includes("style.")) {
            hasPropClassUsage = true;
          }
        }
      }

      if (attr.node.value?.type === "StringLiteral") {
        const stringVal = (attr.node.value as any).value as string | undefined;
        if (
          stringVal &&
          DYNAMIC_CLASS_HINTS.some((hint) => stringVal.includes(hint))
        ) {
          hasDynamicClass = true;
        }
      }
    }
  });

  ast.find(j.JSXSpreadAttribute).forEach((spread: any) => {
    spreadsProps = true;

    const argument: any = spread.node.argument;
    if (argument?.type === "Identifier" && argument.name === "props") {
      hasPropClassUsage = true;
    }
  });

  if (hasVariantProp) {
    signals.push("variant-prop");
  }
  if (hasDynamicClass) {
    signals.push("dynamic-class");
  }
  if (hasPropClassUsage) {
    signals.push("class-from-props");
  }
  if (!hasClassNameProp) {
    signals.push("no-classname-prop");
  }
  if (spreadsProps) {
    signals.push("props-spread");
  }

  const risky = hasVariantProp || hasDynamicClass || hasPropClassUsage;

  const result: EditRiskAnalysis = {
    risky,
    reason: risky
      ? "Dynamic or shared styling detected (variant or prop-based)."
      : undefined,
    detectedProps: detectedProps.length
      ? Array.from(new Set(detectedProps))
      : undefined,
    filePath,
    componentName,
    signals: signals.length ? Array.from(new Set(signals)) : undefined,
    metadata: {
      hasClassNameProp,
      spreadsProps,
      usesVariantProps: hasVariantProp,
      usesDynamicClass: hasDynamicClass,
      usesPropDrivenClasses: hasPropClassUsage,
    },
  };

  analysisCache.set(filePath, {
    mtimeMs: stats.mtimeMs,
    result,
  });

  return result;
}
