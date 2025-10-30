# Admin Screenings - Backend Integration Guide

## 🎯 Overview

This document provides all the details needed to connect the refactored Admin Screenings page frontend to your backend API.

## 📋 Required API Endpoints

### 1. GET /api/admin/screenings
**Purpose**: Fetch all screenings (with optional filters)

**Frontend Call Location**: `loadScreenings()` function (line 42)

**Request:**
```javascript
const response = await fetch('/api/admin/screenings');
const data = await response.json();
setScreenings(data);
```

**Query Parameters (Optional - for server-side filtering):**
```
GET /api/admin/screenings?riskLevel=Low&status=Completed&startDate=2024-01-01&endDate=2024-12-31
```

**Expected Response (200 OK):**
```json
[
  {
    "id": 1,
    "childId": "child_001",
    "childName": "Alice Johnson",
    "parentName": "John Johnson",
    "type": "Questionnaire",
    "date": "2024-01-15",
    "riskLevel": "Low",
    "status": "Completed"
  },
  {
    "id": 2,
    "childId": "child_002",
    "childName": "Ben Carter",
    "parentName": "Sarah Carter",
    "type": "Image Analysis",
    "date": "2024-01-14",
    "riskLevel": "Medium",
    "status": "Completed"
  }
]
```

**Error Response (500):**
```json
{
  "error": "Failed to fetch screenings",
  "message": "Database connection error"
}
```

---

### 2. DELETE /api/admin/screenings/:id
**Purpose**: Delete a screening record

**Frontend Call Location**: `handleConfirmDelete()` function (line 171)

**Request:**
```javascript
const response = await fetch(`/api/admin/screenings/${screeningToDelete.id}`, {
  method: 'DELETE'
});
if (!response.ok) throw new Error('Failed to delete');
setScreenings(prev => prev.filter(s => s.id !== screeningToDelete.id));
setShowDeleteModal(false);
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Screening deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Screening not found"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to delete screening",
  "message": "Database error"
}
```

---

### 3. GET /api/admin/screenings/:id/download
**Purpose**: Download screening report as PDF/document

**Frontend Call Location**: `handleDownloadReport()` function (line 146)

**Request:**
```javascript
const response = await fetch(`/api/admin/screenings/${screening.id}/download`);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `screening-${screening.childName}-${screening.date}.pdf`;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
document.body.removeChild(a);
```

