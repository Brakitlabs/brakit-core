import fs from "fs";
import path from "path";
import { z } from "zod";
import type { GeneratedTokens } from "./tokens";
import { tokenService } from "./tokens";

export type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "textarea"
  | "checkbox";

export interface FormFieldSpec {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  description?: string;
  defaultValue?: string | boolean;
}

export interface FormSpec {
  id: string;
  label: string;
  icon: string;
  title: string;
  submitLabel: string;
  description?: string;
  fields: FormFieldSpec[];
}

export interface GeneratedFormCode {
  schemaName: string;
  schemaDeclaration: string;
  setupCode: string;
  submitHandlerName: string;
  formVarName: string;
  formJsx: string;
  label: string;
}

const RAW_FORM_SPECS_PATH = resolveFormSpecsPath();

function resolveFormSpecsPath(): string {
  const relativeTarget = path.join("shared", "formSpecs.json");
  const searchPaths: string[] = [];

  const located = findFileUpwards(__dirname, relativeTarget);
  if (located) {
    return located;
  }

  const fallback = path.resolve(__dirname, "../../../../shared/formSpecs.json");
  searchPaths.push(fallback);
  if (fs.existsSync(fallback)) {
    return fallback;
  }

  const nodeModulesPath = path.join(
    process.cwd(),
    "node_modules",
    "brakit",
    "shared",
    "formSpecs.json"
  );
  searchPaths.push(nodeModulesPath);
  if (fs.existsSync(nodeModulesPath)) {
    return nodeModulesPath;
  }

  throw new Error(
    `[FormSpecs] Unable to locate formSpecs.json. Checked: ${searchPaths.join(
      ", "
    )}`
  );
}

function findFileUpwards(
  startDir: string,
  relativePath: string
): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (true) {
    const candidate = path.join(currentDir, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    if (currentDir === root) {
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

const formFieldSpecSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    type: z.union([
      z.literal("text"),
      z.literal("email"),
      z.literal("password"),
      z.literal("textarea"),
      z.literal("checkbox"),
    ]),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    description: z.string().optional(),
    defaultValue: z.union([z.string(), z.boolean()]).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "checkbox" && typeof field.defaultValue === "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Checkbox defaultValue must be boolean",
        path: ["defaultValue"],
      });
    }

    if (field.type !== "checkbox" && typeof field.defaultValue === "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Text fields require string defaultValue",
        path: ["defaultValue"],
      });
    }
  });

const formSpecSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1),
  title: z.string().min(1),
  submitLabel: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(formFieldSpecSchema).min(1),
});

const formSpecsSchema = z.array(formSpecSchema);

function loadFormSpecs(): FormSpec[] {
  let rawContents: string;
  try {
    rawContents = fs.readFileSync(RAW_FORM_SPECS_PATH, "utf8");
  } catch (error) {
    throw new Error(
      `[FormSpecs] Unable to read ${RAW_FORM_SPECS_PATH}: ${String(error)}`
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContents);
  } catch (error) {
    throw new Error(
      `[FormSpecs] Invalid JSON in ${RAW_FORM_SPECS_PATH}: ${String(error)}`
    );
  }

  const result = formSpecsSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `[FormSpecs] Spec validation failed: ${result.error.toString()}`
    );
  }

  return result.data;
}

const rawFormSpecs = loadFormSpecs();

export const FORM_SPECS: readonly FormSpec[] = rawFormSpecs.map((spec) => ({
  ...spec,
}));

export function getFormSpec(id: string): FormSpec | undefined {
  return FORM_SPECS.find((spec) => spec.id === id);
}

interface IdentifierOptions {
  schemaName: string;
  formVarName: string;
  submitHandlerName: string;
}

export function generateFormCode(
  spec: FormSpec,
  identifiers: IdentifierOptions
): GeneratedFormCode {
  const tokens = tokenService.getGeneratedTokens();
  const schemaDeclaration = buildSchema(spec, identifiers.schemaName);
  const setupCode = buildSetup(spec, identifiers);
  const formJsx = buildFormJsx(spec, identifiers, tokens);

  return {
    schemaName: identifiers.schemaName,
    schemaDeclaration,
    setupCode,
    submitHandlerName: identifiers.submitHandlerName,
    formVarName: identifiers.formVarName,
    formJsx,
    label: spec.label,
  };
}

function buildSchema(spec: FormSpec, schemaName: string): string {
  const fieldLines = spec.fields.map((field) => {
    const validator = buildFieldValidator(field);
    return `  ${field.name}: ${validator},`;
  });

  return `const ${schemaName} = z.object({
${fieldLines.join("\n")}\n});`;
}

function buildFieldValidator(field: FormFieldSpec): string {
  if (field.type === "checkbox") {
    let validator = "z.boolean()";
    if (field.required) {
      const message = escapeQuotes(
        field.description || `${field.label} must be accepted.`
      );
      validator += `.refine((value) => value === true, { message: "${message}" })`;
    }

    if (!field.required) {
      validator += ".optional()";
    }

    return validator;
  }

  const parts: string[] = ["z.string()"];

  if (field.required) {
    parts.push(`.min(1, "${escapeQuotes(field.label)} is required.")`);
  }

  if (typeof field.minLength === "number") {
    parts.push(
      `.min(${field.minLength}, "${escapeQuotes(
        `${field.label} must be at least ${field.minLength} characters.`
      )}")`
    );
  }

  if (typeof field.maxLength === "number") {
    parts.push(
      `.max(${field.maxLength}, "${escapeQuotes(
        `${field.label} must be at most ${field.maxLength} characters.`
      )}")`
    );
  }

  if (field.type === "email") {
    parts.push(
      `.email("Please enter a valid ${escapeQuotes(
        field.label.toLowerCase()
      )}.")`
    );
  }

  let validator = parts.join("");
  if (!field.required) {
    validator += ".optional()";
  }

  return validator;
}

