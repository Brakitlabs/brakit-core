import rawFormSpecs from "../../../shared/formSpecs.json";

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

export const FORM_SPECS: readonly FormSpec[] = (rawFormSpecs as FormSpec[]).map(
  (spec) => ({ ...spec })
);

export function getFormSpec(id: string): FormSpec | undefined {
  return FORM_SPECS.find((spec) => spec.id === id);
}

export function buildFormPreview(spec: FormSpec): string {
  const fieldMarkup = spec.fields
    .map((field) => {
      switch (field.type) {
        case "textarea":
          return `<div className="space-y-2"><label className="text-sm font-medium leading-none">${field.label}</label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="${field.placeholder ?? ""}"></textarea></div>`;
        case "checkbox":
          return `<div className="flex items-start space-x-3 rounded-md border border-dashed border-border bg-muted/30 p-3"><div className="mt-1 h-4 w-4 rounded-sm border border-primary bg-background"></div><div className="space-y-1"><p className="text-sm font-medium leading-none">${field.label}</p>${field.description ? `<p className="text-xs text-muted-foreground">${field.description}</p>` : ""}</div></div>`;
        default:
          return `<div className="space-y-2"><label className="text-sm font-medium leading-none">${field.label}</label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="${field.placeholder ?? ""}" /></div>`;
      }
    })
    .join("");

  return `<div className="h-full w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex flex-col space-y-4"><div className="space-y-1"><h3 className="text-2xl font-semibold tracking-tight">${spec.title}</h3>${spec.description ? `<p className="text-sm text-muted-foreground">${spec.description}</p>` : ""}</div><div className="space-y-3">${fieldMarkup}</div><button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">${spec.submitLabel}</button></div>`;
}


