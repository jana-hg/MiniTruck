# 🚀 Driver Verification - Quick API Reference

## ⚡ Quick Start

### 1. Driver Registration (with RC & Photo)
```bash
POST /api/drivers/register
Content-Type: application/json

{
  "name": "Ahmed Driver",
  "phone": "9876543210",
  "licenseNumber": "DL123456",
  "licenseExpiry": "2026-12-31",
  "password": "SecurePass@123",
  "profilePicture": "data:image/jpeg;base64,...",
  "uploadedDocuments": {
    "rc": "data:application/pdf;base64,..."
  },
  "vehicleType": "small",
  "vehicleMake": "Tata",
  "vehicleModel": "Ace",
  "vehicleRegNumber": "DL01AB1234"
}

✅ Response (201):
{
  "id": "D5432",
  "documentVerification": {
    "rc": { "verified": true, "verificationStatus": "auto-verified" },
    "profilePhoto": { "verified": true, "verificationStatus": "auto-verified" }
  }
}

❌ Errors:
- "Driver profile photo is required"
- "Registration Certificate (RC) is required"
- "Password must be at least 8 characters"
```

---

### 2. Get Drivers Pending Verification (Admin)
```bash
GET /api/drivers/pending-verification

✅ Response (200):
[
  {
    "id": "D5432",
    "name": "Ahmed Driver",
    "documentVerification": {
      "rc": { "verified": false, "verificationStatus": "pending-review" },
      "profilePhoto": { "verified": false, "verificationStatus": "pending-review" }
    }
  }
]
```

---

### 3. Verify Driver Documents (Admin)
```bash
POST /api/drivers/D5432/verify-documents
Content-Type: application/json

{
  "rcVerified": true,
  "photoVerified": true,
  "rcReason": "Document clear and valid",
  "photoReason": "Photo clear, good lighting"
}

✅ Response (200):
{
  "success": true,
  "message": "Documents verified",
  "driver": { ... }
}
```

---

### 4. Approve Driver Account (Admin)
```bash
POST /api/drivers/D5432/approve
Content-Type: application/json

{
  "approved": true,
  "reason": "All documents verified"
}

✅ Response (200):
{
  "id": "D5432",
  "approved": true,
  "status": "offline"
}
```

---

### 5. Driver Login (After Verification)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "id": "D5432",
  "password": "SecurePass@123",
  "role": "driver"
}

✅ Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "D5432", "name": "Ahmed Driver" }
}

❌ Errors:
- "Your Registration Certificate (RC) is pending verification"
- "Your profile photo is pending verification"
- "Your account is pending approval"
- "Your application was rejected"
- "Invalid credentials"
```

---

## 🔄 Full Workflow

```
1. Driver Registration
   POST /api/drivers/register
   ├─ RC required ✅
   ├─ Photo required ✅
   ├─ Strong password required ✅
   └─ Auto-verified if valid ✅

2. Admin Verification (if auto-verification failed)
   POST /api/drivers/:id/verify-documents
   ├─ Verify RC ✅
   ├─ Verify Photo ✅
   └─ Add reasons ✅

3. Admin Approval
   POST /api/drivers/:id/approve
   ├─ Approve account ✅
   └─ Set status to "offline" ✅

4. Driver Login
   POST /api/auth/login
   ├─ Check RC verified ✅
   ├─ Check photo verified ✅
   ├─ Check account approved ✅
   ├─ Check status valid ✅
   └─ Return token ✅ or error ❌
```

---

## 📋 Verification Status Values

| Value | Meaning | Can Login? |
|-------|---------|-----------|
| `auto-verified` | Auto-passed validation | ✅ YES (if approved) |
| `verified` | Admin verified | ✅ YES (if approved) |
| `pending-review` | Waiting for admin | ❌ NO |
| `rejected` | Admin rejected | ❌ NO |
| `not-submitted` | Not uploaded | ❌ NO |

---

## 🚫 What Blocks Login

Any of these will block driver login:
```
❌ RC not verified
❌ Photo not verified
❌ Account not approved
❌ Status is rejected
❌ Password incorrect
```

---

## 💡 Debugging

### Check if driver needs verification
```bash
GET /api/drivers/pending-verification
# If driver ID appears here, document verification pending
```

### Check driver verification status
```bash
GET /api/drivers/D5432
# Look at documentVerification field
```

### Common Issues

| Problem | Solution |
|---------|----------|
| RC not uploading | Ensure file > 100KB |
| Photo not uploading | Ensure file > 100KB |
| Login blocked for RC | Use verify-documents API to verify |
| Login blocked for photo | Use verify-documents API to verify |
| Can't approve driver | First verify documents, then approve |

---

## ✨ Key Rules

✅ **Always True**
- RC required at registration
- Photo required at registration
- Password must be 8+ chars with complexity
- Only verified drivers can login

❌ **Always False**
- Cannot login without verified RC
- Cannot login without verified photo
- Cannot login without approved account
- Cannot login with rejected status

---

**Version**: 1.0.0
**Last Updated**: March 27, 2026
