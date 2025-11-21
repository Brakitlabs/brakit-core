import { Router } from "express";
import config from "../../config";
import { ColorUpdateService } from "../../services/updates/colorUpdate";
import {
  createUpdateRouteHandler,
  validateColorPayload,
} from "../shared/routeHelpers";
import type { ColorUpdatePayload } from "../../services/updates/colorUpdate";

const router = Router();
const colorUpdateService = new ColorUpdateService(config.project.root);

router.post(
  "/",
  createUpdateRouteHandler<ColorUpdatePayload>(
    {
      serviceName: "ColorUpdate",
      requiredFields: ["text", "tag", "file", "className"],
      optionalFields: [
        "textColor",
        "backgroundColor",
        "hoverBackgroundColor",
        "forceGlobal",
        "elementTag",
        "textContent",
        "ownerComponentName",
        "ownerFilePath",
      ],
    },
    async (payload) => {
      // Additional validation for color-specific requirements
      const colorError = validateColorPayload(payload);
      if (colorError) {
        return {
          success: false,
          error: colorError,
        };
      }
      return colorUpdateService.updateColor(payload);
    }
  )
);

export default router;
