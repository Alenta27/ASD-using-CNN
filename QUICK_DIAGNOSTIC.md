# Quick Diagnostic - Run in Browser Console

Open browser console (F12) and paste this:

```javascript
console.clear();
console.log('═══════════════════════════════════════════════');
console.log('🔍 SPEECH THERAPY - DIAGNOSTIC CHECK');
console.log('═══════════════════════════════════════════════');

// 1. Check localStorage
console.log('\n📦 localStorage Contents:');
const allKeys = Object.keys(localStorage);
console.log('Total keys:', allKeys.length);

// Check for forbidden keys
const forbiddenKeys = ['isPro', 'subscriptionStatus', 'hasPro', 'speech_user'];
const foundForbidden = allKeys.filter(k => 
  forbiddenKeys.includes(k) || k.startsWith('subscription_')
);

if (foundForbidden.length > 0) {
  console.log('❌ FOUND FORBIDDEN KEYS:', foundForbidden);
  console.log('⚠️  These should be removed!');
} else {
  console.log('✅ No forbidden subscription keys found');
}

// Check allowed keys
console.log('\n✅ Allowed Keys:');
console.log('  parentId:', localStorage.getItem('parentId') || 'NOT SET');
console.log('  selectedChildId:', localStorage.getItem('selectedChildId') || 'NOT SET');
console.log('  speechParentId:', localStorage.getItem('speechParentId') || 'NOT SET');

// Check speech_parent
const speechParent = localStorage.getItem('speech_parent');
if (speechParent) {
  try {
    const data = JSON.parse(speechParent);
    console.log('  speech_parent:', data.parentName || 'FOUND');
  } catch(e) {
    console.log('  speech_parent: CORRUPTED');
  }
} else {
  console.log('  speech_parent: NOT SET');
}

// 2. Check if backend verification will happen
const childId = localStorage.getItem('selectedChildId');
if (childId) {
  console.log('\n🔍 Backend Verification:');
  console.log('  Child ID found:', childId);
  console.log('  Will verify subscription from backend...');
  
  // Test backend call
  fetch(`http://localhost:5000/api/speech-therapy/subscription-status?childId=${childId}`)
    .then(r => r.json())
    .then(data => {
      console.log('\n📡 Backend Response:');
      console.log('  Status:', data.status);
      console.log('  Expiry:', data.expiry || 'NONE');
      console.log('  Child Name:', data.childName);
      
      if (data.status === 'ACTIVE') {
        console.log('\n✅ PRO SUBSCRIPTION ACTIVE');
        console.log('   This child has a valid subscription in database');
        console.log('   Pro badge WILL show (This is CORRECT)');
      } else {
        console.log('\n❌ NO ACTIVE SUBSCRIPTION');
        console.log('   Pro badge should NOT show');
        console.log('   Free mode should be active');
      }
      
      console.log('\n═══════════════════════════════════════════════');
      console.log('✅ Diagnostic Complete');
      console.log('═══════════════════════════════════════════════');
    })
    .catch(err => {
      console.log('\n❌ Backend Error:', err.message);
      console.log('   Make sure backend is running on port 5000');
      console.log('\n═══════════════════════════════════════════════');
    });
} else {
  console.log('\n📭 No child selected');
  console.log('   Pro badge should NOT show');
  console.log('   Free mode should be active');
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Diagnostic Complete');
  console.log('═══════════════════════════════════════════════');
}
```

---

## What to Look For:

### ✅ CORRECT (Fresh Start):
```
✅ No forbidden subscription keys found
📭 No child selected
   Pro badge should NOT show
```

### ✅ CORRECT (After Payment):
```
✅ No forbidden subscription keys found
Child ID found: 673abc...
Backend Response:
  Status: ACTIVE
  Expiry: 2027-02-23...
✅ PRO SUBSCRIPTION ACTIVE
   Pro badge WILL show (This is CORRECT)
```

### ❌ PROBLEM:
```
❌ FOUND FORBIDDEN KEYS: ['isPro', 'subscription_673abc...']
```

**If you see forbidden keys**, run:
```javascript
localStorage.clear();
location.reload();
```

---

## Quick Fix Commands:

### Clear All Data and Restart Fresh:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Check What Backend Says:
```javascript
const childId = localStorage.getItem('selectedChildId');
fetch(`http://localhost:5000/api/speech-therapy/subscription-status?childId=${childId}`)
  .then(r => r.json())
  .then(console.log);
```

### Remove Only Forbidden Keys:
```javascript
const forbidden = ['isPro', 'subscriptionStatus', 'hasPro', 'speech_user'];
forbidden.forEach(k => localStorage.removeItem(k));
Object.keys(localStorage)
  .filter(k => k.startsWith('subscription_'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```
