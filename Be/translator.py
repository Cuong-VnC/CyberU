# CyberShield AI - Multilingual Data Translation Module (Vietnamese -> English)

CATEGORY_MAP = {
    "AI & Deepfake": "AI & Deepfake",
    "Giả danh Cơ quan chức năng": "Impersonating Authorities",
    "Giả mạo Ngân hàng & Tài chính": "Bank & Finance Impersonation",
    "SMS & Viễn thông": "SMS & Telecom Scams",
    "Phishing & Giả mạo Web": "Phishing & Fake Websites",
    "Mã độc & Liên kết độc hại": "Malware & Malicious Links",
    "Mã độc & Ứng dụng giả mạo": "Malware & Fake Apps",
    "Gian lận Giao dịch & Thương mại": "E-Commerce & Transaction Fraud",
    "Mạng xã hội & Chiếm đoạt tài khoản": "Social Media & Account Takeover",
    "Tuyển dụng & Việc làm": "Recruitment & Job Scams",
    "Đầu tư & Tài chính ảo": "Crypto & Forex Investment Scams",
    "Tình cảm & Hẹn hò trực tuyến": "Romance & Online Dating Scams",
    "Trúng thưởng & Khuyến mãi": "Lottery & Promotion Scams",
    "Du lịch & Vé máy bay": "Travel & Flight Booking Scams",
    "Cho vay & Tín dụng đen": "Black Credit & Loan Scams",
    "Dịch vụ công & Thuế": "Public Services & Tax Scams",
}

