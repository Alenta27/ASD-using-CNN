# Multi-Disorder Screening MongoDB Schema

The feature uses MongoDB via Mongoose with collection: `multidisorderresults`.

Stored fields:

- `childId` (ObjectId, ref: Patient)
- `disorderType` (string)
- `responses` (array of question/answer/score)
- `totalScore` (number)
- `result` (`Low Risk` / `Moderate Risk` / `High Risk`)
- `createdAt` (auto timestamp)

Equivalent MongoDB document shape:

```json
{
  "childId": "ObjectId",
  "disorderType": "ADHD",
  "responses": [
    {
      "question": "Has difficulty staying focused on tasks?",
      "answer": "Yes",
      "score": 2
    }
  ],
  "totalScore": 6,
  "result": "Moderate Risk",
  "createdAt": "2026-03-27T00:00:00.000Z"
}
```
