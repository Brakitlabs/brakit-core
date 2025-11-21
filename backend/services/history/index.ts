import config from "../../config";
import { ActionHistory } from "./actionHistory";

export const actionHistory = new ActionHistory(config.project.root);

export type { ActionMetadata, UndoResult } from "./actionHistory";
