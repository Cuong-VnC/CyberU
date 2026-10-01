import os
import re
import json
import base64
import urllib.parse
import typing
from typing import Dict, Any, List, Optional
import httpx

from services.gemini_service import inspect_and_fetch_url, get_genai_client, determine_model_pipeline, HIGH_RISK_TLDS

VIRUSTOTAL_ENV_KEY = "VIRUSTOTAL_API_KEY"
SAFE_BROWSING_ENV_KEY = "SAFE_BROWSING_API_KEY"
GEMINI_ENV_KEY = "GEMINI_API_KEY"

# lay key virustotal tu bien moi truong
def get_virustotal_key() -> str:
    return (
        os.getenv("VIRUSTOTAL_API_KEY", "") or
        os.getenv("KHÓA_API_VIRUSTOTAL", "") or
        os.getenv("KHOA_API_VIRUSTOTAL", "") or
        os.getenv("VIRUSTOTAL_KEY", "") or
        os.getenv("VT_API_KEY", "")
    ).strip()

# lay key safe browsing tu bien moi truong
def get_safebrowsing_key() -> str:
    return (
        os.getenv("SAFE_BROWSING_API_KEY", "") or
        os.getenv("KHÓA_API_SAFE_BROWSING", "") or
        os.getenv("KHOA_API_SAFE_BROWSING", "") or
        os.getenv("SAFEBROWSING_API_KEY", "") or
        os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "")
    ).strip()

# chuan hoa url ve dang chuan http/https chu thuong
def normalize_url(raw_url: str) -> str:
    u = raw_url.strip().lower()
    if not re.match(r'^https?://', u):
        u = 'https://' + u
    return u.lower()

# ham quet url qua virustotal api v3
async def scan_url_virustotal(target_url: str) -> Dict[str, Any]:
    vt_key = get_virustotal_key()
    if not vt_key:
        raise ValueError("MISSING_KEY: VIRUSTOTAL_API_KEY not configured.")

    url_clean = normalize_url(target_url)
    parsed = urllib.parse.urlparse(url_clean)
    domain = parsed.hostname or url_clean.replace("https://", "").replace("http://", "").split("/")[0]
    domain = domain.lower()

    # tao identifier base64 urlsafe theo chuan api v3 cua virustotal
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

        # neu url chua co trong csdl (loi 404), fallback sang quet theo ten mien
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

            # gui url moi len virustotal neu chua luu index
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

# quet url qua google safe browsing api v4
async def scan_url_safebrowsing(target_url: str) -> Dict[str, Any]:
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

