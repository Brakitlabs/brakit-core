import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import config from "./config";
import healthRouter from "./routes/health";
import updateTextRouter from "./routes/updates/text";
import updateFontSizeRouter from "./routes/updates/fontSize";
import updateFontFamilyRouter from "./routes/updates/fontFamily";
import updateColorRouter from "./routes/updates/color";
import contextRouter from "./routes/editor/context";
import foldersRouter from "./routes/editor/folders";
import createPageRouter from "./routes/editor/createPage";
import { deleteElement } from "./routes/delete/element";
import historyRouter from "./routes/history";
import { logger } from "./utils/logger";

function validateConfiguration() {
  const validation = config.validateConfig();
  if (!validation.valid) {
    validation.errors.forEach((error) =>
      logger.error({ message: "Configuration error", context: { error } })
    );

    if (config.server.isProduction) {
      logger.error(
        "Invalid configuration detected in production environment. Exiting."
      );
      process.exit(1);
    }

    logger.warn(
      "Configuration validation failed; continuing because environment is not production."
    );
  }
}

validateConfiguration();

const app = express();
const proBundlePath = process.env.BRAKIT_PRO_BUNDLE_PATH;

app.use(bodyParser.json());

app.use(
  cors({
    origin:
      config.cors.origins === undefined
        ? (origin, callback) => {
            if (
              !origin ||
              /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
            ) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          }
        : config.cors.origins.length > 0
          ? config.cors.origins
          : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/brakit-overlay.js", (req, res) => {
  const overlayPath = path.join(
    __dirname,
    "../../overlay/dist/overlay.iife.js"
  );
  if (fs.existsSync(overlayPath)) {
    res.sendFile(overlayPath);
  } else {
    res.status(404).send("Overlay not found. Please build the overlay first.");
  }
});

const projectPath = process.env.BRAKIT_PROJECT_PATH || process.cwd();
import PluginManager from "./plugins/pluginManager";
const pluginManager = new PluginManager(projectPath);

app.get("/plugins/:pluginName.js", (req, res) => {
  const { pluginName } = req.params;
  const content = pluginManager.getPluginContent(pluginName);

  if (!content) {
    logger.warn({
      message: "Plugin requested but not found",
      context: { pluginName },
    });
    res.status(404).send("Plugin not found.");
    return;
  }

  logger.info({ message: "Serving Plugin", context: { pluginName } });
  res.setHeader("Content-Type", "application/javascript");
  res.send(content);
});

app.use("/api/health", healthRouter);
app.use("/api/editor/context", contextRouter);
app.use("/api/editor/folders", foldersRouter);
app.use("/api/editor/create", createPageRouter);
app.use("/api/update-text", updateTextRouter);
app.use("/api/update-font-size", updateFontSizeRouter);
app.use("/api/update-font-family", updateFontFamilyRouter);
app.use("/api/update-color", updateColorRouter);
app.use("/api/delete-element", deleteElement);
app.use("/api/history", historyRouter);

app.listen(config.server.port, config.server.host, () => {
  config.logConfig();
});
