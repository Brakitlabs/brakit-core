import { Request, Response } from "express";
import { logger } from "../../utils/logger";
import { BaseUpdateResult } from "../../services/shared/types";
import { actionHistory } from "../../services/history";

export interface RouteConfig {
  serviceName: string;
  requiredFields: string[];
  optionalFields?: string[];
}

export function createUpdateRouteHandler<TPayload extends Record<string, any>>(
  config: RouteConfig,
  serviceMethod: (payload: TPayload) => Promise<BaseUpdateResult>
) {
  return async (req: Request, res: Response) => {
    try {
      const payload = extractPayload<TPayload>(req.body, config);
      const missingFields = validateRequiredFields(
        payload,
        config.requiredFields
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      logger.info(
        `[${config.serviceName}] Processing request for <${payload.tag}> in ${payload.file} (forceGlobal=${payload.forceGlobal === true})`
      );

      const fileLabel =
        typeof (payload as Record<string, unknown>).file === "string"
          ? ((payload as Record<string, unknown>).file as string)
          : "unknown file";
      const tagLabel =
        typeof (payload as Record<string, unknown>).tag === "string"
          ? `<${(payload as Record<string, unknown>).tag as string}>`
          : "selection";

      const result = await actionHistory.runAction(
        {
          type: config.serviceName,
          label: `${config.serviceName}: ${tagLabel} in ${fileLabel}`,
          details: { file: fileLabel, tag: tagLabel },
        },
        () => serviceMethod(payload)
      );

      if (result.warning) {
        logger.info(
          `[${config.serviceName}] Smart edit warning returned for ${payload.file}`
        );
        return res.status(200).json(result);
      }

      if (result.success) {
        logger.info(
          `[${config.serviceName}] Update applied successfully for ${payload.file}`
        );
        res.json(result);
      } else {
        logger.info(
          `[${config.serviceName}] Update failed for ${payload.file}: ${result.error ?? "unknown error"}`
        );
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error(
        `${config.serviceName} error: ${error instanceof Error ? error.message : String(error)}`
      );
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

function extractPayload<T extends Record<string, any>>(
  body: any,
  config: RouteConfig
): T {
  const allFields = [
    ...config.requiredFields,
    ...(config.optionalFields || []),
  ];
  const payload: any = {};

  for (const field of allFields) {
    if (field in body) {
      payload[field] = body[field];
    }
  }

  return payload as T;
}

function validateRequiredFields(
  payload: Record<string, any>,
  requiredFields: string[]
): string[] {
  return requiredFields.filter((field) => !payload[field]);
}

export function validateColorPayload(payload: {
  textColor?: any;
  backgroundColor?: any;
  hoverBackgroundColor?: any;
}): string | null {
  if (
    !payload.textColor &&
    !payload.backgroundColor &&
    !payload.hoverBackgroundColor
  ) {
    return "At least one color field must be provided";
  }
  return null;
}
