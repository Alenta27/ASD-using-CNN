# 🎯 How to Start Application in FREE Mode (No Pro)

## Problem
When you start the application with `npm start`, it shows "⭐ SPEECH THERAPY PRO" badge because there's subscription data in your MongoDB database from previous test payments.

## ✅ Solution: Auto-Clear Subscriptions on Startup

I've added a development mode feature that automatically clears all subscriptions when the backend starts.

---

## 🚀 Quick Start in FREE Mode

### Step 1: Backend is Already Configured

The `.env` file now has:
```
CLEAR_SUBSCRIPTIONS=true
```

This means **every time you start the backend**, it will automatically clear all subscriptions from the database.

### Step 2: Restart Backend

```powershell
# Stop backend (if running): Ctrl+C

# Start backend
cd backend
npm start
```

You should see:
```
✅ MongoDB Connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧹 [DEV MODE] Clearing all subscriptions...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Cleared X SpeechChild subscriptions
✅ Cleared X Patient subscriptions
✅ Reset X User Pro plans to FREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 All subscriptions cleared!
   App will start in FREE mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Restart Frontend

```powershell
# Stop frontend (if running): Ctrl+C

# Clear browser localStorage
# In browser console (F12):
localStorage.clear();

# Start frontend
cd frontend
npm start
```

### Step 4: Navigate to Speech Therapy

Go to: `http://localhost:3000/speech-therapy`

**Expected Result:**
- ❌ NO "⭐ SPEECH THERAPY PRO" badge
- ✅ Shows "🆓 ENGLISH IS FREE"
- ✅ Shows "UPGRADE TO PRO" button
- ❌ Malayalam locked (🔒)
- ❌ Hindi locked (🔒)

---

## 🔄 Toggle Between FREE and Pro Mode

### To Test FREE Mode (No Subscriptions)

In `backend/.env`:
```
CLEAR_SUBSCRIPTIONS=true
```

Then restart backend with `npm start`

### To Preserve Pro Subscriptions

In `backend/.env`:
```
CLEAR_SUBSCRIPTIONS=false
```

Or remove the line entirely, then restart backend.

This is useful when you want to test Pro features without paying again.

---

## 🧪 Complete Test Flow

### Test 1: Fresh Start (FREE Mode)

1. **Set** `CLEAR_SUBSCRIPTIONS=true` in `backend/.env`
2. **Restart backend**: `npm start`
3. **Clear browser localStorage**: `localStorage.clear()`
4. **Restart frontend**: `npm start`
5. **Navigate to**: `/speech-therapy`

**Result**: App starts in FREE mode ✅

### Test 2: After Payment (Pro Mode)

1. Complete Razorpay payment
2. Verify Pro unlocks immediately
3. **Set** `CLEAR_SUBSCRIPTIONS=false` in `backend/.env`
4. **Restart both servers**
5. **Navigate to**: `/speech-therapy`

**Result**: Pro persists from database ✅

### Test 3: Clear Pro After Testing

1. **Set** `CLEAR_SUBSCRIPTIONS=true` in `backend/.env`
2. **Restart backend**
3. **Refresh frontend**

**Result**: Pro cleared, back to FREE mode ✅

---

## 📝 Console Logs to Watch

### Backend on Startup (with CLEAR_SUBSCRIPTIONS=true):
```
✅ MongoDB Connected
🧹 [DEV MODE] Clearing all subscriptions...
✅ Cleared 2 SpeechChild subscriptions
✅ Cleared 0 Patient subscriptions
✅ Reset 1 User Pro plans to FREE
🎉 All subscriptions cleared!
```

### Frontend on Page Load:
```
🚀 [APP INITIALIZATION] Starting...
🧹 [CLEANUP] Removing cached subscription data...
✅ [CLEANUP] Complete - No cached subscription data
📦 [LOCALSTORAGE CHECK]:
  └─ selectedChildId: NOT FOUND
  └─ parentId: NOT FOUND
✅ [APP INITIALIZATION] Complete
   → Subscription Status: NONE
   → Pro Badge: HIDDEN ❌
```

---

## 🎯 Summary

**With `CLEAR_SUBSCRIPTIONS=true`:**
- Backend clears database subscriptions on every start
- App always starts in FREE mode
- Perfect for testing registration/payment flow

**With `CLEAR_SUBSCRIPTIONS=false`:**
- Backend preserves existing subscriptions
- Pro persists across restarts
- Perfect for testing Pro features

**Now you can easily control whether the app starts in FREE or Pro mode!**
