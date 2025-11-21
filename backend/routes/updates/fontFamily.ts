import { Router } from "express";
import config from "../../config";
import { FontFamilyUpdateService } from "../../services/updates/fontFamilyUpdate";
import { createUpdateRouteHandler } from "../shared/routeHelpers";
import type { FontFamilyUpdatePayload } from "../../services/updates/fontFamilyUpdate";

const router = Router();
const fontFamilyUpdateService = new FontFamilyUpdateService(
  config.project.root
);

router.post(
  "/",
  createUpdateRouteHandler<FontFamilyUpdatePayload>(
    {
      serviceName: "FontFamilyUpdate",
      requiredFields: ["newFont", "text", "tag", "file", "className"],
      optionalFields: [
        "oldFont",
        "forceGlobal",
        "elementTag",
        "textContent",
        "ownerComponentName",
        "ownerFilePath",
      ],
    },
    (payload) => fontFamilyUpdateService.updateFontFamily(payload)
  )
);

export default router;
