# Dataset Management System - Quick Guide

## 🎯 What's New

Your Research Dashboard now has a full **Dataset Management** feature with:
- ✅ Table-based UI displaying all datasets
- ✅ View dataset details with modal popup
- ✅ Download datasets as ZIP files
- ✅ Delete datasets from the system
- ✅ Real-time statistics (Total Datasets, Records, Size)
- ✅ Status badges and type categorization

## 📊 Available Datasets

### 1. **Caltech Brain Imaging Dataset** (MRI Data)
   - **Type:** MRI Data
   - **Format:** BIDS (Brain Imaging Data Structure)
   - **Subjects:** 38 participants
   - **Acquisition:** fMRI (structural and functional)
   - **Location:** `d:\ASD\data\Caltech\`

### 2. **Training Data - ASD vs Normal** (Tabular Data)
   - **Type:** Tabular Data
   - **Format:** CSV
   - **ASD Subjects:** 50
   - **Normal Subjects:** 50
   - **Total Records:** 100
   - **Acquisition:** fMRI Feature Extraction
   - **Location:** `d:\ASD\data\Training Data\`

## 🚀 How to Use

### Viewing Datasets
1. Go to Research Dashboard
2. Click **"Dataset"** in the sidebar
3. See all available datasets in the table

### Viewing Dataset Details
1. Click the **👁️ (View)** button on any dataset row
2. A popup shows full dataset information
3. Click **"Close"** or outside the modal to dismiss

### Downloading a Dataset
1. Click the **⬇️ (Download)** button on any dataset row
2. Dataset is downloaded as a ZIP file
3. Filename format: `{dataset-id}.zip`

### Deleting a Dataset
1. Click the **🗑️ (Delete)** button on any dataset row
2. Confirm the deletion in the popup
3. Dataset is removed from the active list

### Refreshing the List
1. Click the **"Refresh"** button at the top right
2. Dataset list is reloaded from the backend

## 📈 Statistics Dashboard

The top section displays:
- **Total Datasets:** Number of datasets available
- **Total Records:** Sum of all records across datasets
- **Total Size:** Combined size of all datasets
- **Active Datasets:** Number of currently active datasets

## 🔧 Backend Endpoints

### GET `/api/researcher/datasets`
Returns list of all available datasets with metadata
**Response:**
```json
{
  "success": true,
  "datasets": [...],
  "totalCount": 2,
  "totalRecords": 138,
  "totalSize": 15728640000
}
```

### GET `/api/researcher/datasets/{datasetId}/download`
Downloads dataset as ZIP file
- `datasetId` options: `caltech-mri`, `training-data-fmri`

### DELETE `/api/researcher/datasets/{datasetId}`
Marks dataset for deletion/archiving

## 📁 File Structure

### Frontend Files
- `d:\ASD\frontend\src\pages\DatasetPage.jsx` - Main component
- `d:\ASD\frontend\src\pages\DatasetPage.css` - Styling

### Backend Files
- `d:\ASD\backend\routes\researcher.js` - API endpoints (lines 346-527)

## ⚙️ Installation & Setup

### 1. Install Dependencies
```bash
cd d:\ASD\backend
npm install archiver
```

### 2. Start Backend Server
```bash
npm start
```

### 3. Start Frontend Server
```bash
cd d:\ASD\frontend
npm start
```

### 4. Access Dashboard
Navigate to `http://localhost:3000/research/dataset`

## 🎨 UI Features

### Type Badges
- 🔵 **MRI Data** (Blue) - Brain imaging datasets
- 🟢 **Tabular Data** (Green) - CSV feature datasets
- 🟠 **Facial Data** (Orange) - Facial recognition datasets
- 🟣 **Reference Data** (Purple) - Metadata and reference files

### Status Badges
- ✅ **Active** (Green) - Available for download
- 📋 **Archived** (Yellow) - In archive storage
- ❌ **Inactive** (Red) - Disabled datasets

### Action Buttons
- 👁️ **View** - See full dataset details
- ⬇️ **Download** - Download as ZIP
- 🗑️ **Delete** - Remove from active list

## 🔐 Security Notes

- All dataset endpoints require authentication (Bearer token)
- Datasets are stored securely in `d:\ASD\data\`
- Download creates temporary ZIP in memory
- Token validation on all API calls

## 📝 Adding New Datasets

To add a new dataset:
1. Place dataset in `d:\ASD\data\` directory
2. Restart backend server
3. New dataset will automatically appear in the Dashboard

### Supported Formats
- **Directories** (auto-detected as MRI data)
- **CSV files** (auto-detected as tabular data)
- **Nested structures** (BIDS format)

## 🐛 Troubleshooting

### Downloads not working?
- Check if `archiver` package is installed: `npm list archiver`
- Verify dataset path exists in backend
- Check browser console for error messages

### Datasets not showing?
- Refresh the page
- Click the "Refresh" button
- Check backend console for errors
- Verify dataset directories exist

### Delete not working?
- Confirm you have researcher role
- Check authentication token
- Verify dataset ID is correct

## 📞 Support

For issues or feature requests:
1. Check browser console (F12)
2. Check backend console for errors
3. Verify all files are in correct locations
4. Restart both frontend and backend servers

## ✨ Future Enhancements

Planned features:
- [ ] Upload new datasets
- [ ] Dataset versioning
- [ ] Bulk download multiple datasets
- [ ] Search and filter
- [ ] Dataset preview/visualization
- [ ] Access control per dataset
- [ ] Storage quota management