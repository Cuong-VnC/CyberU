import os
import re
import json
import base64
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx

from services.gemini_service import inspect_and_fetch_url, get_genai_client, determine_model_pipeline, HIGH_RISK_TLDS

VIRUSTOTAL_ENV_KEY = "VIRUSTOTAL_API_KEY"
SAFE_BROWSING_ENV_KEY = "SAFE_BROWSING_API_KEY"
GEMINI_ENV_KEY = "GEMINI_API_KEY"


def get_virustotal_key() -> str:
    return (
        os.getenv("VIRUSTOTAL_API_KEY", "") or
        os.getenv("KHÓA_API_VIRUSTOTAL", "") or
        os.getenv("KHOA_API_VIRUSTOTAL", "") or
        os.getenv("VIRUSTOTAL_KEY", "") or
        os.getenv("VT_API_KEY", "")
    ).strip()


def get_safebrowsing_key() -> str:
    return (
        os.getenv("SAFE_BROWSING_API_KEY", "") or
        os.getenv("KHÓA_API_SAFE_BROWSING", "") or
        os.getenv("KHOA_API_SAFE_BROWSING", "") or
        os.getenv("SAFEBROWSING_API_KEY", "") or
        os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "")
    ).strip()


def normalize_url(raw_url: str) -> str:
    """Normalize URL to lowercase and ensure http/https scheme."""
    u = raw_url.strip().lower()
    if not re.match(r'^https?://', u):
        u = 'https://' + u
    return u.lower()


