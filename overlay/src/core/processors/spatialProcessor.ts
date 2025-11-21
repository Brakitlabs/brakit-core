import {
  analyzeRegion,
  type SpatialAnalysis,
} from "../../spatial/spatialEngine";
import type {
  BoundingBox,
  SpatialMapPayload,
} from "../../spatial/types";

interface SpatialProcessorOptions {
  onSpatialAnalysisRecorded?: (analysis: SpatialAnalysis | null) => void;
}

export class SpatialProcessor {
  private lastSpatialAnalysis: SpatialAnalysis | null = null;
  private readonly onSpatialAnalysisRecorded?: (
    analysis: SpatialAnalysis | null
  ) => void;

  constructor(options: SpatialProcessorOptions = {}) {
    this.onSpatialAnalysisRecorded = options.onSpatialAnalysisRecorded;
  }

  analyzeRegion(
    box: BoundingBox,
    instruction: string,
    action: Parameters<typeof analyzeRegion>[2] = "insert_component",
    opts: Parameters<typeof analyzeRegion>[3] = {}
  ): SpatialAnalysis {
    const analysis = analyzeRegion(box, instruction, action, opts);
    this.recordSpatialAnalysis(analysis);
    return analysis;
  }

  recordSpatialAnalysis(analysis: SpatialAnalysis | null) {
    this.lastSpatialAnalysis = analysis;
    this.onSpatialAnalysisRecorded?.(analysis);
  }

  clearSpatialAnalysis() {
    this.recordSpatialAnalysis(null);
  }

  buildSpatialContext(
    box: BoundingBox,
    instruction: string,
    action: SpatialMapPayload["action"],
    opts: Parameters<typeof analyzeRegion>[3] = {}
  ): SpatialMapPayload {
    const analysis = this.analyzeRegion(box, instruction, action, opts);
    return analysis.payload;
  }
}
