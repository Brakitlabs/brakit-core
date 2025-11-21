export interface CanvasComponent {
  id: string;
  type: string;
  template: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetSelector?: string;
}

export interface GenerateCanvasCodePayload {
  filePath: string;
  components: CanvasComponent[];
  containerWidth?: number;
  containerHeight?: number;
}

export interface InsertComponentPayload {
  filePath: string;
  componentTemplate: string;
  insertIndex: number;
  targetSelector?: string;
  componentType?: string;
}

export interface ValidationFailure {
  success: false;
  error: string;
  details?: string[];
}

export interface ValidationSuccess<T> {
  success: true;
  payload: T;
}

export type ValidationResult<T> = ValidationFailure | ValidationSuccess<T>;

export function validateGenerateCanvasCodePayload(
  body: unknown
): ValidationResult<GenerateCanvasCodePayload> {
  if (!isRecord(body)) {
    return failure("Request body must be an object");
  }

  const errors: string[] = [];

  const filePath = getString(body.filePath, "filePath", errors);
  if (!filePath) {
    errors.push("filePath is required");
  }

  if (!Array.isArray(body.components) || body.components.length === 0) {
    errors.push("components must be a non-empty array");
  }

  const components: CanvasComponent[] = [];
  if (Array.isArray(body.components)) {
    body.components.forEach((raw, index) => {
      const result = parseCanvasComponent(raw, index);
      if (result.component) {
        components.push(result.component);
      }
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    });
  }

  const containerWidth = getOptionalNumber(
    body.containerWidth,
    "containerWidth",
    errors
  );
  const containerHeight = getOptionalNumber(
    body.containerHeight,
    "containerHeight",
    errors
  );

  if (errors.length > 0) {
    return failure(formatErrors(errors), errors);
  }

  return success({
    filePath,
    components,
    containerWidth,
    containerHeight,
  });
}

export function validateInsertComponentPayload(
  body: unknown
): ValidationResult<InsertComponentPayload> {
  if (!isRecord(body)) {
    return failure("Request body must be an object");
  }

  const errors: string[] = [];

  const filePath = getString(body.filePath, "filePath", errors);
  if (!filePath) {
    errors.push("filePath is required");
  }

  const componentTemplate = getString(
    body.componentTemplate,
    "componentTemplate",
    errors
  );
  if (!componentTemplate) {
    errors.push("componentTemplate is required");
  }

  const insertIndexNumber = getNumber(body.insertIndex, "insertIndex", errors);
  const insertIndex = insertIndexNumber !== undefined
    ? Math.max(0, Math.floor(insertIndexNumber))
    : 0;

  const targetSelector = getOptionalString(
    body.targetSelector,
    "targetSelector",
    errors
  );
  const componentType = getOptionalString(
    body.componentType,
    "componentType",
    errors
  );

  if (errors.length > 0) {
    return failure(formatErrors(errors), errors);
  }

  return success({
    filePath,
    componentTemplate,
    insertIndex,
    targetSelector,
    componentType: componentType ?? undefined,
  });
}

function parseCanvasComponent(
  value: unknown,
  index: number
): { component?: CanvasComponent; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(value)) {
    errors.push(`components[${index}] must be an object`);
    return { errors };
  }

  const id = getString(value.id, `components[${index}].id`, errors);
  const type = getString(value.type, `components[${index}].type`, errors);
  const template = getString(
    value.template,
    `components[${index}].template`,
    errors
  );

  const x = getNumber(value.x, `components[${index}].x`, errors);
  const y = getNumber(value.y, `components[${index}].y`, errors);
  const width = getNumber(value.width, `components[${index}].width`, errors);
  const height = getNumber(value.height, `components[${index}].height`, errors);
  const targetSelector = getOptionalString(
    value.targetSelector,
    `components[${index}].targetSelector`,
    errors
  );

  if (width !== undefined && width <= 0) {
    errors.push(`components[${index}].width must be greater than 0`);
  }
  if (height !== undefined && height <= 0) {
    errors.push(`components[${index}].height must be greater than 0`);
  }

  if (
    id &&
    type &&
    template &&
    x !== undefined &&
    y !== undefined &&
    width !== undefined &&
    height !== undefined &&
    errors.length === 0
  ) {
    return {
      component: {
        id,
        type,
        template,
        x,
        y,
        width,
        height,
        targetSelector,
      },
      errors,
    };
  }

  return { errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  errors.push(`${fieldName} must be a non-empty string`);
  return "";
}

function getOptionalString(
  value: unknown,
  fieldName: string,
  errors: string[]
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
    return undefined;
  }
  errors.push(`${fieldName} must be a string if provided`);
  return undefined;
}

function getNumber(
  value: unknown,
  fieldName: string,
  errors: string[]
): number | undefined {
  const coerced = coerceNumber(value);
  if (coerced === undefined) {
    errors.push(`${fieldName} must be a finite number`);
    return undefined;
  }
  return coerced;
}

function getOptionalNumber(
  value: unknown,
  fieldName: string,
  errors: string[]
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const coerced = coerceNumber(value);
  if (coerced === undefined) {
    errors.push(`${fieldName} must be a finite number if provided`);
  }
  return coerced;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function success<T>(payload: T): ValidationSuccess<T> {
  return { success: true, payload };
}

function failure(error: string, details?: string[]): ValidationFailure {
  return { success: false, error, details };
}

function formatErrors(errors: string[]): string {
  return Array.from(new Set(errors)).join("; ");
}
