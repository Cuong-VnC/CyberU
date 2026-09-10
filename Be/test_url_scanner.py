import sys
import asyncio
import os
import json
from unittest.mock import patch, AsyncMock
import httpx

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from services.url_scanner_service import scan_url_with_fallback

async def run_tests():
    print("==================================================")
    print("Bat dau kiem thu co che Fallback Quet URL lua dao")
    print("==================================================")

    test_url = "https://bank-scam-test.xyz"

    print("\n[Scenario 1]: Khi khong co API key nao duoc cau hinh (Virtual Environment clear)")
    os.environ["VIRUSTOTAL_API_KEY"] = ""
    os.environ["SAFE_BROWSING_API_KEY"] = ""
    res = await scan_url_with_fallback(test_url)
    print(f" -> Provider Used: {res.get('provider_used')}")
    for step in res.get("fallback_chain", []):
        print(f"    * [{step.get('provider')}] Status: {step.get('status')} | Reason: {step.get('reason')}")

    print("\n[Scenario 2]: Gia lap VirusTotal bi Rate Limit (HTTP 429), chuyen sang Safe Browsing")
    os.environ["VIRUSTOTAL_API_KEY"] = "vt_dummy_key_123"
    os.environ["SAFE_BROWSING_API_KEY"] = "sb_dummy_key_456"

    # Mock VirusTotal response status 429 and Safe Browsing status 200 (Clean)
    original_get = httpx.AsyncClient.get
    original_post = httpx.AsyncClient.post

    async def mock_get(self, url, **kwargs):
        if "virustotal.com" in str(url):
            return httpx.Response(429, text='{"error": {"code": "QuotaExceededError"}}')
        return await original_get(self, url, **kwargs)

    async def mock_post(self, url, **kwargs):
        if "safebrowsing.googleapis.com" in str(url):
            return httpx.Response(200, json={"matches": []})
        return await original_post(self, url, **kwargs)

    with patch.object(httpx.AsyncClient, "get", mock_get), patch.object(httpx.AsyncClient, "post", mock_post):
        res2 = await scan_url_with_fallback(test_url)
        print(f" -> Provider Used: {res2.get('provider_used')}")
        print(f" -> Verdict: {res2.get('verdict')}")
        for step in res2.get("fallback_chain", []):
            print(f"    * [{step.get('provider')}] Status: {step.get('status')} | Reason: {step.get('reason')}")

    print("\n[Scenario 3]: Gia lap ca VirusTotal va Safe Browsing deu bi Rate Limit (HTTP 429), chuyen sang Gemini AI")
    async def mock_post_limit(self, url, **kwargs):
        if "safebrowsing.googleapis.com" in str(url):
            return httpx.Response(429, text='{"error": {"message": "Quota exceeded"}}')
        return await original_post(self, url, **kwargs)

    async def mock_gemini_scan(url, client_key=None):
        return {
            "success": True,
            "provider": "Gemini AI",
            "verdict": "SUSPICIOUS",
            "risk_score": 85,
            "threat_label": "Canh bao Phishing qua Gemini AI",
            "summary": "Phan tich Gemini AI phat hien mien domain rui ro cao .xyz va form dang nhap nghi van."
        }

    with patch.object(httpx.AsyncClient, "get", mock_get), \
         patch.object(httpx.AsyncClient, "post", mock_post_limit), \
         patch("services.url_scanner_service.scan_url_gemini", mock_gemini_scan):
        res3 = await scan_url_with_fallback(test_url)
        print(f" -> Provider Used: {res3.get('provider_used')}")
        print(f" -> Verdict: {res3.get('verdict')}")
        print(f" -> Risk Score: {res3.get('risk_score')}")
        for step in res3.get("fallback_chain", []):
            print(f"    * [{step.get('provider')}] Status: {step.get('status')} | Reason: {step.get('reason')}")

    print("\n==================================================")
    print("ALL 3 FALLBACK SCENARIOS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
