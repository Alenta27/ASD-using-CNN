# 🔐 Authentication Fix for Razorpay Integration

## Problem
Getting **401 Unauthorized - Invalid token** when clicking "Unlock Everything"

## ✅ What I've Fixed

### 1. Enhanced Token Handling in SubscriptionModal
Updated `frontend/src/components/SubscriptionModal.jsx`:

```javascript
// Now includes:
- Token validation before making request
- Detailed logging for debugging
- Better error messages (shows "Please logout and login again" for 401)
- Authorization header explicitly set with Content-Type
```

### 2. Created Debug Utilities
Created `frontend/src/utils/authDebug.js`:
- `checkAuthStatus()` - Decodes and validates JWT token
- `testBackendAuth()` - Tests if backend accepts the token

### 3. Created Debug Panel
Created `frontend/src/components/AuthDebugPanel.jsx`:
- Visual panel to test authentication
- Test buttons for backend endpoints
- Shows token status

---

## 🧪 How to Debug the Issue

### Step 1: Add Debug Panel (Temporary)

Open `frontend/src/pages/SpeechTherapyChildPage.jsx` and add at the top:

```javascript
import AuthDebugPanel from '../components/AuthDebugPanel';
```

Then add inside the return statement (at the end, before closing div):

```jsx
{/* Temporary debug panel - remove after fixing */}
<AuthDebugPanel />
```

### Step 2: Open Your App

1. **Login** as a parent user
2. Navigate to Speech Therapy page
3. You'll see a **debug panel** in bottom-right corner

### Step 3: Run Tests

Click these buttons in order:

1. **"Check Console"** - Opens browser console with token info
   - Check if token exists
   - Check if token is expired
   - Check token payload (user ID, role)

2. **"Test Backend Auth"** - Tests `/api/subscription/status`
   - Should return your subscription status
   - If fails with 401: token is invalid

3. **"Test Create Order"** - Tests `/api/subscription/create-order`
   - Should create a test order
   - If succeeds: auth is working!

---

## 🔍 Common Issues & Solutions

### Issue 1: No Token Found
**Symptom**: Debug panel shows "❌ Missing"

**Solution**:
1. Logout from your app
2. Login again
3. Token should now be stored

### Issue 2: Token Expired
**Symptom**: Console shows "Is expired: true"

**Solution**:
1. Logout
2. Login again
3. New token will be generated

### Issue 3: Invalid Token Format
**Symptom**: "Invalid JWT format" in console

**Solution**:
```javascript
// Clear localStorage and login again
localStorage.removeItem('token');
localStorage.removeItem('role');
// Then logout and login
```

### Issue 4: Backend Not Running
**Symptom**: "Failed to fetch" or "Network Error"

**Solution**:
```bash
cd backend
node index.js
```

Look for: `🚀 Server Live on Port 5000`

### Issue 5: Wrong JWT_SECRET
**Symptom**: Backend logs show "Invalid token" but token looks valid

**Solution**:
Check `backend/.env` has:
```env
JWT_SECRET=mysecretkey123
```

Restart backend after changing .env

---

## 📋 Complete Working Flow

### Frontend Code (Already Updated)

```javascript
const handleUnlockClick = async () => {
  // 1. Get token
  const token = localStorage.getItem('token');
  
  // 2. Validate token exists
  if (!token) {
    setError('Please login to continue');
    return;
  }
  
  // 3. Create order with proper headers
  const { data: order } = await axios.post(
    'http://localhost:5000/api/subscription/create-order',
    {},  // Empty body
    {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // 4. Open Razorpay with order
  const rzp = new window.Razorpay({
    key: 'rzp_test_RGXWGOBliVCIpU',
    order_id: order.id,
    handler: async (response) => {
      // 5. Verify payment
      await axios.post(
        'http://localhost:5000/api/subscription/verify-payment',
        {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  });
  rzp.open();
};
```

### Backend Code (Already Correct)

```javascript
// routes/subscription.js
router.post('/create-order', verifyToken, async (req, res) => {
  // verifyToken middleware:
  // 1. Checks Authorization header
  // 2. Extracts token
  // 3. Verifies with JWT_SECRET
  // 4. Sets req.user = { id, email, role }
  
  const order = await razorpay.orders.create({
    amount: 99900,
    currency: 'INR',
    receipt: `speech_therapy_pro_${Date.now()}`
  });
  
  res.json({ id: order.id, amount: order.amount, currency: order.currency });
});
```

---

## 🎯 Quick Test Without Modal

Open browser console on any page after login and paste:

```javascript
// Test 1: Check token
const token = localStorage.getItem('token');
console.log('Token:', token ? 'EXISTS' : 'MISSING');

// Test 2: Test create-order
fetch('http://localhost:5000/api/subscription/create-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('✅ SUCCESS:', data);
  alert('Order created: ' + data.id);
})
.catch(err => {
  console.error('❌ FAILED:', err);
  alert('Failed: ' + err.message);
});
```

If this works → **Razorpay will open from modal**
If this fails → **Check error message in console**

---

## 🚀 Final Verification Steps

1. ✅ Backend running on port 5000
2. ✅ MongoDB connected
3. ✅ Razorpay credentials in .env
4. ✅ User logged in (token in localStorage)
5. ✅ Token not expired
6. ✅ JWT_SECRET matches between frontend/backend
7. ✅ Authorization header sent: `Bearer <token>`

---

## 📝 Checklist Before Testing

- [ ] Backend is running (`node index.js`)
- [ ] See "✅ Subscription Routes Registered"
- [ ] See "🚀 Server Live on Port 5000"
- [ ] Frontend is running (`npm start`)
- [ ] User is logged in
- [ ] Browser console is open (F12)
- [ ] Network tab is open to see requests

---

## 🎉 Expected Successful Flow

1. Click "Unlock Everything"
2. Console logs:
   ```
   🔐 Auth Debug Info
   Token exists: true
   Creating Razorpay order...
   Order created successfully: {id: "order_...", amount: 99900}
   Opening Razorpay checkout...
   ```
3. Razorpay modal opens
4. Complete test payment
5. Console logs:
   ```
   Payment successful, verifying...
   Payment verified successfully!
   ```
6. Success message shown
7. User upgraded to PRO

---

## 🆘 If Still Not Working

1. **Clear all and restart**:
   ```javascript
   localStorage.clear();
   // Logout, Login again
   ```

2. **Check backend logs** when clicking button:
   - Should see: "Creating Razorpay order for user: ..."
   - If not appearing: request not reaching backend

3. **Check Network tab**:
   - Request URL should be: `http://localhost:5000/api/subscription/create-order`
   - Request Headers should include: `Authorization: Bearer eyJ...`
   - Status should be: 200 (not 401)

4. **Last resort - verify JWT manually**:
   - Copy token from localStorage
   - Go to https://jwt.io
   - Paste token
   - Check payload has: `id`, `email`, `role`
   - Check "exp" (expiration) is in future

---

## 📞 Need More Help?

Run this diagnostic in console:
```javascript
console.group('🔍 Full Diagnostic');
console.log('1. Token:', localStorage.getItem('token') ? 'YES' : 'NO');
console.log('2. Backend:', 'Check if http://localhost:5000 responds');
console.log('3. User Role:', localStorage.getItem('role'));
console.groupEnd();
```

Then share the console output!
