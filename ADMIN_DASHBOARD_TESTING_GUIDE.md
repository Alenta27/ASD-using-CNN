# Admin Dashboard - Quick Testing Guide

## 🚀 Start the Application

### Terminal 1 - Backend
```bash
cd D:\ASD\backend
npm start
```

### Terminal 2 - Frontend  
```bash
cd D:\ASD\frontend
npm start
```

---

## 🧪 Test the APIs

### 1. Test Metrics Endpoint
Open browser or use curl:
```
http://localhost:5000/api/admin/metrics
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "pendingApprovals": 3,
    "totalActiveUsers": 127,
    "screeningsThisMonth": 45
  }
}
```

### 2. Test Screening Trends Endpoint
```
http://localhost:5000/api/admin/screening-trends
```

Expected Response:
```json
{
  "success": true,
  "data": [
    { "month": "August", "screenings": 52 },
    { "month": "September", "screenings": 61 },
    { "month": "October", "screenings": 75 },
    { "month": "November", "screenings": 68 },
    { "month": "December", "screenings": 83 },
    { "month": "January", "screenings": 45 }
  ]
}
```

---

## 📊 Test Dashboard UI

1. Open browser: `http://localhost:3000`
2. Login with admin credentials
3. Navigate to Admin Dashboard
4. Verify:
   - ✅ "Pending Approvals" card shows real count
   - ✅ "Total Active Users" card shows real count  
   - ✅ "Screenings This Month" card shows real count
   - ✅ Chart displays 6 months of data (August - January)
   - ✅ All values update when database changes

---

## 🔍 Verify Real Data

### Check Database Directly
```javascript
// In backend terminal or MongoDB shell
use asd_database

// Count pending users
db.users.countDocuments({ status: 'pending' })

// Count active users
db.users.countDocuments({ isActive: true })

// Count screenings this month
db.screenings.countDocuments({
  createdAt: { 
    $gte: new Date('2026-01-01'), 
    $lt: new Date('2026-02-01') 
  }
})
```

---

## ✅ What Changed

### Backend Changes:
- **New Endpoint**: `/api/admin/metrics` - Real database metrics
- **Updated Endpoint**: `/api/admin/screening-trends` - Now returns 6 months (August - January)
- **Removed**: All hardcoded/dummy data fallbacks

### Frontend Changes:
- **API Calls**: Updated to use new `/api/admin/metrics` endpoint
- **Chart**: Now displays all 6 months dynamically from API
- **Fallback**: Graceful handling if API fails (shows 0 instead of crashing)

---

## 🎯 Key Features

1. **Real-Time Data**: All metrics from MongoDB
2. **No Dummy Data**: 100% authentic database queries
3. **Fallback Handling**: Graceful degradation if DB unavailable
4. **Chart-Ready**: JSON formatted for direct chart rendering
5. **Academic Ready**: Clean code for evaluation

---

## 📝 API Documentation

### GET /api/admin/metrics
- **Purpose**: Dashboard statistics
- **Auth**: Optional (Bearer token)
- **Returns**: Pending approvals, active users, screenings count

### GET /api/admin/screening-trends  
- **Purpose**: Month-wise screening data
- **Auth**: Optional (Bearer token)
- **Returns**: Array of 6 months with screening counts

---

## 🐛 Troubleshooting

### Problem: All metrics show 0
**Solution**: Database is empty. Add test data or wait for real screenings.

### Problem: Chart not visible
**Solution**: Check browser console for errors. Verify API response.

### Problem: API returns 500 error
**Solution**: Check backend logs. Verify MongoDB connection.

---

## 📦 Files Modified

1. `backend/routes/admin.js` - Added real DB queries
2. `frontend/src/pages/AdminDashboard.jsx` - Updated to use real APIs

---

## 🎓 For Academic Evaluation

This implementation demonstrates:
- ✅ Real database integration (MongoDB)
- ✅ RESTful API design
- ✅ Clean code architecture
- ✅ Error handling and fallbacks
- ✅ Chart data visualization
- ✅ No hardcoded values

All data is **authentic** and pulled from the database in real-time.
