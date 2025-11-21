import { Router } from "express";
import config from "../../config";
import { FontSizeUpdateService } from "../../services/updates/fontSizeUpdate";
import { createUpdateRouteHandler } from "../shared/routeHelpers";
import type { FontSizeUpdatePayload } from "../../services/updates/fontSizeUpdate";

const router = Router();
const fontSizeUpdateService = new FontSizeUpdateService(
  config.project.root
);

router.post(
  "/",
  createUpdateRouteHandler<FontSizeUpdatePayload>(
    {
      serviceName: "FontSizeUpdate",
      requiredFields: [
        "oldSize",
        "newSize",
        "text",
        "tag",
        "file",
        "className",
      ],
      optionalFields: [
        "forceGlobal",
        "elementTag",
        "textContent",
        "ownerComponentName",
        "ownerFilePath",
      ],
    },
    (payload) => fontSizeUpdateService.updateFontSize(payload)
  )
);

export default router;
