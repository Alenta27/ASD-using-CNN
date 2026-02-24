# Speech Therapy - Backend Restart & Subscription Testing Guide

## Problem Statement

**User reports**: "After stopping and restarting my web application, it still shows 'Pro' and does not require registration again."

**Expected behavior**: Backend must be the ONLY source of truth. No localStorage Pro flags.

---

## ✅ Architecture Verification

### What's Stored in localStorage (ALLOWED)

| Key | Purpose | Example |
|-----|---------|---------|
| `parentId` | Parent account ID | `"673abc123def456789"` |
| `selectedChildId` | Currently selected child | `"673abc123def456789"` |
| `speech_parent` | Parent info (name, email, phone) | `{"parentName": "John", ...}` |
| `speech_parent_id` | Legacy parent ID | `"673abc123def456789"` |
| `speechParentId` | Legacy parent ID (for SubscriptionModal) | `"673abc123def456789"` |

### What's NOT Stored (FORBIDDEN)

| Key | Status | Why Forbidden |
|-----|--------|--------------|
| `isPro` | ❌ REMOVED | Would bypass backend verification |
| `subscriptionStatus` | ❌ REMOVED | Would bypass backend verification |
| `subscription_${childId}` | ❌ REMOVED | Would create inconsistency |

### Subscription State Flow

```
┌─────────────────────┐
│   App Starts        │
│ (Frontend loads)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Read localStorage:              │
│ - parentId                      │
│ - selectedChildId               │
│ (NO subscription data)          │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Initial State:                  │
│ childSubscription.status = NONE │
│ hasActiveSubscription = false   │
│ Pro Badge = HIDDEN ❌           │
└──────────┬──────────────────────┘
           │
           ▼ (if selectedChildId exists)
┌─────────────────────────────────────────┐
│ Backend Call:                           │
│ GET /subscription-status?childId=xxx    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Backend Response:               │
│ { status: "ACTIVE" | "NONE" }   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Frontend Updates:               │
│ childSubscription.status = ...  │
│ hasActiveSubscription = (...)   │
│ Pro Badge = (if ACTIVE) ✅      │
└─────────────────────────────────┘
```

---

## 🧪 Testing Scenarios

### Test 1: Fresh Start (No Previous Data)

**Goal**: Verify app starts in FREE mode with no subscription.

**Steps**:

