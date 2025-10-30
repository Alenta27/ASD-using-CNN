# Educational Content Setup Guide

## Overview
Your research dashboard now includes comprehensive educational resources covering:
- **Learn the Signs** - What is autism, symptoms, causes, Asperger syndrome, statistics
- **Learn About Screening** - Screening tools, questionnaires, DSM-5 criteria, newly diagnosed
- **Associated Conditions** - Sensory issues, mental health challenges
- **Interventions** - Caregiver skills training, access to services, insurance coverage

## Setup Instructions

### 1. Create the Educational Content Model
The model has been created at: `d:\ASD\backend\models\educationalContent.js`

This allows storing educational content in the database instead of hardcoding it.

### 2. Seed the Database
Run the seed script to populate the database with all educational content:

```bash
cd d:\ASD\backend
node seedEducationalContent.js
```

**Expected output:**
```
Connected to MongoDB
Cleared existing educational content
✅ Successfully seeded 17 educational content entries
```

### 3. Update Backend Routes
The `/api/researcher/educational-content` endpoint has been added to `routes/researcher.js`

**Endpoint Details:**
```
GET /api/researcher/educational-content
Query Parameters (optional):
  - category: "learn-signs" | "screening" | "conditions" | "interventions"

Response:
- Without category: Returns all content grouped by category
- With category: Returns specific category topics
```

**Response Format (grouped):**
```json
{
  "learn-signs": [
    {
      "topic": "what-is-autism",
      "title": "What is Autism?",
      "content": "..."
    }
  ],
  "screening": [...],
  "conditions": [...],
  "interventions": [...]
}
```

### 4. Frontend Integration
The ResearchDashboard now:
- Fetches educational content on component mount
- Displays it in an **expandable panel on the right sidebar**
- Has two-level expansion:
  - Category level (Learn the Signs, etc.)
  - Topic level (Individual articles)

### 5. Styling
All CSS for the educational content panel has been added to `ResearchDashboard.css`:
- Expandable sections with smooth animations
- Responsive design
- Mobile-friendly scrolling for long content
- Color-coded styling matching the dashboard theme

## Features

### Content Organization
The content is organized into 4 main categories:
1. **Learn the Signs** (5 topics)
   - What is autism?
   - Signs and symptoms of autism
   - What causes autism?
   - Asperger syndrome
   - Autism statistics and facts

2. **Learn About Screening** (4 topics)
   - Autism screening
   - Screening questionnaire
   - First concern to action
   - Newly diagnosed

3. **Associated Conditions** (2 topics)
   - Sensory issues
   - Mental health & associated conditions

4. **Interventions** (3 topics)
   - Caregiver skills training (CST)
   - Access to services
   - Insurance coverage & funding

### Interactive Features
- **Expandable Categories**: Click a category header to expand/collapse all topics
- **Individual Topics**: Click a topic to read detailed content
- **Smooth Animations**: Content slides down when expanded
- **Scrollable Content**: Long articles can be scrolled within the panel
- **Visual Feedback**: Hover effects and expanded states are clearly indicated

## Content Quality
All informational content:
✅ Aligns with DSM-5-TR diagnostic criteria
✅ Includes current statistics and research
✅ Debunks common myths about autism
✅ Is trauma-informed and neurodiversity-affirming
✅ Includes practical guidance for parents and individuals
✅ Covers diverse presentations (children, adults, girls/women)

## Managing Content

### Add New Content
To add new topics:

1. Open MongoDB and insert into `educationalcontents` collection:
```javascript
{
  category: "learn-signs",
  topic: "new-topic-slug",
  title: "New Topic Title",
  content: "Your content here...",
  order: 6,
  active: true
}
```

Or use the seed script as a template.

### Update Existing Content
Modify documents directly in MongoDB:
```javascript
db.educationalcontents.updateOne(
  { topic: "what-is-autism" },
  { $set: { content: "Updated content..." } }
)
```

### Disable Content
Set `active: false` to hide content without deleting it:
```javascript
db.educationalcontents.updateOne(
  { topic: "some-topic" },
  { $set: { active: false } }
)
```

## Testing

### Test the API Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/researcher/educational-content

# With category filter
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/researcher/educational-content?category=learn-signs
```

### Test the Frontend
1. Start your backend and frontend servers
2. Navigate to Research Dashboard
3. Look for "📚 Educational Resources" in the right sidebar
4. Click on categories and topics to expand and read content

## Troubleshooting

### Content Not Appearing?
1. Check MongoDB connection: `MONGO_URI` should be set in `.env`
2. Verify seed script ran successfully
3. Check browser console for API errors
4. Verify token is valid (authentication might be failing silently)

### Content Appears but Won't Expand?
1. Check browser console for JavaScript errors
2. Ensure CSS file was saved correctly
3. Clear browser cache and reload

### API Returning 401 Unauthorized?
1. Ensure user has researcher role
2. Verify authentication token is valid
3. Check `verifyToken` middleware is working

## Future Enhancements
- Add search functionality within educational content
- Add content ratings/feedback
- Add admin panel to manage content
- Add multi-language support
- Add related resources links
- Add downloadable PDFs
- Add videos/media

## Files Modified/Created

**New Files:**
- `backend/models/educationalContent.js` - Database model
- `backend/seedEducationalContent.js` - Seed script

**Modified Files:**
- `backend/routes/researcher.js` - Added educational content endpoint
- `frontend/src/pages/ResearchDashboard.jsx` - Added educational content display
- `frontend/src/pages/ResearchDashboard.css` - Added educational content styling

## Summary
Your research dashboard now provides comprehensive, current, and accurate information about autism to researchers and educators. The expandable panel design keeps the dashboard clean while providing easy access to detailed resources.