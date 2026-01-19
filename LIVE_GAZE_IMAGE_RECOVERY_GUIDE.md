# LIVE GAZE IMAGE RECOVERY GUIDE

## Overview
This guide helps you recover missing Live Gaze Analysis images in CORTEXA by scanning the database and storage, then re-linking orphaned images to their correct sessions.

## Prerequisites
✅ MongoDB server must be running
✅ Backend server should be stopped during recovery
✅ Backup your database before running recovery (recommended)

## Recovery Process

### Step 1: Start MongoDB
Make sure MongoDB is running. If not, start it:
```bash
# Windows - Run as Administrator
net start MongoDB

# OR if installed via MongoDB Community Edition
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\6.0\bin\mongod.cfg"

# Linux/Mac
sudo systemctl start mongod
# OR
sudo service mongod start
```

### Step 2: Run Image Recovery
```bash
cd backend
npm run recover-images
```

This script will:
1. **Inventory Physical Images** - Scans `uploads/gaze/` directory for all image files
2. **Scan Database** - Finds all Live Gaze sessions (module="live_gaze", sessionType="guest_screening")
3. **Mark Claimed Images** - Identifies which images are already linked to sessions
4. **Match Orphaned Images** - Uses timestamp correlation to match orphaned images to sessions
5. **Re-link Images** - Updates database records with recovered image references
6. **Backfill URLs** - Fixes broken image paths in existing records
7. **Validate Recovery** - Ensures no session is missing images

### Step 3: Verify Recovery
```bash
npm run verify-recovery
```

This will show:
- Total sessions found
- Sessions with/without images
- Breakdown by criteria
- Sample recovered sessions

## Manual Recovery Commands

### Check Database Status
```bash
# Diagnostic - view all sessions
curl http://localhost:5000/api/gaze/sessions/diagnostic \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check physical images
curl http://localhost:5000/api/gaze/images/check \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific session by ID
curl http://localhost:5000/api/gaze/session/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Query Specific Sessions
The API now supports fetching by sessionId:
```javascript
// Fetch specific session
GET /api/gaze/sessions/pending-review?sessionId=67890abcd1234

// Fetch all review sessions
GET /api/gaze/sessions/pending-review
```

## Database Schema

### GazeSession Model
```javascript
{
  _id: ObjectId,
  patientId: ObjectId (optional),
  therapistId: ObjectId (optional),
  isGuest: Boolean,
  sessionType: 'guest_screening' | 'authenticated',
  module: 'live_gaze',
  source: 'live_gaze_analysis',
  guestInfo: {
    childName: String,
    parentName: String,
    email: String
  },
  snapshots: [{
    imagePath: '/uploads/gaze/filename.png',
    timestamp: Date,
    gazeDirection: String,
    attentionScore: Number,
    status: String
  }],
  status: 'pending_review' | 'reviewed',
  startTime: Date,
  endTime: Date
}
```

## Image Matching Algorithm

The recovery script matches orphaned images to sessions using:
1. **Timestamp Correlation** - Matches image timestamp to session start/end time (±2 minute tolerance)
2. **Filename Parsing** - Extracts timestamp from filename format `gaze-{timestamp}-{random}.png`
3. **Batch Linking** - Groups multiple images to same session if timestamps align

## Recovery Statistics

After running, you'll see:
```
📊 RECOVERY REPORT
======================================================================
Total Live Gaze Sessions:        25
  ├─ With Images:                 18
  └─ Without Images (before):     7

Physical Images in Storage:      45
  ├─ Already Linked:              38
  └─ Orphaned (before):           7

Recovery Actions:
  ├─ Images Matched:              7
  ├─ Sessions Relinked:           7
  └─ URLs Backfilled:             3
```

## Troubleshooting

### Issue: "Session X still missing images"
**Solution:** Check if images exist in physical storage with correct timestamp range
```bash
ls -la backend/uploads/gaze/ | grep "gaze-"
```

### Issue: "Cannot connect to MongoDB"
**Solution:** Start MongoDB service first
```bash
# Check if MongoDB is running
netstat -an | findstr "27017"  # Windows
lsof -i :27017                  # Linux/Mac
```

### Issue: "Images exist but not matched"
**Solution:** Check timestamp tolerance - images might be outside ±2 minute window. Adjust `TIMESTAMP_TOLERANCE_MS` in recovery script if needed.

### Issue: "Broken image URLs"
**Solution:** Run the backfill step which fixes relative paths:
- `gaze/file.png` → `/uploads/gaze/file.png`
- `file.png` → `/uploads/gaze/file.png`

## API Enhancements

### Enhanced Review Query
The `/api/gaze/sessions/pending-review` endpoint now:
- ✅ Fetches by sessionId when provided
- ✅ Validates and fixes image URLs automatically
- ✅ Returns all historical guest sessions
- ✅ Includes file existence checks

### New Session Lookup
```javascript
GET /api/gaze/session/:sessionId

Returns:
{
  _id: "...",
  snapshots: [...],
  snapshotCount: 5,
  validImages: 5,
  missingImages: 0,
  // ... session data
}
```

## Data Integrity Rules

✅ **No session with valid sessionId may remain without images**
✅ **All image paths must start with `/uploads/gaze/`**
✅ **Sessions must have module='live_gaze' for Live Gaze sessions**
✅ **Guest sessions must have sessionType='guest_screening'**
✅ **Atomic saves prevent future data loss**

## Next Steps After Recovery

1. Restart backend server
```bash
cd backend
npm start
```

2. Restart frontend
```bash
cd frontend
npm start
```

3. Verify in UI:
   - Login as therapist
   - Navigate to Live Gaze Analysis → Review tab
   - Confirm all historical sessions appear with photos

## Support

If recovery fails or images remain missing:
1. Check MongoDB logs for errors
2. Verify file permissions on `uploads/gaze/` directory
3. Review `stats.errors` array in recovery output
4. Run diagnostic endpoints to investigate specific sessions

## Backup Before Recovery

**Recommended:** Backup your database before running recovery:
```bash
mongodump --db asd_db --out ./backup-$(date +%Y%m%d)
```

To restore if needed:
```bash
mongorestore --db asd_db ./backup-YYYYMMDD/asd_db
```