ENCYCLOPEDIA_EN = {
    "deepfake-video-scam": {
        "title": "1. Deepfake AI Video Call Impersonating Relatives Emergency Loan",
        "shortDescription": "Scammers use artificial intelligence (AI) to swap face and expressions of your relatives to make a glitchy video call requesting emergency money.",
        "whatIsIt": "Deepfake Video scam is a high-tech crime where perpetrators collect victim photos and videos on social media, using AI to generate fake facial movements and make a brief video call to loan money.",
        "howItWorks": [
            "Hackers gain access to victim's Facebook, Zalo, or Telegram account.",
            "Collect public videos and photos to train Deepfake AI models for fake faces.",
            "Make a brief 5-15 second video call under poor network conditions and abruptly disconnect.",
            "Message back claiming bad signal and an urgent emergency (accident, hospital fee) asking for an immediate money transfer."
        ],
        "warningSigns": [
            "Very short video call with frozen, blurry, or flashing facial artifacts.",
            "Lip movements do not naturally sync with voice; blank stare with low blink rate.",
            "Background is blurred or facial lighting does not match ambient environment.",
            "Recipient bank account belongs to a stranger or a different bank."
        ],
        "howToVerify": [
            "Hang up immediately and call back using traditional cellular SIM call.",
            "Ask family security questions that strangers wouldn't know.",
            "If on video, ask the caller to turn their face 90 degrees or wave hand in front of face."
        ]
    },
    "deepvoice-audio-clone": {
        "title": "2. DeepVoice AI Voice Cloning Creating Emergency Scenarios",
        "shortDescription": "Extracting voice samples from TikTok/Facebook clips to clone 99% real voice, calling to report fake kidnapping or accident emergencies.",
        "whatIsIt": "DeepVoice uses neural networks to clone tone, pitch, and cadence from a short voice sample, generating speech in victim's voice.",
        "howItWorks": [
            "Scammers collect victim voice samples from social media videos or voice messages.",
            "Use AI voice generator to call victim's parents or grandparents.",
            "Pretend to cry or panic due to kidnapping or traffic accident.",
            "An accomplice takes over demanding immediate ransom or bail money."
        ],
        "warningSigns": [
            "Voice pitch is similar but cadence feels monotone or unnaturally uniform.",
            "Call includes heavy background noise (sirens, crying) to disguise AI audio glitches.",
            "Caller presses continuously without letting you ask detailed questions."
        ],
        "howToVerify": [
            "Stay calm, hang up immediately and call relative's personal SIM number directly.",
            "Cross-check location with school, workplace, or colleagues."
        ]
    },
    "police-investigation-scam": {
        "title": "3. Impersonating Police, Prosecutors, Courts Demanding Money Transfers",
        "shortDescription": "Impersonating investigators via phone to intimidate victims about drug or money laundering cases, sending fake arrest warrants and demanding money transfers.",
        "whatIsIt": "Scammers pose as Police Officers or Prosecutors, claiming victim's bank account received illegal funds, forcing transfers to 'state security accounts'.",
        "howItWorks": [
            "Call using VoIP spoofing fake police phone numbers.",
            "Recite full name, ID number, and address to build trust.",
            "Send fake red-stamped arrest warrants via chat apps.",
            "Order victim into a private room, keep absolute secret and transfer funds to 'verification accounts'."
        ],
        "warningSigns": [
            "Police interrogating or accusing citizens over phone or Zalo.",
            "Sending arrest warrants or legal documents via social media messaging.",
            "Demanding money transfers for 'fund verification' or 'bail'."
        ],
        "howToVerify": [
            "Golden Rule: Vietnamese authorities only work in person at official headquarters with written summons via mail/local police.",
            "The state NEVER has private 'verification bank accounts' for citizens to transfer money into."
        ]
    },
    "bank-officer-otp-scam": {
        "title": "4. Impersonating Bank Staff Requesting Passwords and OTP Codes",
        "shortDescription": "Posing as customer service staff offering credit card limit increases, fee refunds, or rewards to trick victims into revealing Smart OTP codes.",
        "whatIsIt": "Fraudsters pose as bank customer service representatives, claiming your card has errors or needs limit increases to extract card numbers, CVVs, and OTPs.",
        "howItWorks": [
            "Call posing as Vietcombank, Techcombank, MBBank, BIDV staff.",
            "Announce eligibility for card limit increase or fee refund.",
            "Request photos of both card sides (16-digit number, expiration, 3-digit CVV).",
            "Perform online transaction and ask victim to read OTP code to complete."
        ],
        "warningSigns": [
            "Caller asking for OTP codes, PINs, or banking passwords.",
            "Calling from 10-digit personal mobile numbers instead of official hotlines.",
            "Pressuring quick OTP readout before session expires."
        ],
        "howToVerify": [
            "Bank Golden Rule: Bank staff NEVER request OTP codes, PINs, or passwords from customers.",
            "OTP is the master key to your bank account vault."
        ]
    },
    "sms-brandname-phishing-scam": {
        "title": "5. Fake Bank & Government SMS Brandname Messages",
        "shortDescription": "Using rogue mobile base stations (Fake BTS) to insert phishing SMS into official bank message threads, tricking users into clicking malicious links.",
        "whatIsIt": "Criminals use IMSI Catchers (Fake BTS) to broadcast spoofed SMS carrying bank brandnames into real message threads.",
        "howItWorks": [
            "Scammers drive fake BTS stations through crowded residential areas.",
            "Force nearby phones to disconnect from real carriers and receive fake SMS.",
            "Message reads: 'Account deducted / unauthorized login, click link to cancel'.",
            "Link leads to a pixel-perfect replica of banking login page."
        ],
        "warningSigns": [
            "SMS containing unfamiliar domain extensions (.top, .vip, .xyz, .cc, .site).",
            "Threatening money deduction or account lock within minutes.",
            "Website requiring full login credentials and OTP entry."
        ],
        "howToVerify": [
            "Banks in Vietnam NEVER send SMS containing login links.",
            "Open official banking app independently to check balance and alerts."
        ]
    }
}

SPOT_GAME_EN = {
    "1": {
        "title": "Fake Vietcombank SMS Warning of Card Lock",
        "content": "[Vietcombank] Notice: Your VCB Digibank account has been locked due to abnormal login in Hanoi. Please visit https://vietcombank-digibank-xacminh.top/login to unlock within 24h. Otherwise, all funds will be frozen."
    },
    "2": {
        "title": "Zalo Message Borrowing 15 Million from Close Friend",
        "content": "Hey bro! Are you free? My banking app is having transaction errors while paying a supplier invoice. Can you transfer 15 million to account 0987xxx (MB Bank - NGUYEN VAN A) for me? I'll transfer back to you this afternoon!"
    },
    "3": {
        "title": "Work-from-Home TikTok Video Viewer Recruitment",
        "content": "Hello! We are urgently recruiting 5 online collaborators:\n💼 Job: Like & watch TikTok videos (just scroll on phone).\n💰 Income: 50,000VND / video, earn 500,000VND - 1,500,000VND daily paid via ATM.\n❌ No deposit, no capital needed.\n👉 Add Zalo now with Ms. Mai HR: 0987.xxx.xxx to get started!"
    },
    "4": {
        "title": "Phone Call from Fake Police Officer Demanding Money Verification",
        "content": "Hello Mr. Nam. I am Lieutenant Colonel Tran Van B from the C04 Drug Crime Investigation Department. Your ID number 0380xxx is linked to a 50 billion VND money laundering ring. You must transfer your savings to the Ministry's audit account for verification, otherwise an arrest warrant will be executed today."
    },
    "5": {
        "title": "Notification Email for Flight Ticket Change from Vietnam Airlines",
        "content": "From: no-reply@vietnamairlines.com.vn\nSubject: Notice of Schedule Change for Flight VN216\nDear Customer, Flight VN216 on October 15 has been rescheduled by 30 minutes. Please check your updated e-ticket details in your booking management on our official website."
    },
    "6": {
        "title": "Fake Delivery Driver COD SMS Demanding Immediate Payment",
        "content": "Shipper GHTK: You have 1 parcel (electronics) COD 450,000 VND. I am at your house door but you're away. Please transfer money to account 1903xxx (Techcombank) so I can leave package with neighbor."
    }
}

