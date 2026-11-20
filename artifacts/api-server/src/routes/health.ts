import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      uptime: Math.floor(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      uptime: Math.floor(process.uptime()),
      error: err instanceof Error ? err.message : String(err)
    });
  }
});

// Also keep /healthz for backwards compatibility
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
