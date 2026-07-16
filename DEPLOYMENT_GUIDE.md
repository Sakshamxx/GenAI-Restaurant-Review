# Deployment Guide — ReviewFlow AI

**Version:** 1.0  
**Updated:** 2026-07-17  
**Status:** PRODUCTION-READY  

---

## Quick Start: Deploy to Production (10 minutes)

### Prerequisites
- Render account (https://render.com)
- GitHub repository pushed
- Supabase project created
- Google Gemini API key
- Resend email API key

### Steps

1. **Connect GitHub to Render**
   - Log in to Render
   - Click "New +" → "Web Service"
   - Select GitHub repository
   - Authorize Render

2. **Configure Deployment**
   - **Name:** genai-restaurant-review
   - **Build Command:**
     ```bash
     pip install -r requirements_prod.txt && npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
     ```

3. **Set Environment Variables**
   - `SUPABASE_URL` — Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Service role key
   - `GOOGLE_API_KEY` — Gemini API key
   - `RESEND_API_KEY` — Email API key
   - `FRONTEND_ORIGIN` — Production frontend URL

4. **Deploy**
   - Click "Deploy"
   - Wait for build + tests
   - View at `https://[your-app].onrender.com`

**Total Time:** ~5-10 minutes

---

## Detailed Deployment Steps

### Phase 1: Prepare Supabase

#### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Project Name:** ReviewFlow AI
   - **Database Password:** Strong password
   - **Region:** Closest to your users
4. Click "Create new project"
5. Wait for database initialization (~2 minutes)

#### 1.2 Run Database Migrations

1. Open Supabase SQL editor
2. Copy contents of `db/migrations/001_create_reviews_and_activity.sql`
3. Paste in SQL editor
4. Click "Run"
5. Verify tables created (reviews, activity_logs)

6. Copy contents of `db/migrations/002_add_feedback_and_qr_schema.sql`
7. Paste in SQL editor
8. Click "Run"
9. Verify tables created (feedback, qr_codes)

#### 1.3 Retrieve Credentials

1. Go to Project Settings → API
2. Copy:
   - `Project URL` → Set as `SUPABASE_URL`
   - `Service Role Key` → Set as `SUPABASE_SERVICE_ROLE_KEY`
3. Keep these safe; use in deployment

---

### Phase 2: Prepare API Keys

#### 2.1 Google Gemini API

1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Create new project or select existing
4. Generate API key
5. Copy → Set as `GOOGLE_API_KEY`
6. **Important:** Add billing method to avoid rate limits

#### 2.2 Resend Email API

1. Go to https://resend.com
2. Sign up / log in
3. Go to Settings → API Keys
4. Create new API key
5. Copy → Set as `RESEND_API_KEY`

---

### Phase 3: Deploy to Render

#### 3.1 Prepare Repository

1. Ensure all files committed to GitHub
2. Verify `.env` is in `.gitignore`
3. Verify `requirements_prod.txt` exists

**Check:**
```bash
git status  # Should show clean working directory
ls -la requirements_prod.txt  # Should exist
```

#### 3.2 Connect Render

1. Go to https://render.com
2. Sign up / log in with GitHub
3. Click "New +" → "Web Service"
4. Select your GitHub repository
5. Click "Connect"

#### 3.3 Configure Build & Start

1. Fill in Service Details:
   - **Name:** genai-restaurant-review
   - **Root Directory:** (leave blank)
   - **Environment:** Python 3
   - **Build Command:**
     ```bash
     pip install -r requirements_prod.txt && npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
     ```

2. Click "Advanced" and set:
   - **Auto-deploy:** Yes (if desired)

#### 3.4 Add Environment Variables

1. In Render dashboard, go to "Environment"
2. Add variables:
   ```
   SUPABASE_URL=https://[project-id].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[key]
   GOOGLE_API_KEY=[key]
   RESEND_API_KEY=[key]
   FRONTEND_ORIGIN=https://[your-app].onrender.com
   ```

3. Click "Save"

#### 3.5 Deploy

1. Click "Create Web Service"
2. Render begins build process
3. Watch deployment logs:
   - "Building" (5-15 min)
   - "Deploying" (1-2 min)
   - "Live" (service active)

4. Once "Live", your service is deployed
5. Visit: `https://[your-app].onrender.com`
6. Check health: `https://[your-app].onrender.com/health`

---

### Phase 4: Verify Deployment

#### 4.1 Health Checks

```bash
# Overall health
curl https://[your-app].onrender.com/health
# Expected: {"status": "healthy"}

# Model health
curl https://[your-app].onrender.com/health/models
# Expected: {
#   "sentiment_model": "loaded",
#   "complaint_model": "loaded",
#   "severity_model": "loaded"
# }
```

#### 4.2 Test API Endpoints

**Test Sentiment:**
```bash
curl -X POST https://[your-app].onrender.com/api/reviews/submit \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "test-123",
    "overall_rating": 5,
    "food_rating": 5,
    "service_rating": 5,
    "ambience_rating": 5,
    "review_text": "Amazing food and service!",
    "redirected_to_google": false
  }'

# Expected: 200 OK with predictions
```

#### 4.3 Test Frontend

1. Visit `https://[your-app].onrender.com`
2. You should see the main page
3. Try QR scan flow (or mock with test data)
4. Verify backend integration works

---

## Monitoring & Maintenance

### Daily Checks

1. **Health Endpoint**
   ```bash
   curl https://[your-app].onrender.com/health
   ```
   Should return `status: healthy`

2. **Model Health**
   ```bash
   curl https://[your-app].onrender.com/health/models
   ```
   All models should show `loaded`

3. **Error Logs**
   - View in Render dashboard → Logs
   - Look for error patterns
   - Address if error rate > 1%

### Weekly Checks

1. **Database Size**
   - Supabase dashboard → Storage
   - If approaching limit, plan upgrade

2. **API Performance**
   - Render dashboard → Metrics
   - Response time should be < 500ms
   - Error rate should be < 1%

3. **Predictions Quality**
   - Sample reviews from activity logs
   - Verify ML predictions are reasonable
   - Check sentiment vs. ratings alignment

### Monthly Maintenance

1. **Security Audit**
   - Review Supabase access logs
   - Update dependencies: `pip list --outdated`
   - Check for security patches

2. **Performance Review**
   - Analyze slow queries (Supabase)
   - Consider Redis caching if response time > 500ms
   - Review Gemini API usage (cost optimization)

3. **Backup Verification**
   - Supabase auto-backups enabled?
   - Test restore from backup (if critical)

---

## Troubleshooting

### Issue: Build Fails

**Error:** "pip install fails"
- **Cause:** requirements_prod.txt missing or outdated
- **Fix:** Verify file exists, run locally: `pip install -r requirements_prod.txt`

**Error:** "npm install fails"
- **Cause:** package.json corrupted or missing
- **Fix:** Verify file exists, run locally: `npm install`

**Error:** "Build times out"
- **Cause:** Large ML model downloads, slow network
- **Fix:** Increase timeout in Render dashboard, or upgrade Render plan

---

### Issue: Models Fail to Load

**Error:** "Model loading timeout"
- **Cause:** Large PyTorch models downloading
- **Fix:** First deployment may take 30s; subsequent deployments cached
- **Verify:** Check logs for specific model missing errors

**Error:** "Model artifact not found"
- **Cause:** Model files in `Models/` directory missing
- **Fix:** Ensure all `.pth` and `.pkl` files are committed to Git

**Error:** "Out of memory during model load"
- **Cause:** GPU instance (we use CPU-only)
- **Fix:** Verify `requirements_prod.txt` has `--index-url https://download.pytorch.org/whl/cpu`

---

### Issue: API Returns 500 Error

**Error:** "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
- **Cause:** Environment variables missing
- **Fix:** Add to Render dashboard, redeploy

**Error:** "Gemini API key invalid"
- **Cause:** Wrong API key or not enabled
- **Fix:** Verify key in Google console, add billing

**Error:** "Database connection refused"
- **Cause:** Supabase URL wrong or service role key wrong
- **Fix:** Verify credentials in Render env vars

---

### Issue: Frontend Shows Blank Page

**Error:** "VITE_API_URL not set"
- **Cause:** Frontend environment variable missing
- **Fix:** Verify build includes API URL
- **Build command should include:** API URL in env

**Error:** "CORS error in console"
- **Cause:** Backend CORS not configured for frontend URL
- **Fix:** Verify `FRONTEND_ORIGIN` matches deployed frontend URL

---

## Scaling for Production

### When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| Response time > 500ms | Consistent | Add Render replicas |
| Error rate > 1% | Sustained | Investigate + fix |
| Database size > 80% quota | Trending | Upgrade Supabase tier |
| Model load > 30s | Frequent | Consider GPU instance |

### Horizontal Scaling (Replicas)

1. Render dashboard → Service
2. Click "Scale"
3. Increase "Number of instances" to 2-4
4. Render auto-load balances

**Cost:** ~$12/month per replica

### Vertical Scaling (Instance Size)

1. Render dashboard → Settings
2. Change Instance Type (Pro/Premium)
3. Redeploy

**Cost:** $20+/month per tier

### Database Scaling

1. Supabase dashboard → Settings → Billing
2. Upgrade to Pro tier ($25/month)
3. Benefits:
   - 500 GB storage (vs. 8 GB free)
   - Faster queries
   - Priority support

---

## Backup & Recovery

### Automatic Backups

Supabase provides:
- Daily backups (7-day retention on free tier)
- Point-in-time recovery (Pro tier)

**View backups:**
1. Supabase dashboard → Settings → Backups
2. Download or restore as needed

### Manual Backup

```bash
# Backup database
pg_dump -h [supabase-host] -U [user] -d [db] > backup.sql

# Restore
psql -h [host] -U [user] -d [db] < backup.sql
```

### Recovery Procedure

1. **Database corruption detected**
   - Identify last good backup
   - Supabase dashboard → Backups
   - Click "Restore" on target backup
   - Choose restore point (date/time)
   - Confirm restoration

2. **Service downtime**
   - Disable serving during restore
   - Monitor restore progress
   - Verify data integrity
   - Re-enable serving

**Estimated recovery time:** 10-30 minutes (depends on data size)

---

## Security Checklist

### Pre-Deployment

- [x] Remove all hardcoded secrets from code
- [x] Create `.env.example` with empty values
- [x] Verify `.env` is in `.gitignore`
- [x] Enable HTTPS (Render does auto-TLS)
- [x] Review CORS configuration

### Post-Deployment

- [ ] Change Supabase service role key (rotate monthly)
- [ ] Enable RLS policies on Supabase tables (if multi-tenant)
- [ ] Set up 2FA on Render account
- [ ] Set up 2FA on Supabase account
- [ ] Monitor access logs for suspicious activity
- [ ] Enable audit logging on Supabase

### Ongoing

- [ ] Monthly API key rotation
- [ ] Monthly security audit
- [ ] Quarterly penetration testing (recommended)
- [ ] Continuous dependency updates

---

## Cost Estimation

### Monthly Costs (Single Restaurant MVP)

| Service | Tier | Cost |
|---------|------|------|
| Render (backend) | Starter | $7 |
| Supabase (database) | Free | $0 |
| Google Gemini API | PAYG | $5-15 |
| Resend (email) | PAYG | $0-5 |
| **Total** | | ~$12-27/month |

### Scaling Costs (50 Restaurants)

| Service | Tier | Cost |
|---------|------|------|
| Render (2 replicas) | Starter | $14 |
| Supabase (database) | Pro | $25 |
| Google Gemini API | PAYG | $50-100 |
| Resend (email) | PAYG | $20-50 |
| **Total** | | ~$109-189/month |

---

## Deployment Checklist

### Before Deployment

- [ ] All code committed to GitHub
- [ ] `.env.example` created with all required variables
- [ ] `requirements_prod.txt` verified (CPU-only torch)
- [ ] Database migrations tested locally
- [ ] API endpoints tested locally
- [ ] Frontend build tested locally
- [ ] All security issues addressed

### During Deployment

- [ ] Render build succeeds
- [ ] No timeout errors
- [ ] Environment variables set
- [ ] Health check passes
- [ ] API test request succeeds
- [ ] Frontend loads without errors

### After Deployment

- [ ] Monitor logs for errors (first 1 hour)
- [ ] Verify database connections working
- [ ] Test full workflow (QR → Review → DB)
- [ ] Check ML predictions are reasonable
- [ ] Monitor response times (should be < 500ms)
- [ ] Monitor error rate (should be < 1%)

---

## Support & Troubleshooting

### Quick Reference

| Issue | Command |
|-------|---------|
| View logs | Render dashboard → Logs |
| Restart service | Render dashboard → Settings → Restart |
| Check model health | `curl [url]/health/models` |
| Check database | Supabase dashboard → Table Editor |

### Contact

- **Render Support:** https://support.render.com
- **Supabase Support:** https://supabase.com/support
- **Google Gemini:** https://ai.google.dev/
- **Resend Support:** https://resend.com/support

---

## Next Steps After Deployment

1. **Set Up Monitoring**
   - Add error alerting (PagerDuty, Sentry)
   - Monitor response times
   - Track cost trends

2. **Gather Feedback**
   - Test with pilot restaurant
   - Collect user feedback
   - Iterate on UX

3. **Plan Scaling**
   - When: If error rate increases or response time > 500ms
   - What: Add Render replicas or upgrade database

4. **Prepare Public Beta**
   - Add rate limiting
   - Enable RLS policies
   - Set up monitoring dashboard
   - Create admin controls

---

**Deployment Guide Complete**

Last Updated: 2026-07-17  
Version: 1.0  
Status: Production Ready