async def scan_url_virustotal(target_url: str) -> Dict[str, Any]:
    """Scan URL via VirusTotal API v3."""
    vt_key = get_virustotal_key()
    if not vt_key:
        raise ValueError("MISSING_KEY: VIRUSTOTAL_API_KEY not configured.")

    url_clean = normalize_url(target_url)
    parsed = urllib.parse.urlparse(url_clean)
    domain = parsed.hostname or url_clean.replace("https://", "").replace("http://", "").split("/")[0]
    domain = domain.lower()

    # Create base64 urlsafe identifier without padding for VT v3
    url_id = base64.urlsafe_b64encode(url_clean.encode("utf-8")).decode("utf-8").strip("=")
    api_endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"

    headers = {
        "x-api-key": vt_key,
        "Accept": "application/json"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(api_endpoint, headers=headers)

        if resp.status_code in [429, 402] or "quota" in resp.text.lower() or "limit" in resp.text.lower():
            raise RuntimeError("LIMIT_EXCEEDED: VirusTotal API v3 quota or rate limit exceeded.")

        if resp.status_code in [401, 403]:
            raise RuntimeError("INVALID_KEY_OR_QUOTA: VirusTotal API v3 key invalid or unauthorized.")

        # Fallback to domain analysis if URL not found in VT database (404)
        if resp.status_code == 404:
            parsed_domain = urllib.parse.urlparse(target_url).hostname or target_url.replace("https://", "").replace("http://", "").split("/")[0]
            domain_endpoint = f"https://www.virustotal.com/api/v3/domains/{parsed_domain}"
            domain_resp = await client.get(domain_endpoint, headers=headers)
            
            if domain_resp.status_code == 200:
                d_data = domain_resp.json()
                d_stats = d_data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                d_mal = d_stats.get("malicious", 0)
                d_susp = d_stats.get("suspicious", 0)
                d_total = sum(d_stats.values()) if d_stats else 1
                
                return {
                    "success": True,
                    "provider": "VirusTotal API v3",
                    "url": url_clean,
                    "verdict": "MALICIOUS" if d_mal >= 2 else "SUSPICIOUS" if (d_mal > 0 or d_susp > 0 or any(url_clean.endswith(tld) for tld in HIGH_RISK_TLDS)) else "SAFE",
                    "risk_score": min(99, int(((d_mal * 2 + d_susp) / max(d_total, 10)) * 100 + 35)) if (d_mal > 0 or d_susp > 0) else (60 if any(url_clean.endswith(tld) for tld in HIGH_RISK_TLDS) else 10),
                    "threat_label": f"Phân Tích Tên Miền VirusTotal ({parsed_domain})",
                    "summary": f"VirusTotal đánh giá tên miền '{parsed_domain}': {d_mal} nhà bảo mật cảnh báo ĐỘC HẠI, {d_susp} cảnh báo NGHI VẤN trên tổng số {d_total} công cụ quét.",
                    "stats": d_stats,
                    "why_is_this_suspicious": [
                        {
                            "title": "Kết Quả Quét VirusTotal API v3",
                            "explanation": f"Tên miền '{parsed_domain}': {d_mal} độc hại, {d_susp} nghi vấn trên {d_total} công cụ quét bảo mật toàn cầu."
                        }
                    ]
                }

            # Submit URL for new scan if domain not indexed
            submit_resp = await client.post(
                "https://www.virustotal.com/api/v3/urls",
                headers=headers,
                data={"url": url_clean}
            )
            if submit_resp.status_code == 429:
                raise RuntimeError("LIMIT_EXCEEDED: VirusTotal API rate limit on URL submission.")
            
            is_high_risk_tld = any(url_clean.endswith(tld) for tld in HIGH_RISK_TLDS)
            return {
                "success": True,
                "provider": "VirusTotal API v3",
                "url": url_clean,
                "verdict": "SUSPICIOUS" if is_high_risk_tld else "SAFE",
                "risk_score": 60 if is_high_risk_tld else 15,
                "threat_label": "VirusTotal API v3 (Đang Phân Tích)",
                "summary": f"URL '{url_clean}' đã được gửi lên VirusTotal API v3 để phân tích. TLD '{domain}' {'nằm trong danh sách rủi ro cao' if is_high_risk_tld else 'chưa phát hiện độc hại'}.",
                "stats": {"malicious": 0, "suspicious": 0, "harmless": 1, "undetected": 0},
                "why_is_this_suspicious": [
                    {
                        "title": "VirusTotal API v3",
                        "explanation": f"URL '{url_clean}' vừa được khởi tạo quét mới trên CSDL VirusTotal."
                    }
                ]
            }

        if resp.status_code != 200:
            raise RuntimeError(f"HTTP_ERROR_{resp.status_code}: VirusTotal API error ({resp.text[:200]})")

        data = resp.json()
        attributes = data.get("data", {}).get("attributes", {})
        stats = attributes.get("last_analysis_stats", {})

        malicious_count = stats.get("malicious", 0)
        suspicious_count = stats.get("suspicious", 0)
        harmless_count = stats.get("harmless", 0)
        total_engines = sum(stats.values()) if stats else 1

        if malicious_count > 0 or suspicious_count > 0:
            risk_score = min(99, int(((malicious_count * 2.5 + suspicious_count) / max(total_engines, 10)) * 100 + 40))
            verdict = "MALICIOUS" if malicious_count >= 2 else "SUSPICIOUS"
            threat_label = f"VirusTotal Phát Hiện {malicious_count} Công Cụ Độc Hại"
        else:
            risk_score = 5
            verdict = "SAFE"
            threat_label = "Website An Toàn (VirusTotal API v3)"

        return {
            "success": True,
            "provider": "VirusTotal API v3",
            "url": url_clean,
            "verdict": verdict,
            "risk_score": risk_score,
            "threat_label": threat_label,
            "summary": f"VirusTotal phát hiện {malicious_count} công cụ bảo mật đánh giá ĐỘC HẠI, {suspicious_count} đánh giá NGHI VẤN, {harmless_count} đánh giá AN TOÀN trên tổng số {total_engines} công cụ quét.",
            "stats": stats,
            "why_is_this_suspicious": [
                {
                    "title": "Báo Cáo Bảo Mật VirusTotal API v3",
                    "explanation": f"Phát hiện {malicious_count} nhà bảo mật cảnh báo ĐỘC HẠI, {suspicious_count} nghi vấn trên {total_engines} nhà bảo mật đối chiếu."
                }
            ]
        }


async def scan_url_safebrowsing(target_url: str) -> Dict[str, Any]:
    """Scan URL via Google Safe Browsing API v4."""
    sb_key = get_safebrowsing_key()
    if not sb_key:
        raise ValueError("MISSING_KEY: SAFE_BROWSING_API_KEY not configured.")

    url_clean = normalize_url(target_url)
    api_endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={sb_key}"

    parsed = urllib.parse.urlparse(url_clean)
    domain_url = f"{parsed.scheme}://{parsed.hostname}/" if parsed.hostname else url_clean

    payload = {
        "client": {
            "clientId": "cybershield-security-app",
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
            "threatEntries": [
                {"url": url_clean},
                {"url": domain_url}
            ]
        }
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(api_endpoint, json=payload)

        if resp.status_code in [429, 403] or "quota" in resp.text.lower() or "resource_exhausted" in resp.text.lower():
            raise RuntimeError("LIMIT_EXCEEDED: Google Safe Browsing API v4 quota exceeded.")

        if resp.status_code != 200:
            raise RuntimeError(f"HTTP_ERROR_{resp.status_code}: Google Safe Browsing API error ({resp.text[:200]})")

        data = resp.json()
        matches = data.get("matches", [])

        if matches:
            threat_types = list(set(m.get("threatType", "SOCIAL_ENGINEERING") for m in matches))
            translated_threats = []
            for t in threat_types:
                if t == "SOCIAL_ENGINEERING":
                    translated_threats.append("Lừa Đảo Phishing / Impersonation")
                elif t == "MALWARE":
                    translated_threats.append("Chứa Mã Độc Malware")
                elif t == "UNWANTED_SOFTWARE":
                    translated_threats.append("Phần Mềm Không Mong Muốn")
                else:
                    translated_threats.append(t)

            verdict = "MALICIOUS"
            risk_score = 95
            threat_label = f"Cảnh Báo Google Safe Browsing: {', '.join(translated_threats)}"
            summary = f"Google Safe Browsing API v4 đã đưa đường dẫn '{url_clean}' vào danh sách đen độc hại ({', '.join(translated_threats)})."
            why_items = [
                {
                    "title": "Cảnh Báo Google Safe Browsing API v4",
                    "explanation": f"Phát hiện mối đe dọa trực tiếp: {', '.join(translated_threats)}. Khuyến cáo tuyệt đối không truy cập!"
                }
            ]
        else:
            verdict = "SAFE"
            risk_score = 10
            threat_label = "Website An Toàn (Google Safe Browsing API v4)"
            summary = f"Google Safe Browsing API v4 xác nhận đường dẫn '{url_clean}' an toàn, không phát hiện mã độc hoặc dấu hiệu lừa đảo Phishing."
            why_items = [
                {
                    "title": "Báo Cáo Google Safe Browsing API v4",
                    "explanation": f"Đường dẫn '{url_clean}' đã được đối chiếu thành công với CSDL Google Safe Browsing và ghi nhận AN TOÀN."
                }
            ]

        return {
            "success": True,
            "provider": "Google Safe Browsing API v4",
            "url": url_clean,
            "verdict": verdict,
            "risk_score": risk_score,
            "threat_label": threat_label,
            "summary": summary,
            "matches": matches,
            "why_is_this_suspicious": why_items
        }


async def scan_url_gemini(target_url: str, client_key: Optional[str] = None) -> Dict[str, Any]:
    """Analyze URL via Gemini AI or Heuristic Scanner."""
    url_clean = normalize_url(target_url)
    crawled = await inspect_and_fetch_url(url_clean)

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

    prompt_content = f"""Target URL: {url_clean}
Final Redirected URL: {crawled.get('finalUrl', url_clean)}
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

    try:
        client = get_genai_client(client_key)
        models_to_try, primary_model, rationale = determine_model_pipeline("AUTO", "URL_PHISHING", [], prompt_content)

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
                        "url": url_clean,
                        "modelUsed": model,
                        "verdict": parsed.get("verdict", "SUSPICIOUS"),
                        "risk_score": parsed.get("risk_score", 50),
                        "threat_label": parsed.get("threat_level_label", "Phân Tích AI Gemini"),
                        "summary": parsed.get("summary", f"Đã phân tích đường dẫn '{url_clean}' qua mô hình AI Gemini."),
                        "why_is_this_suspicious": parsed.get("why_is_this_suspicious", []),
                        "recommended_actions": parsed.get("recommended_actions", []),
                        "crawled": crawled
                    }
            except Exception:
                continue
    except Exception:
        pass

    # Heuristic fallback if Gemini API call fails
    is_high_risk = crawled.get("isHighRiskTld") or crawled.get("formsDetected", {}).get("hasLoginForm")
    return {
        "success": True,
        "provider": "Heuristic Security Scanner",
        "url": url_clean,
        "verdict": "SUSPICIOUS" if is_high_risk else "SAFE",
        "risk_score": 75 if is_high_risk else 20,
        "threat_label": "Đánh Giá Heuristic Cấu Trúc URL",
        "summary": f"Đã quét sơ bộ đường dẫn '{url_clean}' theo cấu trúc TLD ({crawled.get('tld')}) và thành phần trang web HTML.",
        "why_is_this_suspicious": [
            {
                "title": "Phân Tích Cấu Trúc Website",
                "explanation": f"Tên miền TLD: {crawled.get('tld')} ({'Rủi ro cao' if crawled.get('isHighRiskTld') else 'Bình thường'}). Phát hiện form đăng nhập: {'Có' if crawled.get('formsDetected', {}).get('hasLoginForm') else 'Không'}."
            }
        ],
        "crawled": crawled
    }


async def scan_url_with_fallback(target_url: str, client_key: Optional[str] = None) -> Dict[str, Any]:
    """Main URL scan handler with fallback chain."""
    url_clean = normalize_url(target_url)
    fallback_chain: List[Dict[str, Any]] = []

    # 1. Try VirusTotal API v3
    try:
        res = await scan_url_virustotal(url_clean)
        fallback_chain.append({
            "provider": "VirusTotal API v3",
            "status": "SUCCESS",
            "reason": "VirusTotal API v3 scan completed successfully."
        })
        fallback_chain.append({"provider": "Google Safe Browsing API v4", "status": "SKIPPED", "reason": "VirusTotal scan succeeded."})
        fallback_chain.append({"provider": "Gemini AI", "status": "SKIPPED", "reason": "Primary provider succeeded."})
        
        res["fallback_chain"] = fallback_chain
        res["provider_used"] = "VirusTotal API v3"
        return res
    except Exception as vt_err:
        err_msg = str(vt_err)
        status_code = "LIMIT_EXCEEDED" if "LIMIT_EXCEEDED" in err_msg or "429" in err_msg else "MISSING_KEY" if "MISSING_KEY" in err_msg else "ERROR"
        fallback_chain.append({
            "provider": "VirusTotal API v3",
            "status": status_code,
            "reason": err_msg
        })

    # 2. Try Google Safe Browsing API v4
    try:
        res = await scan_url_safebrowsing(url_clean)
        fallback_chain.append({
            "provider": "Google Safe Browsing API v4",
            "status": "SUCCESS",
            "reason": "Google Safe Browsing API v4 scan completed successfully."
        })
        fallback_chain.append({"provider": "Gemini AI", "status": "SKIPPED", "reason": "Safe Browsing scan succeeded."})

        res["fallback_chain"] = fallback_chain
        res["provider_used"] = "Google Safe Browsing API v4"
        return res
    except Exception as sb_err:
        err_msg = str(sb_err)
        status_code = "LIMIT_EXCEEDED" if "LIMIT_EXCEEDED" in err_msg or "429" in err_msg or "403" in err_msg else "MISSING_KEY" if "MISSING_KEY" in err_msg else "ERROR"
        fallback_chain.append({
            "provider": "Google Safe Browsing API v4",
            "status": status_code,
            "reason": err_msg
        })

    # 3. Fallback to Gemini AI or Heuristic Scanner
    res = await scan_url_gemini(url_clean, client_key=client_key)
    fallback_chain.append({
        "provider": res.get("provider", "Gemini AI"),
        "status": "SUCCESS",
        "reason": "Fallback to Gemini AI or Heuristic Scanner."
    })

    res["fallback_chain"] = fallback_chain
    res["provider_used"] = res.get("provider", "Gemini AI")
    return res
