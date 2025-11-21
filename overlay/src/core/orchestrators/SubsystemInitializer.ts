import { BackendClient } from "../../services/backendClient";
import { ModalManager } from "../managers/modalManager";
import { ToolManager } from "../managers/toolManager";
import { EventManager } from "../managers/eventManager";
import { InstructionProcessor } from "../processors/instructionProcessor";
import { SpatialProcessor } from "../processors/spatialProcessor";
import { FontSizeTool, FontSizeUpdateData } from "../tools/fontSizeTool";
import { FontFamilyTool, FontFamilyUpdateData } from "../tools/fontFamilyTool";
import { DeleteTool } from "../tools/deleteTool";
import { ColorTool, ColorUpdateData } from "../tools/colorTool";
import { TextEditTool, TextUpdateData } from "../tools/textEditTool";
import { FloatingToolbar } from "../../components/FloatingToolbar";
import { SmartEditOrchestrator } from "./SmartEditOrchestrator";
import { UICoordinator } from "./UICoordinator";
import { DrawSelectionHandler } from "./DrawSelectionHandler";
import { ElementPayloadService } from "../../payload/ElementPayloadService";
import type { BoundingBox } from "../../spatial/types";
import { UndoManager } from "../managers/undoManager";

export interface SubsystemDependencies {
  document: Document;
  backend: BackendClient;
  modalManager: ModalManager;
}

export interface InitializedSubsystems {
  toolManager: ToolManager;
  eventManager: EventManager;
  instructionProcessor: InstructionProcessor;
  spatialProcessor: SpatialProcessor;
  floatingToolbar: FloatingToolbar;
  undoManager: UndoManager;
  smartEditOrchestrator: SmartEditOrchestrator;
  uiCoordinator: UICoordinator;
  payloadService: ElementPayloadService;
  drawSelectionHandler: DrawSelectionHandler;
}

/**
 * Initializes all subsystems with proper dependency injection
 * and circular dependency resolution
 */
export class SubsystemInitializer {
  static initialize(deps: SubsystemDependencies): InitializedSubsystems {
    const { document, backend, modalManager } = deps;

    const floatingToolbar = new FloatingToolbar(document);
    floatingToolbar.mount();

    const payloadService = new ElementPayloadService();
    const uiCoordinator = new UICoordinator();

    const spatialProcessor = new SpatialProcessor({
      onSpatialAnalysisRecorded: (analysis) => {},
    });

    const smartEditOrchestrator = new SmartEditOrchestrator(backend, {
      showToast: (message, type, duration) =>
        uiCoordinator.showToast(message, type, duration),
    });

    const toolManager = new ToolManager({
      document,
      payloadService,
      onTextUpdate: (data) => smartEditOrchestrator.handleTextUpdate(data),
      onFontSizeUpdate: (data) =>
        smartEditOrchestrator.handleFontSizeUpdate(data),
      onFontFamilyUpdate: (data) =>
        smartEditOrchestrator.handleFontFamilyUpdate(data),
      onColorUpdate: (data) => smartEditOrchestrator.handleColorUpdate(data),
      onDeleteElement: (data) =>
        smartEditOrchestrator.handleDeleteElement(data),
    });

    const eventManager = new EventManager({
      document,
      toolManager,
      modalManager,
      onBubbleClicked: () => {},
      onFixError: () => {},
      onModalUndo: async () => {},
      onToolChange: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { tool } = customEvent.detail;
        toolManager.setTool(tool);
      },
      onErrorRecorded: () => {},
    });

    const undoManager = new UndoManager({
      backend,
      onStateChange: (state) => floatingToolbar.setUndoState(state),
    });

    const instructionProcessor = new InstructionProcessor({
      toolManager,
      modalManager,
      backend,
      payloadService,
      undoManager,
      getBubbleAnchorPosition: () =>
        uiCoordinator.getBubbleAnchorPosition() || { x: 0, y: 0 },
      buildSpatialContext: ({ drawArea, instruction, action }) => {
        const bounds = drawArea?.bounds;
        if (!bounds) {
          return null;
        }
        const box: BoundingBox = {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height,
        };
        return spatialProcessor.buildSpatialContext(box, instruction, action, {
          includeDomFragment: true,
          includeCssSummary: true,
        });
      },
      clearDrawSelection: () => {}, // Will be set by controller
      removeSelection: () => {}, // Will be set by controller
      showToast: (message, type, duration, showUndo, onUndo) =>
        uiCoordinator.showToast(message, type, duration, showUndo, onUndo),
      onSubmissionStateChanged: () => {},
      onModalClosed: () => {},
      onErrorRecorded: () => {}, // Will be set by controller
    });

    const drawSelectionHandler = new DrawSelectionHandler(
      document,
      spatialProcessor,
      toolManager,
      uiCoordinator,
      instructionProcessor
    );

    void undoManager.bootstrap();

    return {
      toolManager,
      eventManager,
      instructionProcessor,
      spatialProcessor,
      floatingToolbar,
      undoManager,
      smartEditOrchestrator,
      uiCoordinator,
      payloadService,
      drawSelectionHandler,
    };
  }
}
