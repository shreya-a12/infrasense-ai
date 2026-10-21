from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="InfraSense AI Diagnostics",
    version="0.2.0",
    description="Rule-based diagnostic service for simulated infrastructure incidents.",
)


class HealthData(BaseModel):
    service: str
    status: Literal["healthy"]
    timestamp: datetime


class ApiResponse(BaseModel):
    success: bool
    data: dict
    error: None = None


class IncidentInput(BaseModel):
    service_name: str = Field(default="Messaging Service", min_length=2, max_length=100)
    service_status: Literal["running", "stopped"] = "running"
    cpu_percent: float = Field(default=96, ge=0, le=100)
    memory_percent: float = Field(default=78, ge=0, le=100)
    queue_depth: int = Field(default=1850, ge=0, le=10000000)
    error_count: int = Field(default=42, ge=0, le=10000000)


def diagnose(incident: IncidentInput) -> dict:
    findings: list[dict] = []
    recommendations: list[str] = []

    if incident.service_status == "stopped":
        findings.append({
            "code": "SERVICE_STOPPED",
            "severity": "critical",
            "title": f"{incident.service_name} is stopped",
            "evidence": "The reported service state is stopped.",
            "likely_cause": "The service may have crashed, been stopped during maintenance, or failed to start.",
        })
        recommendations.append("Check the service logs and recent deployments, then restart the service only after confirming it is safe.")
    if incident.cpu_percent >= 90:
        findings.append({
            "code": "HIGH_CPU",
            "severity": "high",
            "title": "CPU utilization is critically high",
            "evidence": f"CPU utilization is {incident.cpu_percent:.1f}%, above the 90% threshold.",
            "likely_cause": "A traffic spike, expensive task, retry loop, or resource leak may be consuming CPU.",
        })
        recommendations.append("Inspect top CPU-consuming processes and recent workload changes; scale capacity if demand is legitimate.")
    if incident.memory_percent >= 90:
        findings.append({
            "code": "HIGH_MEMORY",
            "severity": "high",
            "title": "Memory utilization is critically high",
            "evidence": f"Memory utilization is {incident.memory_percent:.1f}%, above the 90% threshold.",
            "likely_cause": "Memory pressure may be caused by a workload spike, cache growth, or a memory leak.",
        })
        recommendations.append("Review memory usage by process and check for out-of-memory events before restarting workloads.")
    if incident.queue_depth >= 1000:
        findings.append({
            "code": "QUEUE_BACKLOG",
            "severity": "high",
            "title": "Messaging queue backlog detected",
            "evidence": f"Queue depth is {incident.queue_depth:,}, above the 1,000-message threshold.",
            "likely_cause": "Message production may exceed consumer capacity, or consumers may be failing.",
        })
        recommendations.append("Check consumer health, processing latency, and dead-letter queues; add consumers if downstream systems are healthy.")
    if incident.error_count >= 25:
        findings.append({
            "code": "REPEATED_ERRORS",
            "severity": "medium",
            "title": "Repeated application errors detected",
            "evidence": f"{incident.error_count} errors were reported, above the 25-error threshold.",
            "likely_cause": "A dependency failure, configuration change, or repeated retry may be generating errors.",
        })
        recommendations.append("Group recent logs by error signature and correlate the first occurrence with deployments and dependency health.")

    if not findings:
        findings.append({
            "code": "NO_RULE_MATCH",
            "severity": "low",
            "title": "No configured rule matched this sample",
            "evidence": "All supplied values are below the current alert thresholds and the service is running.",
            "likely_cause": "The provided sample does not show a known threshold breach.",
        })
        recommendations.append("Continue monitoring and review logs if users are still reporting a problem.")

    order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    severity = max((item["severity"] for item in findings), key=lambda value: order[value])
    return {
        "incident_id": "DEMO-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "service_name": incident.service_name,
        "severity": severity,
        "summary": f"Detected {len(findings)} finding(s) for {incident.service_name}. This result is based on deterministic demo rules, not an AI-generated conclusion.",
        "metrics": {
            "service_status": incident.service_status,
            "cpu_percent": incident.cpu_percent,
            "memory_percent": incident.memory_percent,
            "queue_depth": incident.queue_depth,
            "error_count": incident.error_count,
        },
        "findings": findings,
        "recommendations": recommendations,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "simulation": True,
    }


@app.get("/health", response_model=ApiResponse)
def health() -> ApiResponse:
    return ApiResponse(
        success=True,
        data=HealthData(
            service="infrasense-diagnostics",
            status="healthy",
            timestamp=datetime.now(timezone.utc),
        ).model_dump(mode="json"),
        error=None,
    )


@app.get("/api/v1/diagnostics/tools")
def list_diagnostic_tools() -> dict:
    tools = [
        {"name": "check_service_health", "description": "Check whether the simulated service is running.", "status": "available"},
        {"name": "analyze_server_metrics", "description": "Evaluate CPU and memory against thresholds.", "status": "available"},
        {"name": "search_logs", "description": "Use the supplied error count as a simulated log signal.", "status": "available"},
        {"name": "analyze_message_queue", "description": "Evaluate queue depth for a messaging backlog.", "status": "available"},
    ]
    return {"success": True, "data": tools, "error": None}


@app.post("/api/v1/diagnostics/analyze")
def analyze_incident(incident: IncidentInput) -> dict:
    """Run deterministic rules against a simulated infrastructure incident."""
    return {"success": True, "data": diagnose(incident), "error": None}
