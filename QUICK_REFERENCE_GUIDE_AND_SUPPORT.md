# 🚀 Quick Reference: Guide & Support Feature

## 👥 For Therapists

### How to Access
1. Log in to Therapist Dashboard
2. Look for **"Guide & Support"** button (top-right corner)
3. Click to open AI assistant widget

### What You Can Ask
Type any question about:
- "Explain ASD results" → Clinical interpretation guidance
- "Suggest interventions" → Evidence-based therapy recommendations
- "Talk to parents" → Communication strategies
- "Track progress" → Documentation guidance
- "Latest research" → Current best practices
- "Sensory activities" → Regulation and activity ideas

### Quick Start (4 Pre-Made Buttons)
1. 💡 **Interventions** - Therapy suggestions for different ASD levels
2. 💬 **Parent Communication** - How to explain results empathetically
3. 🔬 **Research** - 2024 evidence-based practices
4. 🎨 **Sensory Support** - Regulation techniques and activities

### Remember
✓ This is guidance to support YOUR clinical decision-making
✓ Always use your professional judgment
✓ Tool is best for general recommendations, not specific cases
✓ Ask follow-up questions for deeper understanding

---

## 👨‍💻 For Developers

### Key Files Modified
```
frontend/src/pages/TherapistDashboard.jsx       (+335 lines)
frontend/src/pages/TherapistDashboard.css       (+169 lines)
```

### Button Implementation
```javascript
// Line 71 in TherapistDashboard.jsx
<button className="assistant-trigger" onClick={onOpenAssistant}>
  <FiHelpCircle className="assistant-trigger-icon" />
  Guide & Support
</button>
```

### Knowledge Base Structure
```javascript
const therapyGuidance = {
  asdExplanation: { trigger: [...], response: "..." },
  mriResults: { trigger: [...], response: "..." },
  interventions: { trigger: [...], response: "..." },
  parentCommunication: { trigger: [...], response: "..." },
  progressTracking: { trigger: [...], response: "..." },
  research: { trigger: [...], response: "..." },
  sensory: { trigger: [...], response: "..." }
}
```

### Adding New Guidance Domain
```javascript
// Add to therapyGuidance object:
newTopic: {
  trigger: ['keyword1', 'keyword2', 'keyword3'],
  response: `📌 Title\n\nYour guidance content here...`
}
```

### Main Functions
| Function | Purpose |
|----------|---------|
| `generateAssistantResponse()` | Matches query to guidance domain |
| `handleAssistantSend()` | Processes user message |
| `handleAssistantPrompt()` | Handles quick-prompt buttons |
| `openAssistant()` | Opens widget with greeting |

### CSS Classes
```css
.assistant-overlay        /* Full-screen backdrop */
.assistant-widget         /* Card container */
.assistant-header         /* Title bar */
.assistant-body           /* Message area */
.assistant-message        /* Message bubble base */
.assistant-message-user   /* User message styling */
.assistant-message-bot    /* Bot message styling */
.assistant-input-row      /* Input area */
.assistant-send           /* Send button */
```

### Building & Testing
```bash
# Build frontend
npm run build --prefix "d:\ASD\frontend"

# Test locally
npm start --prefix "d:\ASD\frontend"
```

---

## 📚 Knowledge Base Reference

### 1. ASD Explanation
**Keywords:** "explain asd", "what is asd", "autism spectrum"
**Covers:** Clinical overview, spectrum presentation, intervention benefits

### 2. MRI/CNN Results
**Keywords:** "interpret mri", "cnn result", "explain severity"
**Covers:** Severity levels (mild/moderate/severe) with recommendations

### 3. Interventions
**Keywords:** "suggest intervention", "therapy plan", "what activities"
**Covers:** ABA, Speech/OT, Social skills with specifics

### 4. Parent Communication
**Keywords:** "talk to parents", "explain results", "parent communication"
**Covers:** Framing strategies, talking points, tone guidance

### 5. Progress Tracking
**Keywords:** "track progress", "document session", "summarize progress"
**Covers:** What to record, data-driven metrics, adjustments

### 6. Research & Best Practices
**Keywords:** "latest research", "evidence-based", "new findings"
**Covers:** 2024 standards, early intervention, family-centered care

### 7. Sensory Support
**Keywords:** "sensory", "overwhelmed", "stimming"
**Covers:** Stimming understanding, sensory activities, safe spaces

---

## 🎨 Design System

### Colors
```
Primary Pink:      #ff1493  (User messages, active states)
Light Pink:        #ffcde6  (Header background)
Very Light Pink:   #ffe4ef  (Bot messages)
Dark Magenta:      #7a2f51  (Text accents)
White:             #ffffff  (Base background)
Light Gray:        #f7dbe8  (Borders)
```

### Typography
```
Font Family: 'Nunito', system fonts
Sizes:
  Title:      18px bold
  Message:    13px regular
  Button:     14px bold
  Input:      14px regular
```

### Spacing
```
Widget Width:      380px (responsive to 90vw)
Max Message Height: 360px (scrollable)
Header Padding:    16px 20px
Body Padding:      24px 20px 16px
Input Padding:     12px 18px
```