function buildSetup(spec: FormSpec, identifiers: IdentifierOptions): string {
  const defaults = spec.fields
    .map((field) => {
      const defaultValue = formatDefaultValue(field);
      return `      ${field.name}: ${defaultValue},`;
    })
    .join("\n");

  return `const ${identifiers.formVarName} = useForm<z.infer<typeof ${identifiers.schemaName}>>({
  resolver: zodResolver(${identifiers.schemaName}),
  defaultValues: {
${defaults}\n  },
});

function ${identifiers.submitHandlerName}(values: z.infer<typeof ${identifiers.schemaName}>) {
  console.log("${spec.id} submission", values);
}`;
}

function buildFormJsx(
  spec: FormSpec,
  identifiers: IdentifierOptions,
  tokens: GeneratedTokens
): string {
  const c = tokens.color;
  const t = tokens.typography;
  const r = tokens.radius;
  const s = tokens.spacing;
  const sh = tokens.shadow;
  const fieldBlocks = spec.fields
    .map((field) => buildFieldBlock(field, identifiers.formVarName, tokens))
    .join("\n\n");

  const description = spec.description
    ? `<p className="${t["body-sm"]?.class} ${c["text-muted"]?.class}">${spec.description}</p>`
    : "";

  return `<div className="flex h-full w-full flex-col overflow-auto ${r.default?.class} border ${c["border-subtle"]?.class} ${c.surface?.class} ${sh.default?.class} ${s["space-lg"]?.class} ${c["text-main"]?.class}">
  <div className="space-y-1">
    <h3 className="${t.h2?.class} ${c["text-main"]?.class}">${spec.title}</h3>
    ${description}
  </div>
  <Form {...${identifiers.formVarName}}>
    <form onSubmit={${identifiers.formVarName}.handleSubmit(${identifiers.submitHandlerName})} className="flex h-full flex-col space-y-6">
      <div className="flex-1 space-y-4 overflow-auto">
${indent(fieldBlocks, 8)}
      </div>
      <Button type="submit" className="w-full ${r.default?.class} ${c.primary?.class} ${t["body-sm"]?.class} font-semibold text-white ${sh.default?.class} transition hover:-translate-y-0.5 hover:${sh.default?.class}">
        ${spec.submitLabel}
      </Button>
    </form>
  </Form>
</div>`;
}

function buildFieldBlock(
  field: FormFieldSpec,
  formVarName: string,
  tokens: GeneratedTokens
): string {
  const c = tokens.color;
  const t = tokens.typography;
  const r = tokens.radius;
  const s = tokens.spacing;
  const nameAccessor = `${formVarName}.control`;

  if (field.type === "checkbox") {
    const description = field.description
      ? `<FormDescription className="${t["body-sm"]?.class} ${c["text-muted"]?.class}">${field.description}</FormDescription>`
      : "";

    return `<FormField
  control={${nameAccessor}}
  name="${field.name}"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start gap-3 rounded-md border ${c["border-subtle"]?.class} ${c["surface-alt"]?.class} ${s["space-sm"]?.class}">
      <FormControl>
        <Checkbox
          checked={Boolean(field.value)}
          onCheckedChange={(checked) => field.onChange(checked === true)}
          className="border ${c["border-subtle"]?.class} ${c.surface?.class} ${r.default?.class}"
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className="${t["body-sm"]?.class} ${c["text-main"]?.class}">${field.label}</FormLabel>
        ${description}
      </div>
      <FormMessage className="${t["body-sm"]?.class}" />
    </FormItem>
  )}
/>`;
  }

  const controlElement =
    field.type === "textarea"
      ? `<Textarea className="${r.default?.class} border ${c["border-subtle"]?.class} ${c.surface?.class} ${c["text-main"]?.class} ${t.body?.class}" placeholder="${field.placeholder ?? ""}" {...field} />`
      : `<Input className="${r.default?.class} border ${c["border-subtle"]?.class} ${c.surface?.class} ${c["text-main"]?.class} ${t.body?.class}" type="${mapFieldTypeToInput(field.type)}" placeholder="${field.placeholder ?? ""}" {...field} />`;

  const description = field.description
    ? `<FormDescription className="${t["body-sm"]?.class} ${c["text-muted"]?.class}">${field.description}</FormDescription>`
    : "";

  return `<FormField
  control={${nameAccessor}}
  name="${field.name}"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="${t["body-sm"]?.class} ${c["text-main"]?.class}">${field.label}</FormLabel>
      <FormControl>
        ${controlElement}
      </FormControl>
      ${description}
      <FormMessage className="${t["body-sm"]?.class}" />
    </FormItem>
  )}
/>`;
}

function mapFieldTypeToInput(type: FormFieldType): string {
  switch (type) {
    case "email":
      return "email";
    case "password":
      return "password";
    default:
      return "text";
  }
}

function formatDefaultValue(field: FormFieldSpec): string {
  if (typeof field.defaultValue !== "undefined") {
    if (field.type === "checkbox") {
      return field.defaultValue ? "true" : "false";
    }

    return `"${escapeQuotes(String(field.defaultValue))}"`;
  }

  return field.type === "checkbox" ? "false" : `""`;
}

function escapeQuotes(value: string): string {
  return value.replace(/"/g, '\\"');
}

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
}
