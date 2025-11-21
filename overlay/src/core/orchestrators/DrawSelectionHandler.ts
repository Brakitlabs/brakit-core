
import { logger } from "../../utils/logger";
import { DrawSelectionResult } from "../draw/drawContext";
import { SpatialProcessor } from "../processors/spatialProcessor";
import { ToolManager } from "../managers/toolManager";
import type { SpatialMapPayload, BoundingBox } from "../../spatial/types";
import { InstructionProcessor } from "../processors/instructionProcessor";
import { UICoordinator } from "./UICoordinator";

export class DrawSelectionHandler {
  private readonly document: Document;
  private readonly spatialProcessor: SpatialProcessor;
  private readonly toolManager: ToolManager;
  private readonly uiCoordinator: UICoordinator;
  private readonly instructionProcessor: InstructionProcessor;

  constructor(
    document: Document,
    spatialProcessor: SpatialProcessor,
    toolManager: ToolManager,
    uiCoordinator: UICoordinator,
    instructionProcessor: InstructionProcessor
  ) {
    this.document = document;
    this.spatialProcessor = spatialProcessor;
    this.toolManager = toolManager;
    this.uiCoordinator = uiCoordinator;
    this.instructionProcessor = instructionProcessor;
  }

  handleDrawSelection(result: DrawSelectionResult): void {
    const anchorElement =
      result.anchorElement ?? (this.document.body as HTMLElement);

    const { left, top, width, height } = result.context.bounds;
    const selectionBox: BoundingBox = {
      x: left,
      y: top,
      width,
      height,
    };

    this.spatialProcessor.clearSpatialAnalysis();

    logger.debug("Recorded draw selection bounds", selectionBox);

    this.toolManager.selectElement(anchorElement);

    const currentTool = this.toolManager.getCurrentTool();
    this.uiCoordinator.updateBubbleToolState(currentTool);

    if (this.toolManager.getSelectedElementInfo()) {
      this.instructionProcessor.openEditModal("draw");
    } else {
      logger.warn("Draw selection finalized without selectable anchor");
    }
  }

  handleDrawCancel(): void {}
}