SCENARIOS_EN = {
    "sc-deepfake-loan": {
        "title": "1. Deepfake Video Call Urgent Loan Trap",
        "category": "Deepfake & AI Impersonation",
        "description": "A glitchy video call from a relative claiming an urgent accident in hospital asking for 40 million VND."
    },
    "sc-police-scam": {
        "title": "2. Fake Police Investigation Phone Call",
        "category": "Impersonating Authorities",
        "description": "Scammer poses as Police Officer accusing victim of money laundering and demanding fund verification."
    },
    "sc-bank-otp": {
        "title": "3. Fake Bank Staff Requesting Smart OTP",
        "category": "Bank & Finance Impersonation",
        "description": "Scammer calls offering credit card limit increase and asking for OTP code."
    }
}

VI_EN_DICTIONARY = {
    "1. Giả Danh Người Thân Gọi Video Bằng Deepfake Vay Tiền Gấp": "1. Deepfake Video Call Impersonating Relative Requesting Urgent Money",
    "2. Giả Danh Công An Gọi Điện Đe Dọa Nhận Tiền Thẩm Tra": "2. Impersonating Police Investigator Demanding Money Verification",
    "3. Giả Danh Nhân Viên Ngân Hàng Đòi Mã Smart OTP": "3. Impersonating Bank Staff Demanding Smart OTP Code",
    "4. Tin Nhắn SMS Brandname Giả Mạo Ngân Hàng Dụ Click Link": "4. Fake Bank SMS Brandname Phishing Message",
    "5. Dụ Dỗ Cài Đặt File APK Mã Độc Thuế Chiếm Quyền Điện Thoại": "5. Fake Tax Department Malicious APK Installation Scam",
    "Deepfake & AI Mạo Danh": "Deepfake & AI Impersonation",
    "Mạo Danh Cơ Quan Pháp Luật": "Impersonating Law Enforcement",
    "Mạo Danh Ngân Hàng": "Bank & Finance Impersonation",
    "Phishing Công Nghệ Cao": "High-Tech Phishing",
    "Mã Độc & Phishing": "Malware & Phishing",
    "SẬP BẪY DEEPFAKE! Kẻ gian đã thu thập hình ảnh, clip người thân trên Facebook rồi dùng AI Deepfake ghép mặt gọi chớp nhoáng 5 giây.": "DEEPFAKE TRAP! Scammers scraped Facebook photos/videos to make a 5-second AI Deepfake video call.",
    "QUÁ XUẤT SẮC! Khi gọi số di động cá nhân, người thân xác nhận đang đi làm bình thường, tài khoản Facebook vừa bị hacker chiếm quyền.": "EXCELLENT DECISION! Calling mobile phone directly confirmed relative is safe and Facebook was hacked.",
    "RẤT THÔNG MINH! Kẻ lừa đảo không thể trả lời đúng bí mật gia đình nên sẽ vòng vo hoặc chặn liên lạc.": "VERY SMART! Scammer cannot answer family secret question and blocks contact.",
    "Vì vừa nhìn thấy đúng mặt người thân nên mở app ngân hàng chuyển 40 triệu ngay lập tức.": "Open bank app and transfer 40M VND immediately after seeing relative's face.",
    "Bình tĩnh, không chuyển tiền ngay. Dùng SIM điện thoại thông thường gọi trực tiếp số di động của người thân để kiểm tra.": "Stay calm, do not transfer money immediately. Call relative's mobile SIM directly to verify.",
    "Nhắn tin hỏi một câu hỏi chỉ 2 người trong nhà biết: \"Hôm trước sinh nhật mẹ ăn ở quán nào?\"": "Text a private family question that only household members know.",
    "Màn hình hiện khuôn mặt người thân cử động nhưng khẩu hình giật giật, tiếng rè: \"Bố mẹ ơi... sóng yếu quá... con đang bị giữ đồ ở hải quan sân bay... chuyển gấp cho con 40 triệu vào số tài khoản đồng nghiệp này cứu con với...\". Sau 5 giây cuộc gọi tự ngắt và có tin nhắn gửi STK lạ.": "Screen shows relative's face moving with glitchy lip-sync and static audio: 'Mom, Dad... signal is terrible... I am detained at airport customs... transfer 40M VND to this colleague's account immediately to save me...'. Call drops after 5s followed by unknown account SMS."
}

