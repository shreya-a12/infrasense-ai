import { useState } from "react";

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { code: string; severity: Severity; title: string; evidence: string; likely_cause: string };
type Analysis = {
  incident_id: string; service_name: string; severity: Severity; summary: string;
  metrics: { service_status: string; cpu_percent: number; memory_percent: number; queue_depth: number; error_count: number };
  findings: Finding[]; recommendations: string[]; analyzed_at: string; simulation: boolean;
};
type ApiResponse = { success: boolean; data?: Analysis; error?: { code: string; message: string } | null };
type ExplanationResponse = { success: boolean; data?: { explanation: string; model: string; generated_at: string; advisory: boolean }; error?: { code: string; message: string } | null };
type FormValues = { service_name: string; service_status: "running" | "stopped"; cpu_percent: number; memory_percent: number; queue_depth: number; error_count: number };
const demo: FormValues = { service_name: "Messaging Service", service_status: "running", cpu_percent: 96, memory_percent: 78, queue_depth: 1850, error_count: 42 };

export default function App() {
  const [form, setForm] = useState<FormValues>(demo);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");\n  const [aiExplanation, setAiExplanation] = useState("");\n  const [aiLoading, setAiLoading] = useState(false);\n  const [aiError, setAiError] = useState("");

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runAnalysis(values = form) {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/diagnostics/analyze", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values)
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "Diagnostic request failed.");
      setAnalysis(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run diagnostics. Check that all services are running.");
    } finally { setLoading(false); }
  }

  async function explainWithAI() {
    if (!analysis) return;
    setAiLoading(true); setAiError(""); setAiExplanation("");
    try {
      const response = await fetch("/api/v1/diagnostics/explain", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(analysis)
      });
      const payload = (await response.json()) as ExplanationResponse;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "AI explanation failed.");
      setAiExplanation(payload.data.explanation);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Unable to generate AI explanation.");
    } finally { setAiLoading(false); }
  }

  const severityClass = (severity: Severity) => "severity severity-" + severity;
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="InfraSense AI home"><span className="brand-mark">IS</span><span>InfraSense <strong>AI</strong></span></a>
        <span className="environment"><span className="dot" /> LOCAL DEMO</span>
      </header>
      <section className="hero">
        <p className="eyebrow">INFRASTRUCTURE OPERATIONS CENTER</p>
        <h1>Find the signal.<br /><span>Understand the incident.</span></h1>
        <p className="intro">Run transparent diagnostic rules against simulated infrastructure signals. No production systems are connected.</p>
        <div className="status-banner is-ok" role="status"><span className="status-indicator" /> Phase 3 · Rule-based diagnostics + AI explanation</div>
      </section>
      <section className="workbench">
        <div className="section-heading"><div><p className="eyebrow">INCIDENT WORKBENCH</p><h2>Analyze a service incident</h2></div><span className="demo-pill">SIMULATED DATA</span></div>
        <div className="form-grid">
          <label>Service name<input value={form.service_name} onChange={(e) => update("service_name", e.target.value)} /></label>
          <label>Service status<select value={form.service_status} onChange={(e) => update("service_status", e.target.value as FormValues["service_status"])}><option value="running">Running</option><option value="stopped">Stopped</option></select></label>
          <label>CPU utilization (%)<input type="number" min="0" max="100" value={form.cpu_percent} onChange={(e) => update("cpu_percent", Number(e.target.value))} /></label>
          <label>Memory utilization (%)<input type="number" min="0" max="100" value={form.memory_percent} onChange={(e) => update("memory_percent", Number(e.target.value))} /></label>
          <label>Messaging queue depth<input type="number" min="0" value={form.queue_depth} onChange={(e) => update("queue_depth", Number(e.target.value))} /></label>
          <label>Application error count<input type="number" min="0" value={form.error_count} onChange={(e) => update("error_count", Number(e.target.value))} /></label>
        </div>
        <div className="actions"><button className="primary-button" onClick={() => void runAnalysis()} disabled={loading || form.service_name.trim().length < 2}>{loading ? "Analyzing incident…" : "Run diagnostics"} <span aria-hidden="true">↗</span></button><button className="secondary-button" onClick={() => { setForm(demo); void runAnalysis(demo); }} disabled={loading}>Load demo incident</button></div>
        {error && <p className="error-note" role="alert">{error}</p>}
      </section>
      {analysis && <section className="results" aria-live="polite">
        <div className="section-heading"><div><p className="eyebrow">DIAGNOSTIC REPORT · {analysis.incident_id}</p><h2>{analysis.service_name}</h2></div><span className={severityClass(analysis.severity)}>{analysis.severity} severity</span></div>
        <p className="result-summary">{analysis.summary}</p>
        <div className="metric-grid">
          <article className="metric"><span>CPU</span><strong>{analysis.metrics.cpu_percent}%</strong><div className="metric-track"><span style={{ width: analysis.metrics.cpu_percent + "%" }} /></div></article>
          <article className="metric"><span>Memory</span><strong>{analysis.metrics.memory_percent}%</strong><div className="metric-track"><span style={{ width: analysis.metrics.memory_percent + "%" }} /></div></article>
          <article className="metric"><span>Queue depth</span><strong>{analysis.metrics.queue_depth.toLocaleString()}</strong></article>
          <article className="metric"><span>Errors</span><strong>{analysis.metrics.error_count.toLocaleString()}</strong></article>
        </div>
        <h3>Findings ({analysis.findings.length})</h3>
        <div className="finding-list">{analysis.findings.map((f) => <article className="finding" key={f.code}><div className="finding-top"><h4>{f.title}</h4><span className={severityClass(f.severity)}>{f.severity}</span></div><p>{f.evidence}</p><p><strong>Possible cause:</strong> {f.likely_cause}</p><small>Rule ID: {f.code}</small></article>)}</div>
        <h3>Recommended next steps</h3>
        <ol className="recommendations">{analysis.recommendations.map((item, i) => <li key={item}><span>{String(i + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
        <div className="ai-explainer">
          <div className="section-heading"><div><p className="eyebrow">PHASE 3 · AI ASSISTANCE</p><h3>Explain this incident</h3></div><span className="demo-pill">EVIDENCE-BASED</span></div>
          <p className="ai-hint">Ask the AI to explain the findings already produced by the rule engine. The AI does not run commands or change systems.</p>
          <button className="primary-button" onClick={() => void explainWithAI()} disabled={aiLoading}>{aiLoading ? "Generating explanation…" : "Generate AI explanation"} <span aria-hidden="true">↗</span></button>
          {aiError && <p className="error-note" role="alert">{aiError}</p>}
          {aiExplanation && <div className="ai-response"><p className="eyebrow">AI EXPLANATION</p><p>{aiExplanation}</p></div>}
        </div>
        <p className="disclaimer">Rule-based findings + optional AI explanation · Verify recommendations before acting on real systems.</p>
      </section>}
      <footer><span>InfraSense AI · Phase 2 development build</span><span>Simulated environment · No production systems connected</span></footer>
    </main>
  );
}