**Response:**
- Content-Type: `application/pdf` (or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` for .docx)
- Response Body: Binary file data

**Error Response (404):**
```json
{
  "error": "Report not found"
}
```

---

## 🔄 Navigation Routes (Frontend Only - No API Needed)

These routes don't need backend integration yet, but you'll need to create the components.

### View Screening Detail
**Frontend Call**: Clicking View icon or child name
```javascript
navigate(`/admin/screenings/${screening.id}`);
```
**Create**: `/admin/screenings/:id` detail page component

### Edit Screening
**Frontend Call**: Clicking Edit (pencil) icon
```javascript
navigate(`/admin/screenings/${screening.id}/edit`);
```
**Create**: `/admin/screenings/:id/edit` edit page component

---

## 🔐 Authentication

Add authentication headers if your API requires it:

```javascript
const response = await fetch('/api/admin/screenings', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 🛠️ Implementation Steps

### Step 1: Uncomment API Call in loadScreenings()
**File**: `AdminScreeningsPage.jsx` (Line 42-57)

**Change From:**
```javascript
const loadScreenings = async () => {
  try {
    setLoading(true);
    setError(null);
    // TODO: Replace with actual API call
    // const response = await fetch('/api/admin/screenings');
    // const data = await response.json();
    // setScreenings(data);
    setScreenings(defaultScreenings);  // ← REMOVE THIS
  } catch (err) {
    setError('Failed to load screenings');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

**Change To:**
```javascript
const loadScreenings = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/admin/screenings');
    if (!response.ok) throw new Error('Failed to fetch screenings');
    const data = await response.json();
    setScreenings(data);
  } catch (err) {
    setError('Failed to load screenings');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

### Step 2: Wire Up Download Report Handler
**File**: `AdminScreeningsPage.jsx` (Line 146-164)

**Change From:**
```javascript
const handleDownloadReport = async (screening) => {
  try {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/admin/screenings/${screening.id}/download`);
    // ... rest of download logic
    alert(`Downloading report for ${screening.childName}`);
  } catch (err) {
    console.error('Failed to download report:', err);
    setError('Failed to download report');
  }
};
```

**Change To:**
```javascript
const handleDownloadReport = async (screening) => {
  try {
    const response = await fetch(`/api/admin/screenings/${screening.id}/download`);
    if (!response.ok) throw new Error('Failed to download');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screening-${screening.childName}-${screening.date}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Failed to download report:', err);
    setError('Failed to download report');
  }
};
```

### Step 3: Wire Up Delete Handler
**File**: `AdminScreeningsPage.jsx` (Line 171-186)

**Change From:**
```javascript
const handleConfirmDelete = async () => {
  if (!screeningToDelete) return;
  try {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/admin/screenings/${screeningToDelete.id}`, {
    //   method: 'DELETE'
    // });
    // if (!response.ok) throw new Error('Failed to delete');
    setScreenings(prev => prev.filter(s => s.id !== screeningToDelete.id));
    setShowDeleteModal(false);
    setScreeningToDelete(null);
  } catch (err) {
    console.error('Failed to delete screening:', err);
    setError('Failed to delete screening');
  }
};
```

**Change To:**
```javascript
const handleConfirmDelete = async () => {
  if (!screeningToDelete) return;
  try {
    const response = await fetch(`/api/admin/screenings/${screeningToDelete.id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete');
    
    setScreenings(prev => prev.filter(s => s.id !== screeningToDelete.id));
    setShowDeleteModal(false);
    setScreeningToDelete(null);
    // Optional: Show success message
    // setSuccess(`Screening for ${screeningToDelete.childName} deleted successfully`);
  } catch (err) {
    console.error('Failed to delete screening:', err);
    setError('Failed to delete screening');
  }
};
```

---

## 📝 Backend Implementation Examples

### Node.js/Express Example

```javascript
// GET /api/admin/screenings
router.get('/screenings', async (req, res) => {
  try {
    const screenings = await Screening.find()
      .populate('childId', 'name')
      .populate('parentId', 'name');
    
    // Map to frontend format
    const formatted = screenings.map(s => ({
      id: s._id,
      childId: s.childId._id,
      childName: s.childId.name,
      parentName: s.parentId.name,
      type: s.type,
      date: s.date.toISOString().split('T')[0],
      riskLevel: s.riskLevel,
      status: s.status
    }));
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch screenings' });
  }
});

// DELETE /api/admin/screenings/:id
router.delete('/screenings/:id', async (req, res) => {
  try {
    const result = await Screening.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Screening not found' });
    }
    res.json({ success: true, message: 'Screening deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete screening' });
  }
});

// GET /api/admin/screenings/:id/download
router.get('/screenings/:id/download', async (req, res) => {
  try {
    const screening = await Screening.findById(req.params.id)
      .populate('childId', 'name');
    
    if (!screening) {
      return res.status(404).json({ error: 'Screening not found' });
    }
    
    // Generate or fetch PDF
    const pdfBuffer = await generateScreeningPDF(screening);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="screening-${screening.childId.name}-${screening.date.toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download report' });
  }
});
```

### Python/Flask Example

```python
from flask import jsonify, send_file

@admin_bp.route('/screenings', methods=['GET'])
def get_screenings():
    try:
        screenings = Screening.query.all()
        return jsonify([{
            'id': s.id,
            'childId': s.child_id,
            'childName': s.child.name,
            'parentName': s.parent.name,
            'type': s.type,
            'date': s.date.strftime('%Y-%m-%d'),
            'riskLevel': s.risk_level,
            'status': s.status
        } for s in screenings])
    except Exception as e:
        return jsonify({'error': 'Failed to fetch screenings'}), 500

