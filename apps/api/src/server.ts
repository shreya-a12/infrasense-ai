import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);
const diagnosticsBaseUrl = process.env.DIAGNOSTICS_BASE_URL ?? "http://127.0.0.1:8000";

app.disable("x-powered-by");
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "256kb" }));

const incidentSchema = z.object({
  incident_id: z.string().max(100),
  service_name: z.string().max(100),
  severity: z.enum(["critical", "high", "medium", "low"]),
  summary: z.string().max(1000),
  metrics: z.object({
    service_status: z.string(),
    cpu_percent: z.number().min(0).max(100),
    memory_percent: z.number().min(0).max(100),
    queue_depth: z.number().min(0),
    error_count: z.number().min(0)
  }),
  findings: z.array(z.object({
    code: z.string().max(100), severity: z.enum(["critical", "high", "medium", "low"]),
    title: z.string().max(300), evidence: z.string().max(1000), likely_cause: z.string().max(1000)
  })).max(30),
  recommendations: z.array(z.string().max(1000)).max(30),
  simulation: z.boolean()
});

app.get("/api/v1/health", async (_req: Request, res: Response) => {
  let diagnostics: "healthy" | "unavailable" = "unavailable";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(new URL("/health", diagnosticsBaseUrl), { signal: controller.signal });
      diagnostics = response.ok ? "healthy" : "unavailable";
    } finally { clearTimeout(timeout); }
  } catch { diagnostics = "unavailable"; }
  const healthy = diagnostics === "healthy";
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: { service: "infrasense-api", status: healthy ? "healthy" : "degraded", diagnostics, timestamp: new Date().toISOString() },
    error: healthy ? null : { code: "DIAGNOSTICS_UNAVAILABLE", message: "The Python diagnostics service could not be reached." }
  });
});

app.post("/api/v1/diagnostics/analyze", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(new URL("/api/v1/diagnostics/analyze", diagnosticsBaseUrl), {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req.body), signal: controller.signal
      });
      res.status(response.status).json(await response.json());
    } finally { clearTimeout(timeout); }
  } catch (error) { next(error); }
});

app.post("/api/v1/diagnostics/explain", async (req: Request, res: Response) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ success: false, data: null, error: { code: "AI_NOT_CONFIGURED", message: "Add OPENAI_API_KEY to your local .env file, then restart the API." } });
    return;
  }
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, data: null, error: { code: "INVALID_INCIDENT", message: "Provide a valid diagnostic report from the rule-based analyzer." } });
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + process.env.OPENAI_API_KEY },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          instructions: "You are InfraSense AI, an IT operations assistant. Explain only the supplied diagnostic evidence. Separate observed facts from hypotheses. Do not invent logs, metrics, root causes, or successful actions. Give a concise plain-language incident summary, likely cause hypotheses tied to evidence, and safe next checks. Do not execute or suggest blindly executing shell commands. This is simulated demo data; recommendations are advisory.",
          input: JSON.stringify(parsed.data),
          max_output_tokens: 700
        }),
        signal: controller.signal
      });
      const result = await response.json() as { output_text?: string; error?: { message?: string } };
      if (!response.ok) {
        res.status(502).json({ success: false, data: null, error: { code: "AI_PROVIDER_ERROR", message: result.error?.message ?? "The AI provider request failed." } });
        return;
      }
      const explanation = result.output_text?.trim();
      if (!explanation) {
        res.status(502).json({ success: false, data: null, error: { code: "EMPTY_AI_RESPONSE", message: "The AI provider returned no explanation." } });
        return;
      }
      res.json({ success: true, data: { explanation, model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", generated_at: new Date().toISOString(), advisory: true }, error: null });
    } finally { clearTimeout(timeout); }
  } catch {
    res.status(502).json({ success: false, data: null, error: { code: "AI_REQUEST_FAILED", message: "Could not reach the AI provider. Check your connection and API configuration." } });
  }
});

app.get("/api/v1", (_req: Request, res: Response) => {
  res.json({ success: true, data: { name: "InfraSense AI API", version: "v1", milestone: "phase-3-ai-explanation" }, error: null });
});
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, data: null, error: { code: "NOT_FOUND", message: "The requested route does not exist." } });
});
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(500).json({ success: false, data: null, error: { code: "INTERNAL_ERROR", message } });
});
app.listen(port, "127.0.0.1", () => console.log("InfraSense API listening at http://127.0.0.1:" + port));
