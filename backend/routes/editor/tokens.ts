import { Router, Request, Response } from "express";
import { tokenService } from "../../services/shared/tokens";
import type { BrakitDesignTokens } from "../../services/shared/tokens";
import { BrakitDesignTokensSchema } from "../../services/shared/tokens/validation";
import { TokenValidationError } from "../../services/shared/tokens/errors";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { logger } from "../../utils/logger";

const router = Router();

router.get("/defaults", (_req: Request, res: Response) => {
  try {
    const tokens = tokenService.getDefaultTokens();
    const resolved = tokenService.getDefaultResolvedTokens();

    res.json({
      success: true,
      tokens,
      resolved,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching default tokens",
      context: { error },
    });
    res.status(500).json({ error: "Failed to fetch default design tokens" });
  }
});

/**
 * GET /api/editor/tokens
 * Returns both raw W3C tokens and resolved Tailwind classes
 */
router.get("/", (_req: Request, res: Response) => {
  try {
    // Always reload from disk so manual edits are picked up
    tokenService.refreshFromDisk();
    const tokens = tokenService.getRawTokens();
    const resolved = tokenService.getResolvedTokens();

    res.json({
      success: true,
      tokens,
      resolved,
    });
  } catch (error) {
    logger.error({
      message: "Error fetching tokens",
      context: { error },
    });
    res.status(500).json({ error: "Failed to fetch design tokens" });
  }
});

/**
 * POST /api/editor/tokens
 * Saves design tokens to .brakit/brakit.tokens.json
 * Validates tokens against schema before saving
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { tokens } = req.body;

    if (!tokens) {
      return res.status(400).json({
        error: "Missing tokens in request body",
        code: "MISSING_TOKENS",
      });
    }

    // Validate tokens against schema
    let validatedTokens;
    try {
      validatedTokens = BrakitDesignTokensSchema.parse(tokens);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid token format",
          code: "VALIDATION_ERROR",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
      }
      throw error;
    }

    // Get project root from environment or use cwd
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const brakitDir = path.join(projectRoot, ".brakit");
    const tokensFile = path.join(brakitDir, "brakit.tokens.json");

    // Ensure .brakit directory exists
    await fs.mkdir(brakitDir, { recursive: true });

    // Write tokens to file
    await fs.writeFile(
      tokensFile,
      JSON.stringify(validatedTokens, null, 2),
      "utf-8"
    );

    // Reload tokens in the service
    tokenService.loadTokens(validatedTokens as any as BrakitDesignTokens);

    // Return updated tokens
    const resolved = tokenService.getResolvedTokens();

    res.json({
      success: true,
      message: "Design tokens saved successfully",
      tokens: validatedTokens,
      resolved,
    });
  } catch (error) {
    logger.error({
      message: "Error saving tokens",
      context: { error },
    });

    // Provide more specific error messages
    if (error instanceof TokenValidationError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    res.status(500).json({
      error: "Failed to save design tokens",
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