@admin_bp.route('/screenings/<int:id>', methods=['DELETE'])
def delete_screening(id):
    try:
        screening = Screening.query.get(id)
        if not screening:
            return jsonify({'error': 'Screening not found'}), 404
        
        db.session.delete(screening)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Screening deleted successfully'})
    except Exception as e:
        return jsonify({'error': 'Failed to delete screening'}), 500

@admin_bp.route('/screenings/<int:id>/download', methods=['GET'])
def download_screening(id):
    try:
        screening = Screening.query.get(id)
        if not screening:
            return jsonify({'error': 'Screening not found'}), 404
        
        pdf_buffer = generate_screening_pdf(screening)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'screening-{screening.child.name}-{screening.date}.pdf'
        )
    except Exception as e:
        return jsonify({'error': 'Failed to download report'}), 500
```

---

## 🚀 Testing the Integration

### 1. Test with Postman/Curl

```bash
# Get all screenings
curl -X GET http://localhost:5000/api/admin/screenings

# Download report
curl -X GET http://localhost:5000/api/admin/screenings/1/download \
  -o screening-report.pdf

# Delete screening
curl -X DELETE http://localhost:5000/api/admin/screenings/1
```

### 2. Test in Browser

1. Open Admin Screenings page
2. Check browser console for any fetch errors
3. Verify screenings load
4. Try search/filter
5. Try clicking View, Edit, Download
6. Try deleting a screening (confirm modal appears)

### 3. Frontend Error Handling

The component displays errors in a red banner at the top:
```
Failed to load screenings
Failed to delete screening
Failed to download report
```

Check browser console for detailed error messages.

---

## 🔄 Optional Enhancements

### Add Toast Notifications
```javascript
// After successful delete
import { toast } from 'react-toastify';
toast.success(`Screening for ${screeningToDelete.childName} deleted`);
```

### Add Loading Spinner During Delete
```javascript
const [deleting, setDeleting] = useState(false);

const handleConfirmDelete = async () => {
  setDeleting(true);
  try {
    // ... delete logic
  } finally {
    setDeleting(false);
  }
};

// In delete modal button:
<button disabled={deleting} onClick={handleConfirmDelete}>
  {deleting ? 'Deleting...' : 'Delete'}
</button>
```

### Server-Side Filtering
Instead of filtering on frontend, send filters to backend:
```javascript
const handleFilterChange = (filterType, value) => {
  setFilters(prev => ({ ...prev, [filterType]: value }));
  // Reload screenings with new filters
  loadScreeningsWithFilters();
};

const loadScreeningsWithFilters = async () => {
  const params = new URLSearchParams();
  if (filters.riskLevels.length) params.append('riskLevel', filters.riskLevels.join(','));
  if (filters.statuses.length) params.append('status', filters.statuses.join(','));
  if (filters.dateRange.start) params.append('startDate', filters.dateRange.start);
  if (filters.dateRange.end) params.append('endDate', filters.dateRange.end);
  
  const response = await fetch(`/api/admin/screenings?${params}`);
  const data = await response.json();
  setScreenings(data);
};
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: "No screenings found" message
- Check if `/api/admin/screenings` endpoint exists
- Check browser console for fetch errors
- Verify API response format matches expected structure

**Issue**: Delete button doesn't work
- Check if `/api/admin/screenings/:id` DELETE endpoint exists
- Check browser console for 404 or 500 errors
- Verify screening ID is being passed correctly

**Issue**: Download doesn't trigger
- Check if `/api/admin/screenings/:id/download` endpoint exists
- Verify response has correct Content-Type header
- Check browser console for errors

**Issue**: Filters don't apply
- Search and filter happen client-side
- Verify `filteredScreenings` is used in table (not `screenings`)
- Check if filter state is updating in React DevTools