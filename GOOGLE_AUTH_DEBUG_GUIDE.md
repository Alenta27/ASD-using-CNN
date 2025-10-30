# 🔧 Google Authentication Debugging Guide

## ✅ Recent Updates

1. **Backend CORS Configuration**: Enhanced CORS settings to properly handle Google authentication
2. **Improved Error Logging**: Backend now logs detailed information about token verification
3. **Image Issue**: FIXED ✅ - Image is now displaying on login page!

## 🚀 How to Test

### Step 1: Stop Both Servers
```powershell
# Stop backend (Ctrl+C in backend terminal)
# Stop frontend (Ctrl+C in frontend terminal)
```

### Step 2: Restart Backend with Logging
```powershell
cd d:\ASD\backend
npm start
```
**Look for output like:**
```
Server listening on port 5000
MongoDB connected (or warning if not configured)
```

### Step 3: Restart Frontend
```powershell
cd d:\ASD\frontend
npm start
```

### Step 4: Test Google Sign-in
1. Go to `http://localhost:3000/login`
2. **Verify**:
   - ✅ Background image shows on desktop (left side)
   - ✅ "Sign in with Google" button is visible
3. Click "Sign in with Google"
4. Complete Google authentication popup

## 📊 What to Check in Backend Logs

When you click "Sign in with Google", the **backend console** should show:

```
=== Google Auth Request ===
Received Google token: Token received
Token length: [large number like 1000+]
Token preview: eyJhbGciOiJSUzI1NiIs...
Google Client ID being used: 3074679378-fbmg47osjqajq7u4cv0qja7svo00pv3m.apps.googleusercontent.com
Attempting to verify Google token...
✅ Google token verified successfully for: your-email@gmail.com
[Creating new user from Google auth or existing user]
✅ JWT token generated successfully
```

### ❌ If You See Errors:

#### Error: "Invalid Audience"
```
❌ Google token verification failed:
Error message: Invalid Audience
Error code: invalid_audience
```
**Solution**: Client ID mismatch. Verify:
- Backend `.env`: `GOOGLE_CLIENT_ID=...`
- Frontend `.env`: `REACT_APP_GOOGLE_CLIENT_ID=...`
- Both must be identical

#### Error: "Token is expired"
```
Error message: Token is expired
```
**Solution**: Google token was valid but expired. Try again - tokens are usually valid for a short time.

#### Error: "Google Client ID being used: NOT SET"
```
Google Client ID being used: NOT SET
```
**Solution**: Backend `.env` file doesn't have `GOOGLE_CLIENT_ID`. Add it:
```env
GOOGLE_CLIENT_ID=3074679378-fbmg47osjqajq7u4cv0qja7svo00pv3m.apps.googleusercontent.com
```

## 🔍 Browser Console Debugging (F12)

### Check Network Tab
1. Press `F12` → Network tab
2. Try Google sign-in
3. Look for request to `/api/auth/google`
4. Check Response:
   - ✅ Success: `{"message": "Google login successful", "token": "...", "isNewUser": true/false}`
   - ❌ Error: `{"message": "Invalid Google token", "error": "..."}`

### Check Console for Errors
Look for messages like:
- ✅ `Google Login Success!` - Everything working
- ❌ `Error with Google sign in` - Something went wrong
- ❌ `CORS errors` - Backend not allowing the request

## 📋 Verification Checklist

### Backend Files
- [ ] `backend/.env` contains: `GOOGLE_CLIENT_ID=3074679378-fbmg47osjqajq7u4cv0qja7svo00pv3m.apps.googleusercontent.com`
- [ ] `backend/routes/auth.js` line 14 uses `process.env.GOOGLE_CLIENT_ID`
- [ ] `backend/index.js` has enhanced CORS configuration

### Frontend Files
- [ ] `frontend/.env` contains: `REACT_APP_GOOGLE_CLIENT_ID=3074679378-fbmg47osjqajq7u4cv0qja7svo00pv3m.apps.googleusercontent.com`
- [ ] `frontend/src/index.js` uses `process.env.REACT_APP_GOOGLE_CLIENT_ID`
- [ ] `frontend/src/pages/LoginPage.jsx` has GoogleLogin component

### Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select project: **asdd-98bf2**
3. APIs & Services → Credentials
4. Click your OAuth 2.0 Client ID
5. Verify:
   - [ ] **Authorized JavaScript Origins** includes: `http://localhost:3000`
   - [ ] **Authorized redirect URIs** includes: `http://localhost:3000`

## 🎯 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Invalid Google token" error | Check Client ID matches in backend `.env`, frontend `.env`, and Google Console |
| CORS errors in console | Backend is now fixed - restart both servers |
| Image not showing | Fixed! Hard refresh with Ctrl+F5 |
| Button doesn't appear | Check browser console for JavaScript errors |
| Token verification takes forever | Google API might be slow, wait a few seconds |

## 📝 Files Modified in This Session

| File | Change |
|------|--------|
| `backend/index.js` | Enhanced CORS configuration with explicit origin/methods |
| `backend/routes/auth.js` | Line 14: Uses env var for Client ID; Added detailed logging |
| `frontend/src/pages/LoginPage.jsx` | Lines 185-190: Added image styling with fallback |

## 🚨 Quick Troubleshooting Steps

1. **Restart everything**:
   ```powershell
   # Ctrl+C on both servers
   # Restart backend: npm start (from d:\ASD\backend)
   # Restart frontend: npm start (from d:\ASD\frontend)
   ```

2. **Check backend is running**:
   ```powershell
   curl http://localhost:5000/api/health
   # Should show: {"status":"OK",...}
   ```

3. **Check logs carefully**:
   - Look at backend console when you click Google sign-in
   - Look at browser console (F12) for any errors
   - Check Network tab to see actual API response

4. **Verify environment variables**:
   ```powershell
   # In backend console after restart, it should log the Client ID
   ```

## ✅ Expected Success Flow

1. Click "Sign in with Google"
2. Google popup appears → Authenticate
3. Backend logs show: `✅ Google token verified successfully for: your-email@gmail.com`
4. You get redirected to either:
   - `/select-role` (new user)
   - Your dashboard (existing user)

---

**Pro Tip**: If testing with multiple Google accounts, use Incognito/Private mode to avoid cached authentication.