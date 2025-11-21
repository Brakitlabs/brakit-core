export interface DeletePayload {
  sourceFile: string;
  componentName: string;
  elementIdentifier: string;
  elementTag?: string;
  className?: string;
  textContent?: string;
  ownerComponentName?: string;
  ownerFilePath?: string;
}

export interface DeleteResult {
  success: boolean;
  message?: string;
  error?: string;
  filePath?: string;
  previousContent?: string;
  matchKind?: "local" | "component" | "usage" | "data";
  updatedFile?: string;
}
