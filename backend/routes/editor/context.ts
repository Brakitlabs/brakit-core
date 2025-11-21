import express from "express";
import { detectFramework } from "../../utils/detectFramework";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const info = detectFramework();
    res.json({
      success: true,
      framework: info.framework,
      hasTailwind: info.hasTailwind,
      router: info.router,
      pageRoots: info.pageRoots,
      summary: info.summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
