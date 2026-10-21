from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="InfraSense AI Diagnostics",
    version="0.1.0",
    description="Local diagnostic service for simulated infrastructure incidents.",
)


class ToolSummary(BaseModel):
    name: str
    description: str
    status: Literal["planned", "available"]


class HealthData(BaseModel):
    service: str
    status: Literal["healthy"]
    timestamp: datetime


class ApiResponse(BaseModel):
    success: bool
    data: dict
    error: None = None


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
    """List planned tools; implementations arrive in Phase 2."""
    tools = [
        ToolSummary(
            name="check_service_health",
            description="Inspect the simulated health state of a service.",
            status="planned",
        ),
        ToolSummary(
            name="analyze_server_metrics",
            description="Evaluate simulated CPU and memory metrics against configured thresholds.",
            status="planned",
        ),
        ToolSummary(
            name="search_logs",
            description="Filter sample log records by supported fields.",
            status="planned",
        ),
        ToolSummary(
            name="analyze_message_queue",
            description="Inspect simulated messaging queue depth and processing indicators.",
            status="planned",
        ),
    ]
    return {"success": True, "data": [tool.model_dump() for tool in tools], "error": None}
