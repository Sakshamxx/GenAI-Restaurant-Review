# Production Deployment Instructions

## Pre-Deployment Checklist

### Local Verification (✓ Completed)
- [x] Frontend builds successfully (`npm run build`)
- [x] Backend unit tests pass (`pytest tests/`)
- [x] CORS configured for production Vercel origin
- [x] API response structure verified (both "reviews" and "suggestions" keys)
- [x] Database insertion defensive (retries with core fields on schema mismatch)
- [x] All components tested and reviewed
- [x] Changes committed to git

### Backend Deployment (Render)

1. **Push to Git**
   ```bash
   git push origin main
   ```

2. **Deploy on Render**
   - Go to https://dashboard.render.com
   - Navigate to the GenAI-Restaurant-Review service
   - Deploy from the latest main branch commit
   - Verify deployment in logs

3. **Environment Variables on Render**
   Ensure these are set:
   ```
   GEMINI_API_KEY=<your-gemini-api-key>
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   RESEND_API_KEY=<optional-if-using-email>
   ```

4. **Post-Deployment Verification**
   ```bash
   # Test backend health
   curl https://genai-restaurant-review.onrender.com/health
   
   # Should return: {"status":"ok"}
   ```

### Frontend Deployment (Vercel)

1. **Environment Variables**
   - Ensure `frontend.env` has correct values:
   ```
   VITE_API_URL=https://genai-restaurant-review.onrender.com
   VITE_BACKEND_URL=https://genai-restaurant-review.onrender.com
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```

2. **Deploy on Vercel**
   ```bash
   # Option 1: Push to git (auto-deploy configured)
   git push origin main
   
   # Option 2: Manual deploy
   npm run build
   vercel --prod
   ```

3. **Post-Deployment Verification**
   - Open https://gen-ai-restaurant-review-dpb5m1zn1.vercel.app
   - Check browser console for errors
   - Verify no CORS errors

### Database Schema

1. **Verify Supabase Tables Exist**
   - `restaurants` (with google_review_link, owner_email)
   - `reviews` (with core fields: restaurant_id, review_text, user_rating, etc.)
   - `feedback` (with category, severity, feedback_text)
   - `activity_logs` (flexible metadata)

2. **Apply Migrations (if needed)**
   ```bash
   # Run migrations on Supabase SQL editor
   # File: db/migrations/001_create_reviews_and_activity.sql
   ```

3. **Enable RLS (Row Level Security)**
   - Verify RLS policies are enabled on production database
   - Ensure service role API can write without RLS restrictions

## Testing After Deployment

### 1. Test QR Code Flow
- [ ] Generate test QR code pointing to production frontend
- [ ] Scan QR code with mobile device
- [ ] Verify restaurant loads correctly
- [ ] Complete rating process

### 2. Test AI Suggestions
- [ ] Submit all ratings (positive review, 5-star)
- [ ] AI suggestions generate without fallback message
- [ ] Suggestions are editable
- [ ] "Use This Review" button works

### 3. Test Positive Flow (5-star review)
- [ ] Click "Submit Review"
- [ ] Backend processes successfully
- [ ] Success page displays with countdown
- [ ] Auto-redirect to Google Reviews happens
- [ ] Review is visible in Supabase `reviews` table

### 4. Test Negative Flow (3-star review)
- [ ] Submit review with 3-star rating
- [ ] Redirects to feedback page
- [ ] Submit feedback
- [ ] Feedback stored in Supabase `feedback` table
- [ ] Restaurant owner receives email notification (if configured)

### 5. Test Error Handling
- [ ] Try submitting with invalid restaurant ID
- [ ] Verify error message displays gracefully
- [ ] Try network interruption during submission
- [ ] Verify retry logic works

## Troubleshooting

### CORS Errors
- Check if frontend URL is in CORS allow_origins or matches regex pattern
- Test CORS preflight with: `curl -H "Origin: <frontend-url>" -v <backend-url>/health`

### AI Suggestions Not Generating
- Verify Gemini API key is set on Render
- Check if Gemini API is accessible from Render
- Look for timeout errors in browser console

### Database Connection Issues
- Verify Supabase connection string is correct
- Check if RLS policies allow service role writes
- Verify database tables exist and have required columns

### Deployment Rollback
If issues occur post-deployment:
```bash
# Render: Revert to previous deployment via dashboard
# Vercel: Revert to previous production deployment via project settings
```

## Monitoring

1. **Backend Logs**
   - Render: View in dashboard under "Logs"
   - Look for errors in `/api/reviews/generate` and `/api/reviews/submit`

2. **Frontend Errors**
   - Check browser console for any errors
   - Use browser DevTools Network tab to verify API calls

3. **Database Monitoring**
   - Supabase: Monitor database connections and query performance
   - Check for error rates in reviews and feedback tables

## Success Criteria

Production deployment is successful when:
1. ✓ No CORS errors in browser console
2. ✓ AI suggestions display without fallback message
3. ✓ 5-star reviews redirect to Google Reviews successfully
4. ✓ Negative reviews route to feedback form correctly
5. ✓ All data persists in Supabase tables
6. ✓ No 500 errors in backend logs
7. ✓ Response times < 2 seconds for API endpoints

## Production URLs

- **Frontend**: https://gen-ai-restaurant-review-dpb5m1zn1.vercel.app
- **Backend API**: https://genai-restaurant-review.onrender.com
- **Database**: Supabase PostgreSQL (qgxfwbondqjsipfzbtrw.supabase.co)
- **QR Code Format**: https://gen-ai-restaurant-review-dpb5m1zn1.vercel.app/qr?restaurantId={uuid}

## Support

For deployment issues:
1. Check deployment logs on Render and Vercel
2. Review error messages in browser console
3. Verify environment variables are set correctly
4. Check database schema and RLS policies
5. Consult PRODUCTION_TEST_PLAN.md for detailed testing steps