def translate_str_fallback(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return text
    if text in VI_EN_DICTIONARY:
        return VI_EN_DICTIONARY[text]
    
    res = text
    replacements = [
        ("Giả Danh", "Impersonating"),
        ("Giả Mạo", "Fake"),
        ("Mạo Danh", "Impersonating"),
        ("Người Thân", "Relatives"),
        ("Gọi Video", "Video Call"),
        ("Bằng Deepfake", "Using Deepfake"),
        ("Vay Tiền Gấp", "Urgent Money Loan"),
        ("Công An", "Police"),
        ("Viện Kiểm Sát", "Prosecutor"),
        ("Tòa Án", "Court"),
        ("Ngân Hàng", "Bank"),
        ("Cơ Quan Pháp Luật", "Authorities"),
        ("Nhân Viên", "Staff"),
        ("Mã OTP", "OTP Code"),
        ("Mã độc", "Malware"),
        ("Chuyển tiền", "Transfer money"),
        ("Bình tĩnh", "Stay calm"),
        ("Xác thực", "Verify"),
        ("Hải quan", "Customs"),
        ("SẬP BẪY DEEPFAKE", "DEEPFAKE TRAP"),
        ("SẬP BẪY", "SCAM TRAP"),
        ("QUÁ XUẤT SẮC", "EXCELLENT"),
        ("RẤT THÔNG MINH", "VERY SMART")
    ]
    for vi, en in replacements:
        res = res.replace(vi, en)
    return res

def _process_obj_en(obj):
    if isinstance(obj, dict):
        new_dict = {}
        for k, v in obj.items():
            if k.endswith("_en"):
                continue
            base_key = k
            en_val = obj.get(f"{k}_en")
            if isinstance(en_val, str) and en_val.strip():
                has_viet_accents = any(ord(c) > 127 for c in en_val)
                has_en_words = any(w in en_val.lower() for w in ["the ", "is ", "to ", "and ", "you ", "call ", "video ", "fake ", "scam ", "impersonat", "bank ", "police ", "urgent ", "pretend "])
                if en_val == v or (has_viet_accents and not has_en_words):
                    new_dict[base_key] = translate_str_fallback(v)
                else:
                    new_dict[base_key] = en_val
            elif isinstance(v, str):
                has_viet_accents = any(ord(c) > 127 for c in v)
                new_dict[base_key] = translate_str_fallback(v) if has_viet_accents else v
            else:
                new_dict[base_key] = _process_obj_en(v)
        return new_dict
    elif isinstance(obj, list):
        return [_process_obj_en(elem) for elem in obj]
    else:
        return obj

def translate_item(item: dict, dataset_type: str, lang: str) -> dict:
    if lang != "en" or not isinstance(item, dict):
        return item
    
    translated = _process_obj_en(item)
    
    # Translate category if present
    if "category" in translated and translated["category"] in CATEGORY_MAP:
        translated["category"] = CATEGORY_MAP[translated["category"]]
        
    item_id = translated.get("id", "")
    
    if dataset_type == "encyclopedia":
        if item_id in ENCYCLOPEDIA_EN:
            en_data = ENCYCLOPEDIA_EN[item_id]
            translated.update(en_data)
        else:
            if "Giả Danh" in translated.get("title", ""):
                translated["title"] = translated["title"].replace("Giả Danh", "Impersonating")
                
    elif dataset_type == "spot_game":
        if item_id in SPOT_GAME_EN:
            en_data = SPOT_GAME_EN[item_id]
            translated.update(en_data)
            
    elif dataset_type == "scenarios":
        if item_id in SCENARIOS_EN:
            en_data = SCENARIOS_EN[item_id]
            translated.update(en_data)
            
    return translated

def translate_dataset(data: list, dataset_type: str, lang: str) -> list:
    if lang != "en" or not isinstance(data, list):
        return data
    return [translate_item(item, dataset_type, lang) for item in data]
