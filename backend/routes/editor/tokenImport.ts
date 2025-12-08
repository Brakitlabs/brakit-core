import { Router, Request, Response } from "express";
import { TokenImportService, ImportTokensRequest } from "../../services/tokenImport/TokenImportService";
import { tokenService } from "../../services/shared/tokens";
import { logger } from "../../utils/logger";
import fs from "fs/promises";
import path from "path";

const router = Router();
const importService = new TokenImportService();

/** Constants */
const BRAKIT_DIR_NAME = ".brakit";
const TOKENS_FILE_NAME = "brakit.tokens.json";

/**
 * Shared token import logic - validates and processes token import requests
 */
async function validateAndImportTokens(req: Request): Promise<
  | { success: true; result: Awaited<ReturnType<typeof importService.importTokens>> }
  | { success: false; status: number; body: Record<string, unknown> }
> {
  const { source, tokens } = req.body as ImportTokensRequest;

  if (!tokens) {
    return {
      success: false,
      status: 400,
      body: {
        success: false,
        error: "Missing tokens in request body",
        code: "MISSING_TOKENS",
      },
    };
  }

  logger.info({
    message: "Processing token import",
    context: { source: source || "auto" },
  });

  const result = await importService.importTokens({
    tokens,
    source: source || "auto",
  });

  if (!result.success) {
    return {
      success: false,
      status: 400,
      body: {
        success: false,
        error: "Token import failed",
        code: "IMPORT_FAILED",
        warnings: result.warnings,
      },
    };
  }

  return { success: true, result };
}

/**
 * POST /api/editor/tokens/import
 * Import design tokens from external sources (Figma, Style Dictionary, etc.)
 *
 * Request body:
 * {
 *   "source": "figma" | "style-dictionary" | "w3c" | "auto",
 *   "tokens": { ... raw token JSON ... }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "tokensImported": 42,
 *   "mappings": [
 *     { "original": "primary-100", "sanitized": "primary100", "category": "color" }
 *   ],
 *   "warnings": [],
 *   "tokens": { ... W3C format tokens ... },
 *   "resolved": { ... resolved Tailwind classes ... }
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const importResult = await validateAndImportTokens(req);

    if (!importResult.success) {
      return res.status(importResult.status).json(importResult.body);
    }

    const { result } = importResult;

    // Get project root from environment or use cwd
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();
    const brakitDir = path.join(projectRoot, BRAKIT_DIR_NAME);
    const tokensFile = path.join(brakitDir, TOKENS_FILE_NAME);

    // Ensure .brakit directory exists
    await fs.mkdir(brakitDir, { recursive: true });

    // Write imported tokens to file
    await fs.writeFile(
      tokensFile,
      JSON.stringify(result.tokens, null, 2),
      "utf-8"
    );

    logger.info({
      message: "Tokens imported and saved",
      context: {
        tokensImported: result.tokensImported,
        mappingsCount: result.mappings.length,
      },
    });

    // Reload tokens in the service and generate code
    // Use skipDefaults to completely replace defaults with imported tokens
    tokenService.loadTokens(result.tokens, { skipDefaults: true });

    // Get generated tokens for response
    const generated = tokenService.getGeneratedTokens();

    res.json({
      success: true,
      tokensImported: result.tokensImported,
      mappings: result.mappings,
      warnings: result.warnings,
      tokens: result.tokens,
      resolved: generated, // Frontend expects 'resolved'
    });
  } catch (error) {
    logger.error({
      message: "Error importing tokens",
      context: { error },
    });

    res.status(500).json({
      success: false,
      error: "Failed to import design tokens",
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/editor/tokens/import/preview
 * Preview token import without saving
 *
 * Request body: same as /import
 *
 * Response: same as /import but without saving to disk
 */
router.post("/preview", async (req: Request, res: Response) => {
  try {
    const importResult = await validateAndImportTokens(req);

    if (!importResult.success) {
      return res.status(importResult.status).json(importResult.body);
    }

    const { result } = importResult;

    res.json({
      success: true,
      tokensImported: result.tokensImported,
      mappings: result.mappings,
      warnings: result.warnings,
      preview: result.tokens,
    });
  } catch (error) {
    logger.error({
      message: "Error previewing token import",
      context: { error },
    });

    res.status(500).json({
      success: false,
      error: "Failed to preview token import",
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
