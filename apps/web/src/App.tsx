import { useEffect, useState } from "react";

type HealthResponse = {
  success: boolean;
  data?: { service: string; status: string; diagnostics: string; timestamp: string };
  error?: { code: string; message: string } | null;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/health", { signal: controller.signal })
      .then(async (response) => setHealth((await response.json()) as HealthResponse))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setHealth({ success: false, error: { code: "API_UNAVAILABLE", message: "Start the Express and Python services, then refresh." } });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const status = loading ? "Checking services" : health?.success ? "All services connected" : "Service needs attention";

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="InfraSense AI home"><span className="brand-mark">IS</span><span>InfraSense <strong>AI</strong></span></a>
        <span className="environment"><span className="dot" /> LOCAL DEMO</span>
      </header>
      <section className="hero">
        <p className="eyebrow">INFRASTRUCTURE OPERATIONS CENTER</p>
        <h1>Clarity when systems<br /><span>need attention.</span></h1>
        <p className="intro">A local-first workspace for investigating service health, server metrics, logs, and messaging incidents.</p>
        <div className={"status-banner " + (health?.success ? "is-ok" : loading ? "is-loading" : "is-error")} role="status"><span className="status-indicator" />{status}</div>
      </section>
      <section className="grid" aria-label="Foundation status">
        <article className="panel"><span className="panel-label">MILESTONE</span><h2>01 <span>/ 05</span></h2><p>Project foundation</p><div className="progress"><span /></div><small>Service skeleton and health checks</small></article>
        <article className="panel"><span className="panel-label">EXPRESS API</span><h2>{loading ? "Checking" : health?.data?.service ? "Reachable" : "Offline"}</h2><p>REST API status</p><small>GET /api/v1/health</small></article>
        <article className="panel"><span className="panel-label">PYTHON DIAGNOSTICS</span><h2>{loading ? "Checking" : health?.data?.diagnostics === "healthy" ? "Connected" : "Unavailable"}</h2><p>FastAPI health service</p><small>Diagnostic rules arrive in Phase 2</small></article>
      </section>
      <section className="next-step"><div><p className="eyebrow">WHAT COMES NEXT</p><h2>Build trust in the evidence.</h2><p>Next, add simulated server metrics, sample logs, service checks, and repeatable diagnostic rules before introducing AI.</p></div><span className="next-icon" aria-hidden="true">↗</span></section>
      {health?.error && <p className="error-note"><strong>{health.error.code}:</strong> {health.error.message}</p>}
      <footer><span>InfraSense AI · Development build</span><span>Simulated environment · No production systems connected</span></footer>
    </main>
  );
}