# phan tich url qua gemini ai ket hop crawl dom truc tiep
async def scan_url_gemini(target_url: str, client_key: Optional[str] = None, lang: str = 'vi') -> Dict[str, Any]:
    url_clean = normalize_url(target_url)
    crawled = await inspect_and_fetch_url(url_clean)

    lang_str = "English" if lang == 'en' else "Vietnamese (Tiếng Việt)"
    system_prompt = f"""You are CyberU AI — an expert Cybersecurity Threat Intelligence Scanner.
Analyze the target URL forensically based on domain structure, TLD, SSL fetch results, forms detected (login, OTP, card, identity harvesting), and body text snippet.

RESPONSE LANGUAGE: Provide all threat_level_label, summary, title, explanation, and action fields in {lang_str}.

Return a STRICT JSON response with this schema:
{{
  "verdict": "SAFE" | "SUSPICIOUS" | "MALICIOUS",
  "risk_score": <number 0-100>,
  "threat_level_label": "<Short summary label in {lang_str}>",
  "summary": "<Detailed analysis summary in {lang_str}>",
  "why_is_this_suspicious": [
    {{ "title": "<Short point>", "explanation": "<Detail explanation>" }}
  ],
  "recommended_actions": [
    {{ "step_number": 1, "title": "<Action>", "action": "<Detailed steps>" }}
  ]
}}"""

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
                        "threat_label": parsed.get("threat_level_label", "Gemini AI Forensic Scan" if lang == 'en' else "Phân Tích AI Gemini"),
                        "summary": parsed.get("summary", f"Analyzed URL '{url_clean}' via Gemini AI model." if lang == 'en' else f"Đã phân tích đường dẫn '{url_clean}' qua mô hình AI Gemini."),
                        "why_is_this_suspicious": parsed.get("why_is_this_suspicious", []),
                        "recommended_actions": parsed.get("recommended_actions", []),
                        "crawled": crawled
                    }
            except Exception:
                continue
    except Exception:
        pass

    # phan tich heuristic thu cong neu goi gemini api that bai
       is_high_risk = crawled.get("isHighRiskTld") or crawled.get("formsDetected", {}).get("hasLoginForm")
    
    if lang == 'en':
        threat_label = "Heuristic URL Structure Assessment"
        summary = f"Preliminary scan completed for URL '{url_clean}' based on TLD structure ({crawled.get('tld')}) and HTML web components."
        why_title = "Website Structure Analysis"
        has_login = crawled.get('formsDetected', {}).get('hasLoginForm')
        is_hr = crawled.get('isHighRiskTld')
        why_exp = f"TLD domain: {crawled.get('tld')} ({'High risk' if is_hr else 'Normal'}). Login form detected: {'Yes' if has_login else 'No'}."
        rec_actions = [
            {"step_number": 1, "title": "Security Recommendation", "action": "Never disclose OTP codes, access unfamiliar links, or transfer money."},
            {"step_number": 2, "title": "Hotline Verification", "action": "Contact official bank hotlines or authorities to verify information."}
        ]
        provider = "Heuristic Security Scanner (Live DOM Crawl)"
    else:
        threat_label = "Đánh Giá Heuristic Cấu Trúc URL"
        summary = f"Đã quét sơ bộ đường dẫn '{url_clean}' theo cấu trúc TLD ({crawled.get('tld')}) và thành phần trang web HTML."
        why_title = "Phân Tích Cấu Trúc Website"
        has_login = crawled.get('formsDetected', {}).get('hasLoginForm')
        is_hr = crawled.get('isHighRiskTld')
        why_exp = f"Tên miền TLD: {crawled.get('tld')} ({'Rủi ro cao' if is_hr else 'Bình thường'}). Phát hiện form đăng nhập: {'Có' if has_login else 'Không'}."
        rec_actions = [
            {"step_number": 1, "title": "Khuyến Cáo Bảo Mật", "action": "Tuyệt đối không đọc mã OTP, không truy cập đường link lạ hoặc chuyển tiền."},
            {"step_number": 2, "title": "Xác Minh Hotline", "action": "Gọi tới hotline chính thức của ngân hàng hoặc cơ quan chức năng để kiểm tra thông tin."}
        ]
        provider = "Heuristic Security Scanner (Crawl DOM Thực Tế)"

    return {
        "success": True,
        "provider": provider,
        "url": url_clean,
        "verdict": "SUSPICIOUS" if is_high_risk else "SAFE",
        "risk_score": 75 if is_high_risk else 20,
        "threat_label": threat_label,
        "summary": summary,
        "why_is_this_suspicious": [
            {
                "title": why_title,
                "explanation": why_exp
            }
        ],
        "recommended_actions": rec_actions,
        "crawled": crawled
    }

