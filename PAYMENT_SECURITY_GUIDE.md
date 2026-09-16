# 🔒 Payment Gateway & Security Architecture Guide (YIP 9.0)

This document provides complete technical documentation and judge defense Q&A for the **Farmer Procurement Platform**'s payment and Direct Benefit Transfer (DBT) subsystem.

---

## 🏛️ 1. Payment Architecture Overview

Our procurement system enforces a **5-Tier Enterprise Payment Security Framework** adhering to the **Reserve Bank of India (RBI)**, **Public Financial Management System (PFMS)**, and **NPCI APBS (Aadhaar Payment Bridge System)** specifications:

```
                                  [ Mandi Yard / Weighing Bridge ]
                                                │
                                    (Grain Quality Verified)
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           5-TIER PAYMENT SECURITY ENGINE                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. In-Flight Security:   TLS 1.3 with 256-Bit AES Cipher Suites                  │
│ 2. Data Integrity:       SHA-256 HMAC Digital Non-Repudiation Signatures         │
│ 3. Double-Spend Defense: UUIDv4 Server-Enforced Idempotency Keys                 │
│ 4. Maker-Checker Model:  Officer 2FA Authorization (PIN/OTP)                     │
│ 5. Data Privacy:         Tokenization & PCI-DSS Account Masking (••••8283)       │
└──────────────────────────────────────────────────────────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [ PFMS e-Kuber 2.0 Gateway ]                              [ Razorpay Smart Escrow ]
    (Direct Treasury-to-Aadhaar DBT)                         (Instant UPI 2.0 / IMPS / RTGS)
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                ▼
                                   [ Beneficiary Farmer Bank ]
                              (Direct Credit + Cryptographic Receipt)
```

---

## 🛡️ 2. Core Security Pillars

### Pillar 1: Cryptographic Integrity via SHA-256 HMAC (RFC 2104)
- **Problem**: Malicious actors or man-in-the-middle proxies attempting to tamper with payment amounts (e.g., changing ₹2,300 to ₹23,000).
- **Solution**: Every payment payload is signed with an HMAC (Hash-based Message Authentication Code) computed over `order_id | tx_id | currency | amount | beneficiary_id` using a high-entropy secret key.
- **Verification**: The backend verifies signatures using `crypto.timingSafeEqual` to prevent timing attacks. Any alteration invalidates the cryptographic hash and immediately aborts the transaction with `400 Signature Mismatch`.

### Pillar 2: Double-Disbursement Defense via Idempotency Keys
- **Problem**: Admin double-clicking "Disburse" during network latency or automated retry loops causing duplicate payouts.
- **Solution**: Every transaction request requires a unique `Idempotency-Key` (UUIDv4). The server registers this key in memory and MongoDB with an atomic transaction lock. Duplicate requests return the original receipt without triggering secondary bank transfers.

### Pillar 3: Government Maker-Checker Model (2FA Authorization)
- **Problem**: Unauthorized single-click treasury release.
- **Solution**: Separation of duties:
  - **Maker**: Mandi field officer inputs moisture, grade, and weighed quintals.
  - **Checker**: Centre Incharge verifies the weighing slip and enters their 4-digit Officer Authorization PIN before funds disburse.

### Pillar 4: Data Masking & Tokenization (RBI / PCI-DSS)
- **Problem**: Leakage of farmer bank account and Aadhaar credentials.
- **Solution**: Zero raw banking credentials are sent in cleartext to client browsers. Only masked account numbers (`••••8283`) and IFSC codes are rendered. Encrypted tokens are stored at rest using AES-256.

---

## 🎯 3. Judge Defense Q&A Cheat Sheet (Top Hackathon Questions)

### Q1: "How do you ensure someone cannot tamper with the payment amount in browser inspect element?"
> **Answer**:  
> *"We enforce SHA-256 HMAC digital signature verification. When a payment order is initiated, our server cryptographically signs the order ID, amount, and timestamp using a private secret. If a user modifies the DOM or payload in transit, the server recomputes the HMAC hash. The mathematical hashes will fail comparison, and the server rejects the request with `400 Cryptographic Signature Mismatch`."*

### Q2: "What prevents double payment if the admin clicks the button multiple times or network drops?"
> **Answer**:  
> *"We use server-enforced Idempotency Keys. Every payment dispatch carries a unique UUIDv4 token. When received, the server locks that key. Any retry or duplicate request within the 24-hour window returns the original cached disbursement receipt without triggering a duplicate financial debit."*

### Q3: "What payment gateway standard are you using for rural procurement?"
> **Answer**:  
> *"We support a hybrid gateway model:  
> 1. **Government of India PFMS e-Kuber 2.0**: Official RBI Direct Benefit Transfer (DBT) standard for Aadhaar Payment Bridge System (APBS) bank credits.  
> 2. **Razorpay Smart Escrow Payouts**: Real-time UPI 2.0 and IMPS disbursement with automated webhook reconciliation."*

### Q4: "How does an illiterate farmer know their payment status?"
> **Answer**:  
> *"Each payment card includes an instant **Voice Speaker Button** that speaks the exact quantity, MSP rate, total rupees, and bank transaction ID in their native regional language (Telugu, Hindi, Malayalam, Tamil, Kannada, Marathi, etc.). Illiterate farmers can also call our toll-free IVR dialer (1800-890-2026) for voice payment updates."*

### Q5: "How is treasury accountability maintained?"
> **Answer**:  
> *"Every payment generates an immutable audit record containing the Bank UTR, Order ID, SHA-256 checksum, Admin ID, and NPCI clearance timestamp, viewable via the interactive Payment Security Inspector in the portal."*
