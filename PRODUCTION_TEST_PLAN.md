# Production Test Plan - ReviewFlow AI

## Overview
This document outlines the complete end-to-end testing plan for the ReviewFlow AI production deployment.

## Test Flows

### 1. QR Scan Flow
- [ ] User scans QR code from restaurant
- [ ] System redirects to `/qr` with correct restaurant ID in URL
- [ ] Restaurant details display correctly
- [ ] "Start Review" button navigates to review page

### 2. Review Page & AI Suggestions
- [ ] Review page loads with restaurant name and rating inputs
- [ ] All 5 rating controls respond correctly (Food, Service, Ambience, Overall, Confidence)
- [ ] Ratings are stored in sessionStorage
- [ ] Generate Suggestions button calls backend `/api/reviews/generate`
- [ ] AI suggestions appear (no fallback message)
- [ ] Suggestions are editable in the text area
- [ ] User can select different suggestions with arrow buttons
- [ ] "Use This Review" button populates the main textarea

### 3. Review Submission Flow (Positive - 5 star)
- [ ] Submit button calls `/api/reviews/submit` with correct payload
- [ ] Backend returns 200 OK with review ID
- [ ] Review data persists in Supabase
- [ ] ML pipeline enrichment happens
- [ ] Route decision is "positive_flow"
- [ ] Success page displays with countdown (5 seconds)
- [ ] Success page shows "Rate on Google" button
- [ ] Button redirects to Google Review URL in same tab
- [ ] Fallback button "Rate another experience" returns to QR scan

### 4. Review Submission Flow (Negative/Neutral - 1-3 star)
- [ ] Submit button routes to feedback page
- [ ] Feedback page shows complaint tags
- [ ] User can select multiple complaint categories
- [ ] Submit feedback works
- [ ] Feedback is stored in Supabase
- [ ] Restaurant owner receives email notification

### 5. CORS & Deployment
- [ ] Frontend served from Vercel CORS preflight succeeds
- [ ] Backend from Render responds to CORS requests
- [ ] No CORS errors in browser console
- [ ] API calls work from production URLs

## Backend Endpoints to Test

```
GET /health
POST /api/reviews/generate
POST /api/reviews/submit
POST /api/feedback/submit
GET /api/reviews/list
```

## Environment Verification
- [ ] VITE_API_URL set to production backend URL
- [ ] VITE_BACKEND_URL set to production backend URL
- [ ] Supabase credentials configured correctly
- [ ] Gemini API key available
- [ ] Email service configured (if needed for feedback)

## Expected Response Structures

### Generate Suggestions Response
```json
{
  "reviews": ["review 1", "review 2", "review 3"],
  "suggestions": ["review 1", "review 2", "review 3"]
}
```

### Submit Review Response
```json
{
  "success": true,
  "message": "Review processed.",
  "review": {...},
  "ml": {...},
  "decision": {...},
  "suggestions": [...],
  "google_review_link": "https://..."
}
```

## Critical Checks
- [ ] No console errors or warnings
- [ ] All API calls have CORS headers
- [ ] Session storage used correctly for state
- [ ] Database schema has required columns
- [ ] ML models loaded and working
- [ ] Gemini API responding correctly
- [ ] Supabase connection stable

## Deployment Checklist
- [ ] Backend deployed to Render
- [ ] Frontend built and deployed to Vercel
- [ ] Environment variables set on both platforms
- [ ] Database migrations applied
- [ ] All tests passing locally
- [ ] CORS configured correctly
- [ ] Email service tested (if applicable)

## Rollback Plan
If issues occur post-deployment:
1. Revert to last working commit
2. Deploy previous version
3. Investigate issues locally
4. Commit fixes and re-deploy
