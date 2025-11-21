import { Router, Request, Response } from "express";
import { actionHistory } from "../../services/history";
import { logger } from "../../utils/logger";

const router = Router();

export async function handleUndoRequest(req: Request, res: Response) {
  try {
    const result = await actionHistory.undoLastAction();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error ?? "No action available to undo",
      });
    }

    return res.json({
      success: true,
      restoredFiles: result.restoredFiles,
      action: result.action,
    });
  } catch (error) {
    logger.error({
      message: "[History] Undo request failed",
      context: { error: error instanceof Error ? error.message : String(error) },
    });

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to undo changes",
    });
  }
}

router.get("/status", (_req, res) => {
  const summary = actionHistory.getLastActionSummary();

  res.json({
    success: true,
    hasAction: Boolean(summary),
    action: summary,
  });
});

router.post("/undo", handleUndoRequest);

export default router;
