import os
import re
import json
import asyncio
import urllib.parse
import urllib.request
import ssl
from typing import Dict, Any, List, Optional
import httpx
from google import genai
from google.genai import types

# High risk TLDs list
HIGH_RISK_TLDS = [
    '.top', '.xyz', '.cc', '.vip', '.work', '.icu', '.tk', '.ml', '.ga', '.cf',
    '.gq', '.pw', '.fun', '.buzz', '.click', '.site', '.rest', '.online', '.live',
    '.cam', '.fit', '.sbs', '.cfd', '.quest', '.beauty', '.hair', '.skin', '.center'
]

def get_genai_client(client_key: Optional[str] = None):
    raw_key = (client_key or "").strip()
    if (raw_key.startswith('"') and raw_key.endswith('"')) or (raw_key.startswith("'") and raw_key.endswith("'")):
        raw_key = raw_key[1:-1].strip()

    env_key = (
        os.getenv("GEMINI_API_KEY", "") or
        os.getenv("KHÓA_API_GEMINI", "") or
        os.getenv("KHOA_API_GEMINI", "") or
        os.getenv("GEMINI_KEY", "")
    ).strip()
    if (env_key.startswith('"') and env_key.endswith('"')) or (env_key.startswith("'") and env_key.endswith("'")):
        env_key = env_key[1:-1].strip()

    api_key = raw_key or env_key
    if not api_key:
        raise ValueError("MISSING_API_KEY: Chưa cấu hình Gemini API Key. Vui lòng nhập API Key trong phần Cài Đặt hoặc chọn 'Sử dụng API có sẵn'.")
    return genai.Client(api_key=api_key)

async def validate_api_key(client_key: Optional[str] = None) -> Dict[str, Any]:
    try:
        client = get_genai_client(client_key)
        probe_models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-3.5-flash-lite']
        last_error = None

        for m in probe_models:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents='Respond with "OK" only.',
                    config=types.GenerateContentConfig(temperature=0.1)
                )
                if response and response.text:
                    key_used = (client_key or os.getenv("GEMINI_API_KEY", "")).strip()
                    masked = f"{key_used[:6]}••••••••••••{key_used[-4:]}" if len(key_used) >= 10 else "••••••••"
                    return {
                        "valid": True,
                        "message": f"Kết nối thành công với Google Gemini API (Model {m}).",
                        "maskedKey": masked
                    }
            except Exception as model_err:
                last_error = str(model_err)
                continue

        return {"valid": False, "error": last_error or "Không thể xác minh khóa API với các mô hình Gemini."}
    except Exception as e:
        return {"valid": False, "error": str(e)}

