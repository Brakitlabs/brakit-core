import type { BrakitOverlayApp } from "../overlay";
import type { OverlayController } from "../core/overlayController";
import type { BackendClient } from "../services/backendClient";
import type { ElementPayloadService } from "../payload/ElementPayloadService";
import type { TokenManager, ResolvedTokens } from "../core/managers/tokenManager";
import type { ReactSourceInfo } from "../utils/reactSource";

export type PluginInitializer = (context: OverlayPluginContext) => void | (() => void);

export interface OverlayPluginContext {
  app: BrakitOverlayApp;
  document: Document;
  backend: BackendClient;
  controller: OverlayController;
  payloadService: ElementPayloadService;
  tokenManager: TokenManager;
  tokens: ResolvedTokens | null;
  /** Get React source info (fileName, lineNumber) for an element */
  getReactSourceInfo: (element: HTMLElement) => ReactSourceInfo;
}

declare global {
  interface Window {
    brakitOverlay?: BrakitOverlayApp;
    __brakitPluginQueue?: PluginInitializer[];
    registerBrakitPlugin?: (initializer: PluginInitializer) => void;
  }
}
