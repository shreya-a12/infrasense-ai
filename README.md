# InfraSense AI

AI-powered IT support and infrastructure troubleshooting using simulated infrastructure data, deterministic Python diagnostics, and a local AI agent.

Current milestone: Phase 1 — repository foundation. Dashboard and AI investigation features are not implemented yet.

## Architecture
- Web: React + Vite + TypeScript in apps/web
- API: Node.js + Express + TypeScript in apps/api
- Diagnostics: Python + FastAPI + Pydantic in services/diagnostics
- Later phases: MongoDB Community Edition and local Ollama model

## Prerequisites
- Node.js LTS and npm
- Python 3.11+
- Git

## Setup
Install JavaScript dependencies:
    npm install

Create a Python environment (Windows PowerShell):
    py -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r services/diagnostics/requirements.txt

macOS/Linux:
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r services/diagnostics/requirements.txt

Copy .env.example to .env if you need to customize local ports. Do not commit secrets.

Run each service from a separate terminal:
    npm run dev:api
    npm run dev:web
    npm run dev:diagnostics

## Local URLs
- Web: http://localhost:5173
- Express health: http://127.0.0.1:3001/api/v1/health
- Python health: http://127.0.0.1:8000/health

Start the Python service first for the API health endpoint to report all services healthy.

## Roadmap
1. Foundation and service health checks
2. Simulated infrastructure data and deterministic diagnostic tools
3. Persistence, REST APIs, incident management and dashboard
4. Bounded AI investigation agent with approved tool calling
5. Testing, safety review and portfolio documentation

## Safety
- Sample data only; no production infrastructure connections by default.
- Diagnostic findings must reference real tool output.
- Never execute model-generated shell commands or arbitrary code.
- AI recommendations remain advisory.

Features are only considered complete after implementation and verification. This first milestone does not include database persistence, operational dashboards or AI investigations.