### Animations
```
Widget Open:  fadeInUp (0.25s ease)
Button Hover: transform translateY(-1px)
Send Click:   box-shadow animation
```

---

## 🔧 Customization Tips

### Change Button Text
```javascript
// In MainContent component, line 71
Guide & Support  // Change this text
```

### Change Button Icon
```javascript
// At top of file, import line 3
FiHelpCircle     // Replace with any icon from react-icons
```

### Change Welcome Message
```javascript
// In openAssistant(), line 402
text: `👋 Welcome Dr. ${therapistName || 'Therapist'}!...`
```

### Modify Quick Prompts
```javascript
// Lines 449-460 in assistant widget
<button className="assistant-prompt" 
  onClick={() => handleAssistantPrompt("Your prompt here")}>
  📋 Your Label
</button>
```

### Customize Colors
```css
/* TherapistDashboard.css */
.assistant-header {
  background-color: #ffcde6;  /* Change this */
}
.assistant-message-user {
  background-color: #ff1493;  /* Change this */
}
.assistant-message-bot {
  background-color: #ffe4ef;  /* Change this */
}
```

---

## 🐛 Troubleshooting

### Widget Won't Open
- Check browser console for errors
- Verify token exists in localStorage
- Confirm therapistName is being fetched

### Messages Not Showing
- Clear browser cache
- Check if assistantMessages state is updating
- Verify keyword matching is working

### Styling Issues
- Rebuild: `npm run build`
- Clear browser cache
- Verify CSS file is imported

### Keywords Not Matching
- Check trigger array spelling
- Use lowercase in query matching
- Verify trigger includes exact phrase needed

---

## 📊 Usage Statistics (For Future Analytics)

### Potential Metrics to Track
- Most-asked questions (identify knowledge gaps)
- Feature usage patterns (which domains most accessed)
- Response satisfaction (add rating system)
- Time spent in assistant (engagement metric)
- Common follow-up questions (knowledge base improvement)

---

## 🚀 Future Ideas

### Phase 2 Enhancements
- **Context Awareness:** Access patient data for personalized recommendations
- **Export Functionality:** Save conversations as notes
- **Voice Input:** Hands-free query submission
- **Analytics Dashboard:** Track most-used features
- **Multi-Language:** Spanish, Portuguese, other languages
- **Custom Domains:** Organization-specific guidance
- **Report Generation:** Auto-format documentation

### Integration Opportunities
- Patient record system (for context)
- Therapy notes (pull relevant info)
- Appointment system (remind of guidelines)
- Parent communication system (draft letters)

---

## 📞 Support & Questions

### Common Questions

**Q: Can the assistant replace clinical judgment?**
A: No, it provides guidance to support your professional decision-making.

**Q: Does it access patient data?**
A: Currently no - it provides general guidance. Future versions may include patient context.

**Q: Can I customize the responses?**
A: Yes! Developers can edit the therapyGuidance object or add new domains.

**Q: Is there a character limit for queries?**
A: No practical limit - type whatever question you have.

**Q: Does it learn from usage?**
A: Currently no - responses are pre-composed. Could be enhanced with ML in future.

---

## 🎓 Training Tips for Therapists

### Onboarding Checklist
- ✓ Show therapists the "Guide & Support" button
- ✓ Have them click to open widget
- ✓ Try each of the 4 quick-prompt buttons
- ✓ Test a custom question relevant to their work
- ✓ Show how to close and reopen
- ✓ Discuss when/how to use during workflow

### Best Practices
- Use before sessions for intervention planning
- Reference during documentation
- Prepare for parent meetings
- Quick clinical reference lookups
- Continuing education

### Use Cases
```
"Before Session"
→ What interventions should I focus on?
→ How do I address challenging behavior?

"During Documentation"
→ How should I record this observation?
→ What metrics matter most?

"Before Parent Meeting"
→ How do I explain these results?
→ What positive outcomes can I highlight?

"Continuing Education"
→ What's new in ASD therapy?
→ What are evidence-based practices?
```

---

## 📋 Deployment Checklist

Before going live, verify:
- ✅ All 7 guidance domains are content-complete
- ✅ All trigger keywords are distinct
- ✅ Responses are clinically accurate
- ✅ Tone is professional and empathetic
- ✅ CSS styling is consistent with theme
- ✅ Widget appears in correct position
- ✅ Message formatting is readable
- ✅ Quick prompts are helpful
- ✅ Build completes without errors
- ✅ Testing on multiple browsers
- ✅ Mobile responsiveness verified
- ✅ Therapists trained on usage

---

## 🎯 Success Metrics

### For Therapists
- Time to find clinical guidance (should be <10 seconds)
- User satisfaction with responses
- Frequency of use
- Relevance of recommendations

### For Business
- User adoption rate
- Feature engagement (% of therapists using)
- Support ticket reduction
- Professional development improvement

---

**Quick Start:** Click "Guide & Support" → Ask a question → Get clinical guidance!

🚀 **The feature is live and ready to use!**