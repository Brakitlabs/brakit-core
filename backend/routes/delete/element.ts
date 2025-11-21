import { Request, Response } from "express";
import { logger } from "../../utils/logger";
import { VisualDeleteService } from "../../services/delete/visualDelete";
import { DeletePayload, DeleteResult } from "../../types/delete";
import config from "../../config";
import { actionHistory } from "../../services/history";

// Type aliases for API layer
type DeleteElementPayload = DeletePayload;
type DeleteElementResponse = DeleteResult;

// Singleton service instance
const deleteService = new VisualDeleteService(config.project.root);

/**
 * Delete an element from the source code
 */
export const deleteElement = async (
  req: Request<Record<string, never>, DeleteElementResponse, DeleteElementPayload>,
  res: Response<DeleteElementResponse>
) => {
  try {
    const {
      sourceFile,
      componentName,
      elementIdentifier,
      elementTag,
      className,
      textContent,
      ownerComponentName,
      ownerFilePath,
    } = req.body;

    logger.info(
      `[Delete] Delete request received: ${sourceFile}, ${componentName}, ${elementIdentifier}`
    );

    // Validate required fields
    if (!sourceFile || !componentName || !elementIdentifier) {
      const error =
        "Missing required fields: sourceFile, componentName, or elementIdentifier";
      logger.warn(`[Delete] Validation failed: ${error}`);
      return res.status(400).json({
        success: false,
        error,
      });
    }

    const result = await actionHistory.runAction(
      {
        type: "delete-element",
        label: `Delete ${componentName} in ${sourceFile}`,
        details: {
          sourceFile,
          componentName,
          elementIdentifier,
        },
      },
      () =>
        deleteService.deleteElement({
          sourceFile,
          componentName,
          elementIdentifier,
          elementTag,
          className,
          textContent,
          ownerComponentName,
          ownerFilePath,
        })
    );

    if (result.success) {
      logger.info(`[Delete] Element deleted successfully: ${result.message}`);
      res.json({
        ...result,
      });
    } else {
      logger.error(`[Delete] Delete failed: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error(`[Delete] Delete error: ${error}`);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown delete error",
    });
  }
};
