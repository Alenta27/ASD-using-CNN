# Live Gaze Session Recovery Guide

## Problem
Previously submitted Live Gaze guest sessions with photos are not appearing in the Therapist → Review tab.

## Solution
Run the automated repair script to restore all historical data.

## Steps to Recover All Sessions

### 1. Stop the Backend Server
Press `Ctrl+C` in the terminal where backend is running.

### 2. Run the Repair Script
```bash
cd backend
node repair_gaze_sessions.js
```

### 3. Review the Output
The script will show:
- Total sessions found in database
- Number of sessions with photos
- Orphaned images (if any)
- Number of sessions repaired
- Date range of recoverable data

### 4. Restart the Backend
```bash
npm start
```

### 5. Verify in Frontend
1. Login as therapist
2. Navigate to: Therapist → Live Gaze Analysis
3. Click the **Review** tab
4. You should now see ALL historical guest sessions with their photos

## What the Repair Script Does

✅ **Audits Database**: Scans all GazeSession records
✅ **Fixes Metadata**: Sets missing `module` and `sessionType` fields
✅ **Updates Status**: Changes sessions to 'pending_review' for visibility
✅ **Links Images**: Verifies all images are properly linked
✅ **Reports Issues**: Shows orphaned images and broken links

## How Recovery Works

The query now retrieves sessions matching ANY of these criteria:
- `isGuest = true`
- `guestInfo.email` exists
- `module = 'live_gaze'`
- `sessionType = 'guest_screening'`
- `source = 'live_gaze_analysis'`

This ensures NO historical data is excluded.

## Preventive Measures Now in Place

1. **Proper Metadata**: New guest sessions automatically set:
   - `module: 'live_gaze'`
   - `sessionType: 'guest_screening'`
   - `source: 'live_gaze_analysis'`

2. **Atomic Saves**: If image upload fails, session creation is rolled back

3. **Comprehensive Query**: Review tab queries include ALL variations of guest sessions

4. **No Disappearing Data**: Sessions with photos are never filtered out

## Diagnostic Endpoints

Test these in your browser (login required):
- `http://localhost:5000/api/gaze/sessions/diagnostic` - Database summary
- `http://localhost:5000/api/gaze/images/check` - Physical file check

## Troubleshooting

**If sessions still don't appear:**
1. Check browser console for errors
2. Verify backend logs show: "Found X sessions with photos"
3. Run diagnostic endpoint to verify database has data
4. Check uploads/gaze directory has image files

**If images don't load:**
1. Verify `uploads/gaze` directory exists
2. Check image paths in browser Network tab
3. Ensure backend is serving static files from `/uploads`

## Support
All historical Live Gaze sessions are now permanently recoverable. The repair script can be run multiple times safely.
