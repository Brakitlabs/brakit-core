import { Router } from "express";
import config from "../../config";
import { TextUpdateService } from "../../services/updates/textUpdate";
import { createUpdateRouteHandler } from "../shared/routeHelpers";
import type { TextUpdatePayload } from "../../services/updates/textUpdate";

const router = Router();
const textUpdateService = new TextUpdateService(config.project.root);

router.post(
  "/",
  createUpdateRouteHandler<TextUpdatePayload>(
    {
      serviceName: "TextUpdate",
      requiredFields: ["oldText", "newText", "tag", "file", "className"],
      optionalFields: [
        "forceGlobal",
        "elementTag",
        "textContent",
        "ownerComponentName",
        "ownerFilePath",
      ],
    },
    (payload) => textUpdateService.updateText(payload)
  )
);

export default router;
