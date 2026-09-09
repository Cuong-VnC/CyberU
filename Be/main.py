import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from services.gemini_service import validate_api_key, analyze_scam_payload, inspect_and_fetch_url

load_dotenv()

app = FastAPI(
    title="CyberU AI Backend Service",
    description="Python FastAPI REST API for Multimodal Threat Intelligence, Scam Forensics & Cyber Security Knowledge Base",
    version="1.0.0"
)

# Configure CORS for Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"

def load_json_data(filename: str) -> List[Any]:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

# Root Welcome Endpoint
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "CyberU Python FastAPI Backend",
        "message": "CyberU AI Anti-Scam API is running on Vercel!",
        "endpoints": {
            "health": "/api/health",
            "analyze": "/api/gemini/analyze",
            "knowledge": "/api/knowledge/threats"
        }
    }

# Health & Status Endpoint
@app.get("/api/health")
async def health_check():
    has_env_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
    return {
        "status": "ok",
        "service": "CyberU Python FastAPI Backend",
        "hasEnvKey": has_env_key,
        "timestamp": str(Path(__file__).stat().st_mtime)
    }

# i18n Translations Endpoint
@app.get("/api/i18n")
async def get_i18n(lang: Optional[str] = None):
    data = load_json_data("i18n.json")
    if isinstance(data, dict) and lang in ["en", "vi"]:
        return {"success": True, "lang": lang, "data": data.get(lang, {})}
    return {"success": True, "data": data}

# API Key Validation
@app.post("/api/gemini/validate-key")
async def validate_key(request: Request, x_gemini_api_key: Optional[str] = Header(None)):
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    
    key = x_gemini_api_key or body.get("apiKey")
    result = await validate_api_key(key)
    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("error", "API Key không hợp lệ"))
    return result

# Multimodal Analysis Endpoint
@app.post("/api/gemini/analyze")
async def analyze_scam(request: Request, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Dữ liệu yêu cầu không hợp lệ (Invalid JSON body).")

    api_mode = body.get("apiMode", "system_default")
    user_key = x_gemini_api_key if (api_mode == "custom_key" and x_gemini_api_key) else body.get("apiKey") if api_mode == "custom_key" else None
    try:
        res = await analyze_scam_payload(body, client_key=user_key)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print("Analysis error:", e)
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý phân tích AI: {str(e)}")

# Live URL Forensics Inspection Endpoint
@app.get("/api/inspect-url")
async def inspect_url(url: str = Query(..., description="Target URL to inspect")):
    crawled = await inspect_and_fetch_url(url)
    return {"success": True, "crawled": crawled}

# Knowledge Base Endpoints
@app.get("/api/knowledge/encyclopedia")
async def get_encyclopedia(query: Optional[str] = None, category: Optional[str] = None):
    data = load_json_data("encyclopedia.json")
    if category and category.lower() != "all":
        data = [item for item in data if item.get("category", "").lower() == category.lower()]
    if query and query.strip():
        q = query.strip().lower()
        data = [
            item for item in data
            if q in item.get("title", "").lower() or q in item.get("shortDescription", "").lower() or q in item.get("whatIsIt", "").lower()
        ]
    return {"success": True, "count": len(data), "data": data}

@app.get("/api/knowledge/scenarios")
async def get_scenarios(query: Optional[str] = None, category: Optional[str] = None):
    data = load_json_data("scenarios.json")
    if category and category.lower() != "all":
        data = [item for item in data if item.get("category", "").lower() == category.lower()]
    if query and query.strip():
        q = query.strip().lower()
        data = [
            item for item in data
            if q in item.get("title", "").lower() or q in item.get("description", "").lower()
        ]
    return {"success": True, "count": len(data), "data": data}

@app.get("/api/knowledge/threats")
async def get_threats():
    encyclopedia = load_json_data("encyclopedia.json")
    scenarios = load_json_data("scenarios.json")
    spot_game = load_json_data("spot_game.json")
    return {
        "success": True,
        "encyclopedia": encyclopedia,
        "scenarios": scenarios,
        "spotGame": spot_game
    }

# Cases Dossier Endpoints
@app.get("/api/cases")
async def get_cases():
    cases = load_json_data("cases.json")
    return {"success": True, "count": len(cases), "data": cases}

# Academy Endpoints
@app.get("/api/academy")
async def get_academy():
    scenarios = load_json_data("scenarios.json")
    return {"success": True, "count": len(scenarios), "data": scenarios}

# Spot Game Quiz Endpoints
@app.get("/api/game/questions")
async def get_game_questions():
    questions = load_json_data("spot_game.json")
    return {"success": True, "count": len(questions), "data": questions}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🚀 CyberU Python API Server starting on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
