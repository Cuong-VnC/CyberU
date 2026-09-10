import os
import re
import json
import base64
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx

from services.gemini_service import inspect_and_fetch_url, get_genai_client, determine_model_pipeline, HIGH_RISK_TLDS

# Environmental API Key names
VIRUSTOTAL_ENV_KEY = "VIRUSTOTAL_API_KEY"
SAFE_BROWSING_ENV_KEY = "SAFE_BROWSING_API_KEY"
GEMINI_ENV_KEY = "GEMINI_API_KEY"


def get_virustotal_key() -> str:
    return os.getenv(VIRUSTOTAL_ENV_KEY, "").strip()


def get_safebrowsing_key() -> str:
    return os.getenv(SAFE_BROWSING_ENV_KEY, "").strip()


async def scan_url_virustotal(target_url: str) -> Dict[str, Any]:
    """
    Quét URL bằng VirusTotal API v3.
    Nếu chạm limit (HTTP 429 / Quota Exceeded / Missing Key), ném exception để chuyển sang Fallback.
    """
    vt_key = get_virustotal_key()
    if not vt_key:
        raise ValueError("MISSING_KEY: Chưa cấu hình VIRUSTOTAL_API_KEY.")

    # Encode URL thành ID cho VirusTotal API v3 (base64 urlsafe không padding =)
    url_id = base64.urlsafe_b64encode(target_url.encode("utf-8")).decode("utf-8").strip("=")
    api_endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"

    headers = {
        "x-api-key": vt_key,
        "Accept": "application/json"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(api_endpoint, headers=headers)

        if resp.status_code == 429 or "quota" in resp.text.lower() or "limit" in resp.text.lower():
            raise RuntimeError("LIMIT_EXCEEDED: VirusTotal API đã đạt hạn mức lượt yêu cầu (Rate Limit / Quota Exceeded).")

        if resp.status_code in [401, 403]:
            raise ValueError("INVALID_KEY_OR_QUOTA: Khóa VirusTotal API không hợp lệ hoặc đã hết hạn nghạch.")

        if resp.status_code == 404:
            # URL chưa có sẵn trong DB VirusTotal, gửi yêu cầu phân tích mới (POST /api/v3/urls)
            submit_resp = await client.post(
                "https://www.virustotal.com/api/v3/urls",
                headers=headers,
                data={"url": target_url}
            )
            if submit_resp.status_code == 429:
                raise RuntimeError("LIMIT_EXCEEDED: VirusTotal API đã đạt hạn mức lượt yêu cầu khi gửi URL.")
            
            # Nếu 200, VT đang phân tích. Ta phân tích sơ bộ theo domain/tld + thông báo pending
            return {
                "success": True,
                "provider": "VirusTotal",
                "verdict": "SUSPICIOUS" if any(target_url.endswith(tld) for tld in HIGH_RISK_TLDS) else "SAFE",
                "risk_score": 60 if any(target_url.endswith(tld) for tld in HIGH_RISK_TLDS) else 20,
                "summary": "URL vừa được gửi lên VirusTotal để phân tích. Đã quét sơ bộ qua TLD và cấu trúc URL.",
                "stats": {"malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 1},
                "raw": submit_resp.json() if submit_resp.status_code == 200 else {}
            }

        if resp.status_code != 200:
            raise RuntimeError(f"HTTP_ERROR_{resp.status_code}: Lỗi kết nối VirusTotal API ({resp.text[:200]})")

        data = resp.json()
        attributes = data.get("data", {}).get("attributes", {})
        stats = attributes.get("last_analysis_stats", {})

        malicious_count = stats.get("malicious", 0)
        suspicious_count = stats.get("suspicious", 0)
        harmless_count = stats.get("harmless", 0)
        total_engines = sum(stats.values()) if stats else 1

        if malicious_count > 0 or suspicious_count > 0:
            risk_score = min(99, int(((malicious_count * 2 + suspicious_count) / max(total_engines, 10)) * 100 + 40))
            if malicious_count >= 3:
                verdict = "MALICIOUS"
                threat_label = "Website Lừa Đảo / Phishing (Xác minh từ VirusTotal)"
            else:
                verdict = "SUSPICIOUS"
                threat_label = "Website Nghi Vấn Rủi Ro Cao"
        else:
            risk_score = 5
            verdict = "SAFE"
            threat_label = "Website An Toàn"

        return {
            "success": True,
            "provider": "VirusTotal",
            "verdict": verdict,
            "risk_score": risk_score,
            "threat_label": threat_label,
            "summary": f"VirusTotal phát hiện {malicious_count} nhà bảo mật đánh giá NGUY HẠI, {suspicious_count} đánh giá NGHI VẤN trên tổng số {total_engines} công cụ quét.",
            "stats": stats,
            "last_final_url": attributes.get("last_final_url", target_url)
        }


async def scan_url_safebrowsing(target_url: str) -> Dict[str, Any]:
    """
    Quét URL bằng Google Safe Browsing API v4.
    Nếu chạm limit (HTTP 429 / Quota Exceeded / Missing Key), ném exception để chuyển sang Fallback.
    """
    sb_key = get_safebrowsing_key()
    if not sb_key:
        raise ValueError("MISSING_KEY: Chưa cấu hình SAFE_BROWSING_API_KEY.")

    api_endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={sb_key}"

    payload = {
        "client": {
            "clientId": "cybershield-security",
            "clientVersion": "1.0.0"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": target_url}]
        }
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(api_endpoint, json=payload)

        if resp.status_code in [429, 403] or "quota" in resp.text.lower() or "resource_exhausted" in resp.text.lower():
            raise RuntimeError("LIMIT_EXCEEDED: Google Safe Browsing API đã đạt hạn mức lượt yêu cầu (Quota / Limit Exceeded).")

        if resp.status_code != 200:
            raise RuntimeError(f"HTTP_ERROR_{resp.status_code}: Lỗi kết nối Google Safe Browsing API ({resp.text[:200]})")

        data = resp.json()
        matches = data.get("matches", [])

        if matches:
            threat_types = list(set(m.get("threatType", "SOCIAL_ENGINEERING") for m in matches))
            verdict = "MALICIOUS"
            risk_score = 95
            threat_label = f"Mối đe dọa Google Safe Browsing: {', '.join(threat_types)}"
            summary = f"Google Safe Browsing đã đưa đường dẫn này vào danh sách đen độc hại ({', '.join(threat_types)})."
        else:
            verdict = "SAFE"
            risk_score = 10
            threat_label = "Website An Toàn (Google Safe Browsing)"
            summary = "Google Safe Browsing không phát hiện dấu hiệu độc hại hoặc lừa đảo nào trên URL này."

        return {
            "success": True,
            "provider": "Google Safe Browsing",
            "verdict": verdict,
            "risk_score": risk_score,
            "threat_label": threat_label,
            "summary": summary,
            "matches": matches
        }


async def scan_url_gemini(target_url: str, client_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Quét và phân tích URL bằng Google Gemini AI khi các dịch vụ trước đó bị limit hoặc chưa cấu hình key.
    Crawl HTML, phân tích form đăng nhập/OTP/CCCD, TLD rủi ro cao và đưa vào Gemini AI.
    """
    crawled = await inspect_and_fetch_url(target_url)

    system_prompt = """You are CyberU AI — an expert Cybersecurity Threat Intelligence Scanner.
Analyze the target URL forensically based on domain structure, TLD, SSL fetch results, forms detected (login, OTP, card, identity harvesting), and body text snippet.

Return a STRICT JSON response with this schema:
{
  "verdict": "SAFE" | "SUSPICIOUS" | "MALICIOUS",
  "risk_score": <number 0-100>,
  "threat_level_label": "<Short summary label in Vietnamese>",
  "summary": "<Detailed analysis summary in Vietnamese>",
  "why_is_this_suspicious": [
    { "title": "<Short point>", "explanation": "<Detail explanation>" }
  ],
  "recommended_actions": [
    { "step_number": 1, "title": "<Action>", "action": "<Detailed steps>" }
  ]
}"""

    prompt_content = f"""Target URL: {crawled.get('url')}
Final Redirected URL: {crawled.get('finalUrl', crawled.get('url'))}
Domain: {crawled.get('domain')}
TLD: {crawled.get('tld')}
Is High Risk TLD: {crawled.get('isHighRiskTld')}
HTTP Status: {crawled.get('statusCode', 'Error/Timeout')}
Title: {crawled.get('title', 'N/A')}
Forms Detected: {json.dumps(crawled.get('formsDetected', {}))}
External Links / Downloads: {json.dumps(crawled.get('externalLinks', []))}
Body Snippet:
\"\"\"
{crawled.get('bodySnippet', '')[:3000]}
\"\"\"
Fetch Error (if any): {crawled.get('fetchError', 'None')}
"""

    client = get_genai_client(client_key)
    models_to_try, primary_model, rationale = determine_model_pipeline("AUTO", "URL_PHISHING", [], prompt_content)

    last_err = None
    for model in models_to_try:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[system_prompt, prompt_content],
                config={"response_mime_type": "application/json", "temperature": 0.1}
            )
            if response and response.text:
                parsed = json.loads(response.text.strip())
                return {
                    "success": True,
                    "provider": "Gemini AI",
                    "modelUsed": model,
                    "verdict": parsed.get("verdict", "SUSPICIOUS"),
                    "risk_score": parsed.get("risk_score", 50),
                    "threat_label": parsed.get("threat_level_label", "Phân Tích AI Gemini"),
                    "summary": parsed.get("summary", "Đã phân tích URL qua mô hình AI Gemini."),
                    "why_is_this_suspicious": parsed.get("why_is_this_suspicious", []),
                    "recommended_actions": parsed.get("recommended_actions", []),
                    "crawled": crawled
                }
        except Exception as err:
            last_err = err
            continue

    # Fallback cơ bản nếu cả Gemini API call gặp lỗi mạng
    return {
        "success": True,
        "provider": "Gemini AI (Heuristic)",
        "verdict": "SUSPICIOUS" if crawled.get("isHighRiskTld") or crawled.get("formsDetected", {}).get("hasLoginForm") else "SAFE",
        "risk_score": 75 if crawled.get("isHighRiskTld") else 25,
        "threat_label": "Đánh Giá Heuristic Cấu Trúc URL",
        "summary": "Không thể kết nối Gemini API. Đã quét theo luật heuristic domain & form HTML.",
        "crawled": crawled
    }


async def scan_url_with_fallback(target_url: str, client_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Hàm chính Quét URL lừa đảo áp dụng cơ chế Fallback 3 lớp:
    1. VirusTotal API
    2. Google Safe Browsing API (khi VirusTotal chạm limit / không có key / lỗi)
    3. Google Gemini AI (khi cả 2 api trước bị limit / không sẵn sàng)
    """
    raw_url = target_url.strip()
    if not re.match(r'^https?://', raw_url, re.IGNORECASE):
        raw_url = 'https://' + raw_url

    fallback_chain: List[Dict[str, Any]] = []

    # 1. Thử VirusTotal API
    try:
        res = await scan_url_virustotal(raw_url)
        fallback_chain.append({
            "provider": "VirusTotal",
            "status": "SUCCESS",
            "reason": "Kết nối thành công dịch vụ VirusTotal API v3."
        })
        fallback_chain.append({"provider": "Google Safe Browsing", "status": "SKIPPED", "reason": "VirusTotal đã xử lý thành công."})
        fallback_chain.append({"provider": "Gemini AI", "status": "SKIPPED", "reason": "Dịch vụ ưu tiên đã hoàn thành."})
        
        res["fallback_chain"] = fallback_chain
        res["provider_used"] = "VirusTotal"
        return res
    except Exception as vt_err:
        err_msg = str(vt_err)
        status_code = "LIMIT_EXCEEDED" if "LIMIT_EXCEEDED" in err_msg or "429" in err_msg else "MISSING_KEY" if "MISSING_KEY" in err_msg else "ERROR"
        fallback_chain.append({
            "provider": "VirusTotal",
            "status": status_code,
            "reason": err_msg
        })

    # 2. Thử Google Safe Browsing API (khi VirusTotal bị limit/chưa có key/lỗi)
    try:
        res = await scan_url_safebrowsing(raw_url)
        fallback_chain.append({
            "provider": "Google Safe Browsing",
            "status": "SUCCESS",
            "reason": "Kết nối thành công Google Safe Browsing API v4."
        })
        fallback_chain.append({"provider": "Gemini AI", "status": "SKIPPED", "reason": "Safe Browsing đã xử lý thành công."})

        res["fallback_chain"] = fallback_chain
        res["provider_used"] = "Google Safe Browsing"
        return res
    except Exception as sb_err:
        err_msg = str(sb_err)
        status_code = "LIMIT_EXCEEDED" if "LIMIT_EXCEEDED" in err_msg or "429" in err_msg or "403" in err_msg else "MISSING_KEY" if "MISSING_KEY" in err_msg else "ERROR"
        fallback_chain.append({
            "provider": "Google Safe Browsing",
            "status": status_code,
            "reason": err_msg
        })

    # 3. Fallback cuối cùng: Google Gemini AI
    try:
        res = await scan_url_gemini(raw_url, client_key=client_key)
        fallback_chain.append({
            "provider": "Gemini AI",
            "status": "SUCCESS",
            "reason": "Tự động chuyển sang Gemini AI do 2 API trước bị limit/chưa cấu hình."
        })

        res["fallback_chain"] = fallback_chain
        res["provider_used"] = "Gemini AI"
        return res
    except Exception as gemini_err:
        fallback_chain.append({
            "provider": "Gemini AI",
            "status": "ERROR",
            "reason": str(gemini_err)
        })

        return {
            "success": False,
            "url": raw_url,
            "provider_used": "None",
            "verdict": "ERROR",
            "risk_score": 0,
            "summary": f"Tất cả các dịch vụ quét URL (VirusTotal, Safe Browsing, Gemini) đều không thể phản hồi: {str(gemini_err)}",
            "fallback_chain": fallback_chain
        }