# ham quet url tong hop voi chuoi fallback nhieu lop (virustotal -> safe browsing -> gemini ai)
async def scan_url_with_fallback(target_url: str, client_key: Optional[str] = None, lang: str = 'vi') -> Dict[str, Any]:
    url_clean = normalize_url(target_url)
    fallback_chain: List[Dict[str, Any]] = []

    vt_res = None
    sb_res = None

    # 1. thu quet virustotal api v3
    try:
        vt_res = await scan_url_virustotal(url_clean)
        fallback_chain.append({
            "provider": "VirusTotal API v3",
            "status": "SUCCESS",
            "reason": f"VirusTotal verdict: {vt_res.get('verdict')} (Risk Score: {vt_res.get('risk_score')})"
        })
    except Exception as vt_err:
        err_msg = str(vt_err)
        status_code = "LIMIT_EXCEEDED" if "LIMIT_EXCEEDED" in err_msg or "429" in err_msg else "MISSING_KEY" if "MISSING_KEY" in err_msg else "ERROR"
        fallback_chain.append({
            "provider": "VirusTotal API v3",
            "status": status_code,
            "reason": err_msg
        })

    # neu virustotal xac nhan moi de doa malicious (>=2 engine bao xau), tra ve ket qua luon
    if vt_res and vt_res.get("verdict") == "MALICIOUS" and vt_res.get("risk_score", 0) >= 75:
        fallback_chain.append({"provider": "Google Safe Browsing API v4", "status": "SKIPPED", "reason": "VirusTotal confirmed MALICIOUS threat."})
        fallback_chain.append({"provider": "Gemini AI", "status": "SKIPPED", "reason": "VirusTotal confirmed MALICIOUS threat."})
        vt_res["fallback_chain"] = fallback_chain
        vt_res["provider_used"] = "VirusTotal API v3"
        return vt_res

    # 2. thu quet google safe browsing api v4
    try:
        sb_res = await scan_url_safebrowsing(url_clean)
        fallback_chain.append({
            "provider": "Google Safe Browsing API v4",
            "status": "SUCCESS",
            "reason": f"Google Safe Browsing verdict: {sb_res.get('verdict')} (Risk Score: {sb_res.get('risk_score')})"
        })
    except Exception as sb_err:
        err_msg = str(sb_err)
        status_code = "LIMIT_EXCEEDED" if "LIMIT_EXCEEDED" in err_msg or "429" in err_msg or "403" in err_msg else "MISSING_KEY" if "MISSING_KEY" in err_msg else "ERROR"
        fallback_chain.append({
            "provider": "Google Safe Browsing API v4",
            "status": status_code,
            "reason": err_msg
        })

    if sb_res and sb_res.get("verdict") == "MALICIOUS":
        fallback_chain.append({"provider": "Gemini AI", "status": "SKIPPED", "reason": "Safe Browsing confirmed MALICIOUS threat."})
        sb_res["fallback_chain"] = fallback_chain
        sb_res["provider_used"] = "Google Safe Browsing API v4"
        return sb_res

    # 3. luon thuc hien quet gemini ai & crawl html dom truc tiep neu virustotal/safe browsing bao an toan hoac chua index
    gemini_res = await scan_url_gemini(url_clean, client_key=client_key, lang=lang)
    fallback_chain.append({
        "provider": gemini_res.get("provider", "Gemini AI DOM Forensics"),
        "status": "SUCCESS",
        "reason": f"Live DOM inspection verdict: {gemini_res.get('verdict')} (Risk Score: {gemini_res.get('risk_score')})"
    })

    # neu gemini ai hoac heuristic phat hien nghi van/doc hai thi uu tien ghi nhan
    if gemini_res.get("verdict") in ["SUSPICIOUS", "MALICIOUS"] or gemini_res.get("risk_score", 0) > (vt_res.get("risk_score", 0) if vt_res else 0):
        gemini_res["fallback_chain"] = fallback_chain
        provider_name = gemini_res.get('provider', 'Gemini AI')
        gemini_res["provider_used"] = f"{provider_name} (Live DOM Crawl)" if lang == 'en' else f"{provider_name} (Crawl DOM Thực Tế)"
        return gemini_res

    # neu tat ca dich vu deu bao an toan
    final_res = vt_res or sb_res or gemini_res
    final_res["fallback_chain"] = fallback_chain
    final_res["provider_used"] = final_res.get("provider", "VirusTotal / Safe Browsing")
    return final_res


