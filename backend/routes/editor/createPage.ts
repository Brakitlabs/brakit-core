import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { detectFramework, FrameworkInfo } from "../../utils/detectFramework";
import { selectTemplate } from "../../templates";
import type { TemplateMetadata } from "../../templates/types";
import { actionHistory } from "../../services/history";
import {
  ensurePackagesInstalled,
  FORM_DEPENDENCIES,
} from "../../services/shared/dependencyInstaller";
import { ShadcnService } from "../../services/shadcn/shadcnService";

const router = express.Router();

interface CreatePageRequestBody {
  folder?: string;
  name?: string;
  layout?: string;
}

class ValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

router.post("/", async (req, res) => {
  try {
    const { folder, name, layout } = parseBody(
      req.body as CreatePageRequestBody
    );

    const info = detectFramework();
    const projectRoot = process.cwd();

    const target = resolveTargetPaths(projectRoot, info, folder, name);
    if (!target) {
      throw new ValidationError(
        "Unable to determine destination folder for this project."
      );
    }

    ensureWithinProject(projectRoot, target.directory);
    ensureWithinProject(projectRoot, target.filePath);

    if (await pathExists(target.filePath)) {
      return res.status(409).json({
        success: false,
        error: "A page already exists at the chosen location.",
        filePath: path.relative(projectRoot, target.filePath),
      });
    }

    const responseBody = await actionHistory.runAction(
      {
        type: "create-page",
        label: `Create page ${name.original}`,
        details: {
          folder,
          layout,
        },
      },
      async () => {
        await fs.mkdir(target.directory, { recursive: true });

        const template = selectTemplate(info, layout);
        const result = template({
          pageName: name.original,
          slug: name.slug,
          componentName: name.component,
          hasTailwind: info.hasTailwind,
        });

        const progressMessages = await installTemplateDependencies(
          projectRoot,
          result.metadata
        );

        await fs.writeFile(target.filePath, result.code, "utf-8");
        actionHistory.recordFileChange(target.filePath, null, result.code, {
          existedBefore: false,
          existedAfter: true,
        });

        return {
          success: true,
          filePath: path.relative(projectRoot, target.filePath),
          directory: path.relative(projectRoot, target.directory),
          framework: info.framework,
          router: info.router,
          progressMessages,
        };
      }
    );

    res.json(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      error instanceof ValidationError && error.status
        ? error.status
        : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;

function parseBody(body: CreatePageRequestBody) {
  const folderInput = typeof body.folder === "string" ? body.folder.trim() : "";
  const nameInput = typeof body.name === "string" ? body.name.trim() : "";
  const layoutInput = typeof body.layout === "string" ? body.layout.trim() : "";

  if (!nameInput) {
    throw new ValidationError("Page name is required");
  }
  if (!layoutInput) {
    throw new ValidationError("Layout must be selected");
  }

  const slug = slugify(nameInput);
  const component = toPascalCase(slug);

  return {
    folder: sanitizeFolder(folderInput),
    name: {
      original: nameInput,
      slug,
      component,
    },
    layout: layoutInput,
  };
}

async function installTemplateDependencies(
  projectRoot: string,
  metadata?: TemplateMetadata
): Promise<string[]> {
  const messages: string[] = [];
  if (!metadata) {
    return messages;
  }

  const pushMessage = (message: string) => {
    messages.push(message);
  };

  if (metadata.requiresFormDependencies) {
    await ensurePackagesInstalled(projectRoot, FORM_DEPENDENCIES, {
      label: "form dependencies",
      onProgress: pushMessage,
    });
  }

  const shadcnComponents = metadata.requiredShadcnComponents ?? [];
  if (shadcnComponents.length > 0) {
    const shadcnService = new ShadcnService(projectRoot);
    pushMessage("🔍 Checking ShadCN installation...");
    const seen = new Set<string>();

    for (const componentType of shadcnComponents) {
      if (seen.has(componentType)) {
        continue;
      }
      seen.add(componentType);
      const displayName =
        shadcnService.getComponentDisplayName(componentType);
      pushMessage(`📦 Ensuring ${displayName} components are ready...`);
      await shadcnService.ensureComponentsForType(componentType, (progress) => {
        pushMessage(progress.message);
      });
    }
  }

  return messages;
}

function resolveTargetPaths(
  projectRoot: string,
  info: FrameworkInfo,
  folder: string | null,
  name: { slug: string; component: string; original: string }
) {
  const effectiveFolder = resolveEffectiveFolder(info, folder);
  if (!effectiveFolder) {
    return null;
  }

  const absoluteFolder = path.join(projectRoot, effectiveFolder);

  if (info.framework === "next" && info.router === "app") {
    // For Next.js App Router, create the route directly in the folder
    // This avoids nested folder structure like test/PageTest/page.tsx
    return {
      directory: absoluteFolder,
      filePath: path.join(absoluteFolder, "page.tsx"),
    };
  }

  const fileName = `${name.slug || "page"}.tsx`;
  return {
    directory: absoluteFolder,
    filePath: path.join(absoluteFolder, fileName),
  };
}

function resolveEffectiveFolder(
  info: FrameworkInfo,
  folder: string | null
): string | null {
  const cleaned = folder && folder.length > 0 ? folder : null;
  const normalizedFolder = cleaned ? normalizeFolder(cleaned) : null;

  const roots = info.pageRoots.length
    ? info.pageRoots
    : guessFallbackRoots(info);
  if (!roots.length) {
    return normalizedFolder;
  }

  if (normalizedFolder) {
    if (
      roots.some(
        (root) =>
          normalizedFolder === root || normalizedFolder.startsWith(`${root}/`)
      )
    ) {
      return normalizedFolder;
    }
    return `${roots[0]}/${normalizedFolder}`.replace(/\/\/+/g, "/");
  }

  return roots[0];
}

function guessFallbackRoots(info: FrameworkInfo): string[] {
  if (info.framework === "next") {
    return info.router === "app" ? ["app", "src/app"] : ["pages", "src/pages"];
  }
  return ["src/pages", "src/routes", "pages"].filter(Boolean);
}

function sanitizeFolder(input: string): string | null {
  const parts = input
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.some((part) => part === "." || part === "..")) {
    throw new ValidationError("Folder path contains invalid segments");
  }

  if (!parts.length) {
    return null;
  }

  return parts.join("/");
}

function normalizeFolder(input: string): string {
  return input
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function slugify(value: string): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return result || "new-page";
}

function toPascalCase(slug: string): string {
  return slug
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function ensureWithinProject(projectRoot: string, targetPath: string) {
  const normalizedRoot = path.resolve(projectRoot);
  const normalizedTarget = path.resolve(targetPath);
  const rootWithSep = normalizedRoot.endsWith(path.sep)
    ? normalizedRoot
    : `${normalizedRoot}${path.sep}`;

  if (
    normalizedTarget !== normalizedRoot &&
    !normalizedTarget.startsWith(rootWithSep)
  ) {
    throw new ValidationError("Folder path escapes the project directory");
  }
}
