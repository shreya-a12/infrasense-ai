import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);
const diagnosticsBaseUrl = process.env.DIAGNOSTICS_BASE_URL ?? "http://127.0.0.1:8000";

app.disable("x-powered-by");
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/v1/health", async (_req: Request, res: Response) => {
  let diagnostics: "healthy" | "unavailable" = "unavailable";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(new URL("/health", diagnosticsBaseUrl), { signal: controller.signal });
      diagnostics = response.ok ? "healthy" : "unavailable";
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    diagnostics = "unavailable";
  }
  const healthy = diagnostics === "healthy";
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      service: "infrasense-api",
      status: healthy ? "healthy" : "degraded",
      diagnostics,
      timestamp: new Date().toISOString()
    },
    error: healthy ? null : {
      code: "DIAGNOSTICS_UNAVAILABLE",
      message: "The Python diagnostics service could not be reached."
    }
  });
});

app.get("/api/v1", (_req: Request, res: Response) => {
  res.json({ success: true, data: { name: "InfraSense AI API", version: "v1", milestone: "phase-1-foundation" }, error: null });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "The requested route does not exist." } });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ success: false, data: null, error: { code: "INTERNAL_ERROR", message } });
});

app.listen(port, "127.0.0.1", () => {
  console.log("InfraSense API listening at http://127.0.0.1:" + port);
});