1. **Clear ALL data**:
   ```javascript
   // In browser console (F12)
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Navigate to** `/speech-therapy`

3. **Watch console logs**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 [APP INITIALIZATION] Starting...
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📦 [LOCALSTORAGE CHECK]:
     └─ selectedChildId: NOT FOUND
     └─ parentId: NOT FOUND
     └─ speech_parent: NOT FOUND
   ℹ️  No saved child found - starting fresh
   ℹ️  No saved parent found - starting fresh
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ [APP INITIALIZATION] Complete
      → Subscription Status: NONE (will verify from backend)
      → Pro Badge: HIDDEN (until backend confirms)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

4. **Verify UI**:
   - ❌ NO "SPEECH THERAPY PRO" badge
   - ✅ Shows "🆓 ENGLISH IS FREE"
   - ✅ Shows "UPGRADE TO PRO" button
   - ✅ English language unlocked
   - ❌ Malayalam locked (🔒)
   - ❌ Hindi locked (🔒)

**Expected Result**: ✅ App starts in FREE mode, no Pro shown.

---

### Test 2: After Payment (With Valid Subscription)

**Goal**: Verify subscription persists correctly across restarts.

**Steps**:

1. **Complete payment flow**:
   - Register parent
   - Add child
   - Click "UPGRADE TO PRO"
   - Complete Razorpay payment

2. **Verify immediate unlock**:
   ```
   🎉 Premium features unlocked!
   
   You can now select Malayalam or Hindi from the language selector above.
   ```

3. **Watch subscription state logs**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 [SUBSCRIPTION STATE] Current Status:
     👶 Selected Child: 673abc123def456789
     🌍 Selected Language: en-US
     📋 Subscription Status: ACTIVE
     📅 Subscription Expiry: 2027-02-23T10:30:00.000Z
     🔄 Is Verifying: false
     ✅ Has Active Subscription: true
     🔓 Can Access Current Language: true
     🏆 WILL SHOW PRO BADGE: YES ✅
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

4. **Verify UI**:
   - ✅ Shows "⭐ SPEECH THERAPY PRO" badge
   - ✅ Malayalam unlocked
   - ✅ Hindi unlocked
   - ✅ "Refresh" button appears

**Expected Result**: ✅ Premium features unlock immediately after payment.

---

### Test 3: Restart After Payment (CRITICAL TEST)

**Goal**: Verify subscription persists after restarting the application.

**Steps**:

1. **After completing Test 2** (you have an active subscription)

2. **Stop backend server**:
   ```powershell
   # In backend terminal
   Ctrl+C
   ```

3. **Stop frontend server**:
   ```powershell
   # In frontend terminal
   Ctrl+C
   ```

4. **Restart backend**:
   ```powershell
   cd backend
   npm start
   ```

5. **Restart frontend**:
   ```powershell
   cd frontend
   npm start
   ```

6. **Navigate to** `/speech-therapy`

7. **Watch console logs**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 [APP INITIALIZATION] Starting...
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📦 [LOCALSTORAGE CHECK]:
     └─ selectedChildId: 673abc123def456789
     └─ parentId: 673abc123def456788
     └─ speech_parent: FOUND
   📌 Restoring selected child: 673abc123def456789
   ⚠️  IMPORTANT: Subscription will be verified from BACKEND (NO cache used)
   📌 Restoring parent: 673abc123def456788
   ✅ Parent info restored: John Doe
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ [APP INITIALIZATION] Complete
      → Subscription Status: NONE (will verify from backend)
      → Pro Badge: HIDDEN (until backend confirms)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

8. **Watch backend verification**:
   ```
   🔍 Verifying subscription for child: 673abc123def456789
   ⚠️ Backend is SINGLE source of truth - no cache used
   ```

   **Backend logs**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 [SUBSCRIPTION CHECK] Checking subscription for child: John Doe
     📋 Child ID: 673abc123def456789
     📅 Subscription Expiry: 2027-02-23T10:30:00.000Z
     🕐 Current Time: 2026-02-23T10:30:00.000Z
     📅 Expiry Date (parsed): 2027-02-23T10:30:00.000Z
     ⏰ Time until expiry (hours): 8760.00
     ✅ Status: ACTIVE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📤 [SUBSCRIPTION RESPONSE] Sending status: ACTIVE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

9. **After backend responds**:
   ```
   ✅ Subscription verified from backend: ACTIVE
   ```

   **Subscription state updates**:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 [SUBSCRIPTION STATE] Current Status:
     👶 Selected Child: 673abc123def456789
     📋 Subscription Status: ACTIVE
     🔄 Is Verifying: false
     ✅ Has Active Subscription: true
     🏆 WILL SHOW PRO BADGE: YES ✅
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

10. **Verify UI**:
    - ✅ Shows "⭐ SPEECH THERAPY PRO" badge
    - ✅ Malayalam unlocked
    - ✅ Hindi unlocked
    - ✅ Can practice in any language

**Expected Result**: ✅ Pro status correctly restored from backend database.

**THIS IS CORRECT BEHAVIOR** - If user paid, they should keep Pro after restart!

---

### Test 4: Testing "No Subscription" After Restart

**Goal**: Verify that WITHOUT a paid subscription, app starts in FREE mode.

**Prerequisite**: You need to test with a child that has NO subscription in database.

**Option A: Create New Child**

1. After restart, **don't select** the child with subscription
2. Click "Add Child"
3. Create a new child
4. Select the new child
5. Watch logs:
   ```
   🔍 Verifying subscription for child: 673newchild789
   ```

   **Backend logs**:
   ```
   📋 Subscription Status: NONE
   ℹ️  No subscription expiry date found
   ❌ Status: NONE
   ```

6. **Verify UI**:
   - ❌ NO "SPEECH THERAPY PRO" badge
   - ✅ Shows "🆓 ENGLISH IS FREE"
   - ❌ Malayalam locked
   - ❌ Hindi locked

**Option B: Manually Expire Subscription in Database**

```javascript
// Connect to MongoDB and run:
db.speechchildren.updateOne(
  { _id: ObjectId("673abc123def456789") },
  { $set: { subscriptionExpiry: null } }
);
```

Then restart and test - should show FREE mode.

**Expected Result**: ✅ Child without subscription shows FREE mode.

---

## 🐛 Debugging Guide

### Issue: "Shows Pro without payment"

**Diagnosis Steps**:

1. **Check localStorage**:
   ```javascript
   console.table(Object.entries(localStorage));
   ```
   
   **Look for**:
   - ❌ Any key containing "Pro", "premium", "subscription"
   - ✅ Only `parentId`, `selectedChildId`, `speech_parent`

2. **Check database**:
   ```bash
   # MongoDB shell
   use asd_database
   db.speechchildren.findOne({ _id: ObjectId("YOUR_CHILD_ID") })
   ```
   
   **Check** `subscriptionExpiry` field:
   - If it's a future date → Pro is CORRECT
   - If it's null or past → Pro should NOT show

3. **Check console logs**:
   Look for this in browser console:
   ```
   🏆 WILL SHOW PRO BADGE: YES ✅
   ```
   
   This should ONLY appear if backend returned ACTIVE.

4. **Check network tab** (F12 → Network):
   - Find request: `GET /api/speech-therapy/subscription-status?childId=xxx`
   - Check response: `{ "status": "ACTIVE" | "NONE" | "EXPIRED" }`

### Issue: "Lost Pro after restart"

This should NOT happen if:
- Subscription was successfully saved to database
- Backend is running
- Network is working

**Diagnosis Steps**:

1. **Check if backend is running**:
   ```javascript
   fetch('http://localhost:5000/api/speech-therapy/subscription-status?childId=xxx')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```

2. **Check database** - verify subscription exists:
   ```bash
   db.speechchildren.findOne({ _id: ObjectId("YOUR_CHILD_ID") })
   ```

3. **Check console** for errors:
   - Network errors?
   - Timeout (10 second limit)?
   - Backend server crashed?

---

## 📊 Complete Console Log Example (Successful Restart with Subscription)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 [APP INITIALIZATION] Starting...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 [LOCALSTORAGE CHECK]:
  └─ selectedChildId: 673abc123def456789
  └─ parentId: 673abc123def456788
  └─ speech_parent: FOUND
📌 Restoring selected child: 673abc123def456789
⚠️  IMPORTANT: Subscription will be verified from BACKEND (NO cache used)
📌 Restoring parent: 673abc123def456788
✅ Parent info restored: John Doe
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [APP INITIALIZATION] Complete
   → Subscription Status: NONE (will verify from backend)
   → Pro Badge: HIDDEN (until backend confirms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Saved selected child to localStorage: 673abc123def456789
🔍 Verifying subscription for child: 673abc123def456789
⚠️ Backend is SINGLE source of truth - no cache used

[Backend Request Sent]

✅ Subscription verified from backend: ACTIVE (expires: 2027-02-23T10:30:00.000Z)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 [SUBSCRIPTION STATE] Current Status:
  👶 Selected Child: 673abc123def456789
  🌍 Selected Language: en-US
  📋 Subscription Status: ACTIVE
  📅 Subscription Expiry: Tue Feb 23 2027
  🔄 Is Verifying: false
  ✅ Has Active Subscription: true
  🔓 Can Access Current Language: true
  🏆 WILL SHOW PRO BADGE: YES ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Validation Checklist

After restart, verify:

- [ ] No localStorage Pro flags exist
- [ ] Initial subscription status is "NONE"
- [ ] Pro badge is HIDDEN initially
- [ ] Backend verification call is made
- [ ] Backend checks database for subscription
- [ ] Backend returns correct status
- [ ] Frontend updates state from backend response
- [ ] Pro badge shows ONLY if backend confirms ACTIVE
- [ ] Premium languages unlock ONLY if status is ACTIVE
- [ ] Console logs show clear flow

---

## 🎯 Summary

**Key Points**:

1. **localStorage stores ONLY IDs** (parentId, selectedChildId)
2. **NO subscription data cached** in localStorage
3. **On app start**: Status defaults to "NONE"
4. **Backend is queried** for actual subscription state
5. **Pro badge shows** ONLY after backend confirms ACTIVE
6. **If user paid**, Pro correctly persists across restarts (from database)
7. **If user didn't pay**, Free mode shows (even after restart)

**This is CORRECT behavior** - The backend database is the source of truth!