async def inspect_and_fetch_url(raw_url: str) -> Dict[str, Any]:
    target_url = raw_url.strip()
    if not re.match(r'^https?://', target_url, re.IGNORECASE):
        target_url = 'https://' + target_url

    domain = target_url
    tld = ""
    try:
        parsed = urllib.parse.urlparse(target_url)
        domain = parsed.hostname.lower() if parsed.hostname else target_url
        parts = domain.split('.')
        tld = '.' + parts[-1] if len(parts) > 1 else ""
    except Exception:
        pass

    is_high_risk_tld = tld.lower() in HIGH_RISK_TLDS
    result = {
        "url": target_url,
        "domain": domain,
        "tld": tld,
        "isHighRiskTld": is_high_risk_tld
    }

    try:
        async with httpx.AsyncClient(timeout=8.5, follow_redirects=True, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CyberU-Scanner/1.0',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        }) as client:
            resp = await client.get(target_url)
            result["finalUrl"] = str(resp.url)
            result["statusCode"] = resp.status_code
            html = resp.text

            # Extract title
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
            if title_match:
                result["title"] = re.sub(r'\s+', ' ', title_match.group(1)).strip()

            # Extract meta description
            desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if desc_match:
                result["metaDescription"] = re.sub(r'\s+', ' ', desc_match.group(1)).strip()

            # Inspect inputs / forms
            lower_html = html.lower()
            has_login = bool(re.search(r'type=["\']password["\']|name=["\'](password|pass|matkhau|pwd)', lower_html))
            has_otp = bool(re.search(r'name=["\'](otp|ma_otp|token|code|2fa)|placeholder=["\'][^"\']*(otp|mã xác thực)', lower_html))
            has_card = bool(re.search(r'name=["\'](card|cvv|ccv|credit_card|so_the)', lower_html))
            has_id = bool(re.search(r'name=["\'](cccd|cmnd|identity|passport)|placeholder=["\'][^"\']*(cccd|cmnd|căn cước)', lower_html))
            form_actions = re.findall(r'<form[^>]*action=["\']([^"\']+)["\']', html, re.IGNORECASE)

            result["formsDetected"] = {
                "hasLoginForm": has_login,
                "hasOtpField": has_otp,
                "hasCardField": has_card,
                "hasIdentityField": has_id,
                "formActions": form_actions[:5]
            }

            # Text snippet
            clean_text = re.sub(r'<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>', ' ', html, flags=re.IGNORECASE)
            clean_text = re.sub(r'<style\b[^<]*(?:(?!</style>)<[^<]*)*</style>', ' ', clean_text, flags=re.IGNORECASE)
            clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            result["bodySnippet"] = clean_text[:4500]

            apk_links = re.findall(r'href=["\']([^"\']*\.apk[^"\']*)["\']', html, re.IGNORECASE)
            tele_links = re.findall(r'href=["\'](https?://(?:t\.me|telegram\.me)[^"\']*)["\']', html, re.IGNORECASE)
            result["externalLinks"] = (apk_links + tele_links)[:8]
    except Exception as err:
        result["fetchError"] = str(err)

    return result

# Default models for CyberU
SYSTEM_DEFAULT_MODELS = [
    'gemini-3.1-pro-preview',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-pro-latest'
]

# Global round-robin index counter
_MODEL_ROTATION_INDEX = 0

def determine_model_pipeline(preferred_model: Optional[str], mode: str, evidence_items: List[Dict[str, Any]], text_content: str):
    global _MODEL_ROTATION_INDEX

    fallback_compat = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

    if preferred_model and preferred_model != "AUTO":
        pipeline = [preferred_model] + [m for m in SYSTEM_DEFAULT_MODELS if m != preferred_model] + fallback_compat
        return pipeline, preferred_model, f"Mô hình được chỉ định: {preferred_model}"

    primary_model = 'gemini-pro-latest'
    
    # Priority ordered list starting with primary_model gemini-3.1-pro-preview
    remaining_models = [m for m in SYSTEM_DEFAULT_MODELS if m != primary_model]
    pipeline = [primary_model] + remaining_models + fallback_compat
    rationale = f"Mô hình mặc định: {primary_model} (Tự động chuyển đổi nếu bị giới hạn/gặp lỗi)"

    return pipeline, primary_model, rationale

async def analyze_scam_payload(payload: Dict[str, Any], client_key: Optional[str] = None) -> Dict[str, Any]:
    mode = payload.get("mode", "DEEP_INVESTIGATION")
    text_content = payload.get("textContent", "").strip()
    evidence_items = payload.get("evidenceItems", [])
    user_notes = payload.get("userNotes", "")
    language = payload.get("language", "vi")
    preferred_model = payload.get("preferredModel")

    # Extract URLs from text
    urls = re.findall(r'https?://[^\s]+', text_content, re.IGNORECASE)
    if not urls and text_content:
        # Extract domain patterns
        domain_match = re.search(r'\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b(?:/[^\s]*)?', text_content)
        if domain_match:
            candidate = domain_match.group(0)
            if not candidate.startswith('http'):
                candidate = 'https://' + candidate
            urls = [candidate]

    is_url_mode = (mode == "URL_PHISHING") or (bool(urls) and len(text_content) < 300 and not evidence_items)

    # Fallback URL scanner for phishing mode
    if is_url_mode or (mode == "URL_PHISHING"):
        target_url = urls[0] if urls else (text_content if text_content.startswith('http') else 'https://' + text_content if text_content else "https://example.com")
        from services.url_scanner_service import scan_url_with_fallback
        scan_res = await scan_url_with_fallback(target_url, client_key=client_key)
        
        provider = scan_res.get("provider_used", scan_res.get("provider", "URL Scanner"))
        why_items = scan_res.get("why_is_this_suspicious", [])
        if not why_items:
            if provider == "VirusTotal":
                stats = scan_res.get("stats", {})
                why_items.append({
                    "title": "Báo cáo Bảo mật VirusTotal API v3",
                    "explanation": f"Số nhà bảo mật đánh giá độc hại: {stats.get('malicious', 0)}, nghi vấn: {stats.get('suspicious', 0)} trên tổng số {sum(stats.values()) if stats else 1} công cụ quét."
                })
            elif provider == "Google Safe Browsing":
                why_items.append({
                    "title": "Báo cáo Google Safe Browsing API v4",
                    "explanation": scan_res.get("summary", "Đã kiểm định với cơ sở dữ liệu Google Safe Browsing.")
                })
            else:
                why_items.append({
                    "title": "Phân Tích Cấu Trúc URL & Domain",
                    "explanation": scan_res.get("summary", "Đã phân tích thông tin tên miền và thành phần trang web.")
                })

        actions = scan_res.get("recommended_actions", [])
        if not actions:
            actions = [
                {
                    "step_number": 1,
                    "title": "Kiểm tra địa chỉ trang web",
                    "action": "Không nhập thông tin tài khoản, mật khẩu hoặc mã OTP vào website này."
                },
                {
                    "step_number": 2,
                    "title": "Báo cáo vi phạm",
                    "action": "Nếu phát hiện dấu hiệu lừa đảo, hãy báo cáo cho cơ quan chức năng hoặc Quản trị viên."
                }
            ]

        return {
            "success": True,
            "providerUsed": provider,
            "modelUsed": provider,
            "primaryModel": provider,
            "modelSwitched": True,
            "switchReason": f"Kết quả trực tiếp từ dịch vụ quét URL: {provider}.",
            "rationale": f"Xử lý thành công qua {provider}.",
            "analysis": {
                "verdict": scan_res.get("verdict", "SAFE"),
                "risk_score": scan_res.get("risk_score", 0),
                "threat_level_label": scan_res.get("threat_label", scan_res.get("verdict")),
                "summary": scan_res.get("summary", f"Đã quét URL thành công qua {provider}."),
                "why_is_this_suspicious": why_items,
                "recommended_actions": actions,
                "fallback_chain": scan_res.get("fallback_chain", [])
            }
        }

    parts = []
    system_prompt = f"""You are CyberU AI — a world-class Cybersecurity Threat Intelligence, Multimodal Scam, Phishing, and Social Engineering Analysis engine.
Your task is to thoroughly analyze the submitted evidence (text, images, audio, video, URLs).

MODE: {mode}
USER CONTEXT/NOTES: {user_notes or 'None'}
RESPONSE LANGUAGE: Provide the analysis in {'Vietnamese (Tiếng Việt)' if language == 'vi' else 'English'}. Keep technical terms clear and accessible.

CRITICAL INSTRUCTIONS & METHODOLOGY:
1. STEP 1 - EVIDENCE EXTRACTION: Extract claims, organizations impersonated, URLs, domains, senders, phone numbers, OTP requests, deadlines.
2. STEP 2 - CONTEXT RECONSTRUCTION: Identify alleged identity and what action target is urged to take.
3. STEP 3 - SCAM PATTERN MATCHING: Check for Bank/Police impersonation, Urgency, Financial manipulation, OTP harvesting.
4. STEP 4 - CROSS-MODAL CORRELATION: Compare screenshot text vs audio vs URL domains.
5. STEP 5 - ACTIONABLE DEFENSE: Return clear safety recommendations and emergency checklist.

Return STRICT JSON adhering precisely to schema."""

    parts.append(system_prompt)

    if text_content and text_content.strip():
        parts.append(f"[SUSPICIOUS TEXT / EMAIL / MESSAGE CONTENT TO ANALYZE]:\n\"\"\"\n{text_content.strip()}\n\"\"\"")
        if urls:
            try:
                from services.url_scanner_service import scan_url_with_fallback
                url_scan_res = await scan_url_with_fallback(urls[0], client_key=client_key)
                parts.append(f"[URL FORENSICS & SECURITY REPUTATION SCAN FOR \"{urls[0]}\"]:\nPrimary Security Provider Used: {url_scan_res.get('provider_used')}\nVerdict: {url_scan_res.get('verdict')}\nRisk Score: {url_scan_res.get('risk_score')}\nThreat Summary: {url_scan_res.get('summary')}\nFallback Chain Log: {json.dumps(url_scan_res.get('fallback_chain', []))}")
            except Exception as scan_err:
                print("URL Fallback scan error:", scan_err)
            
            try:
                crawled = await inspect_and_fetch_url(urls[0])
                parts.append(f"[LIVE CRAWLED WEB CONTENT FROM URL \"{urls[0]}\"]:\nFinal URL: {crawled.get('finalUrl')}\nTitle: {crawled.get('title')}\nForms Detected: {json.dumps(crawled.get('formsDetected', {}))}\nBody Text Snippet:\n\"\"\"\n{crawled.get('bodySnippet', '')}\n\"\"\"")
            except Exception as e:
                print("Crawl error:", e)

    if isinstance(evidence_items, list) and len(evidence_items) > 0:
        parts.append(f"[ATTACHED EVIDENCE FILES COUNT: {len(evidence_items)}]:")
        for i, item in enumerate(evidence_items):
            base64_data = item.get("base64Data", "")
            mime_type = item.get("mimeType", "")
            if base64_data and mime_type:
                clean_b64 = base64_data.split(',')[1] if ',' in base64_data else base64_data
                parts.append(f"--- Evidence Item #{i+1}: Name=\"{item.get('name', 'unnamed')}\", MimeType=\"{mime_type}\" ---")
                try:
                    import base64
                    raw_bytes = base64.b64decode(clean_b64)
                    parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime_type))
                except Exception as b64_err:
                    print(f"Base64 error on item {i}: {b64_err}")
            elif item.get("textContent"):
                parts.append(f"--- Evidence Item #{i+1} (Text Extract): Name=\"{item.get('name')}\" ---\n{item.get('textContent')}")

    if len(parts) == 0:
        raise ValueError("Không có văn bản hoặc dữ liệu đa phương thức nào được cung cấp để phân tích.")

    models_to_try, primary_model, rationale = determine_model_pipeline(preferred_model, mode, evidence_items, text_content)

    last_err = None

    for model in models_to_try:
        try:
            response = client.models.generate_content(
                model=model,
                contents=parts,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )
            if response and response.text:
                res_text = response.text.strip()
                parsed = json.loads(res_text)
                model_switched = (model != primary_model)
                switch_reason = f"Mô hình {primary_model} bị giới hạn (Rate Limit) hoặc gặp sự cố. Hệ thống đã tự động chuyển sang mô hình {model}." if model_switched else ""

                return {
                    "success": True,
                    "modelUsed": model,
                    "primaryModel": primary_model,
                    "modelSwitched": model_switched,
                    "switchReason": switch_reason,
                    "rationale": rationale,
                    "analysis": parsed
                }
        except Exception as err:
            err_str = str(err)
            lower_err = err_str.lower()
            
            is_auth_error = any(term in lower_err for term in [
                "401", "unauthenticated", "invalid authentication credentials",
                "access_token_type_unsupported", "api_key_invalid", "api key not valid"
            ])
            if is_auth_error:
                env_key = os.getenv("GEMINI_API_KEY", "").strip()
                if client_key and env_key and client_key != env_key:
                    print("Custom API key invalid, falling back to server GEMINI_API_KEY...")
                    try:
                        fallback_client = genai.Client(api_key=env_key)
                        response = fallback_client.models.generate_content(
                            model=model,
                            contents=parts,
                            config=types.GenerateContentConfig(
                                system_instruction=system_prompt,
                                response_mime_type="application/json",
                                temperature=0.2
                            )
                        )
                        if response and response.text:
                            parsed = json.loads(response.text.strip())
                            model_switched = (model != primary_model)
                            switch_reason = f"Mô hình {primary_model} bị giới hạn hoặc gặp sự cố. Tự động chuyển API máy chủ ({model})." if model_switched else ""
                            return {
                                "success": True,
                                "modelUsed": model,
                                "primaryModel": primary_model,
                                "modelSwitched": model_switched,
                                "switchReason": switch_reason,
                                "rationale": rationale + " (Tự động chuyển API máy chủ)",
                                "analysis": parsed
                            }
                    except Exception as fb_err:
                        print("Fallback client error:", fb_err)

                if urls:
                    from services.url_scanner_service import scan_url_with_fallback
                    scan_res = await scan_url_with_fallback(urls[0], client_key=client_key)
                    return {
                        "success": True,
                        "providerUsed": scan_res.get("provider_used", "URL Scanner"),
                        "modelUsed": "URL Scanner Fallback",
                        "primaryModel": primary_model,
                        "modelSwitched": True,
                        "switchReason": "Tự động sử dụng Bộ quét URL Fallback do Gemini API gặp sự cố 401.",
                        "rationale": "Chuyển sang Bộ quét URL Fallback.",
                        "analysis": {
                            "verdict": scan_res.get("verdict", "SUSPICIOUS"),
                            "risk_score": scan_res.get("risk_score", 50),
                            "threat_level_label": scan_res.get("threat_label", "Kết quả quét URL"),
                            "summary": scan_res.get("summary", "Đã phân tích URL thành công."),
                            "why_is_this_suspicious": scan_res.get("why_is_this_suspicious", [{"title": "Quét URL Security", "explanation": scan_res.get("summary")}]),
                            "recommended_actions": scan_res.get("recommended_actions", [])
                        }
                    }

                raise ValueError("Khóa Gemini API Key không hợp lệ hoặc chưa được cấp quyền (HTTP 401 UNAUTHENTICATED). Vui lòng kiểm tra biến GEMINI_API_KEY trên Vercel hoặc tạo lại API Key mới tại Google AI Studio (aistudio.google.com).")

            last_err = err
            print(f"Model {model} failed: {err}")
            continue

    raise last_err or RuntimeError("Tất cả mô hình AI hiện đang quá tải. Vui lòng thử lại sau vài giây.")
