# Production Deployment Guide

## Environment Configuration

### Frontend Environment Variables (.env)

```
# Development
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_URL=http://localhost:5173

# Production (set in Render/Vercel/your platform)
VITE_API_URL=https://your-api.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_APP_URL=https://your-app.onrender.com
```

### Backend Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
FRONTEND_ORIGIN=https://your-app.onrender.com
```

## Build & Deploy Checklist

### Pre-Deployment

- [ ] All environment variables are set correctly (no localhost URLs)
- [ ] `npm run build` completes without errors
- [ ] `npm run preview` works correctly
- [ ] No console errors or warnings
- [ ] No hardcoded API URLs in code
- [ ] `.env` file is in `.gitignore`
- [ ] `package.json` has all dependencies
- [ ] `requirements.txt` includes all Python packages

### Build Commands

```bash
# Frontend
npm install
npm run build
npm run preview  # Test production build locally

# Backend
pip install -r requirements.txt
python app.py  # Test locally
```

### Deployment Platforms

#### Render (Recommended)

```bash
# Frontend Build Command
npm install && npm run build

# Backend Build Command
pip install -r requirements.txt

# Start Command (Backend)
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### Vercel (Frontend Only)

```bash
# Build Settings
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

#### GitHub Pages (Static Frontend)

```bash
npm run build
# Deploy the dist/ folder
```

## Performance Optimization

### Frontend Optimizations

1. **Lazy Loading**
   ```javascript
   const Analytics = React.lazy(() => import('./pages/Analytics'))
   <Suspense fallback={<LoadingSpinner />}>
     <Analytics />
   </Suspense>
   ```

2. **Code Splitting**
   ```javascript
   // Automatic via Vite
   // Manual chunk control in vite.config.js
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'recharts': ['recharts'],
           'vendor': ['react', 'react-dom'],
         }
       }
     }
   }
   ```

3. **Image Optimization**
   - Use WebP format where possible
   - Optimize PNG/JPG with tools like TinyPNG
   - Add loading="lazy" to images

4. **Memoization**
   ```javascript
   const Component = React.memo(function Component(props) {
     // Only re-renders if props change
   })

   const value = useMemo(() => expensiveCalc(), [deps])
   const callback = useCallback(() => handler(), [deps])
   ```

### Backend Optimizations

1. **Database Query Optimization**
   - Add indices on frequently queried columns
   - Use pagination for large datasets
   - Implement query caching

2. **API Caching**
   ```python
   from functools import lru_cache
   @lru_cache(maxsize=128)
   def get_model_predictions(text: str):
       return ml_service.predict(text)
   ```

3. **Async Processing**
   - Use FastAPI background tasks for emails
   - Implement job queues for heavy operations

## Security Hardening

### Frontend Security

1. **Never expose secrets**
   - Use environment variables (VITE_ prefix)
   - No hardcoded API keys
   - No passwords in local storage

2. **Input Validation**
   ```javascript
   import { formValidation } from '../lib/errorHandler'
   const error = formValidation.email(userEmail)
   ```

3. **Output Sanitization**
   ```javascript
   // React auto-escapes by default
   // For HTML content, use DOMPurify
   import DOMPurify from 'dompurify'
   const clean = DOMPurify.sanitize(userHTML)
   ```

4. **CSRF Protection**
   - Use SameSite cookies
   - Verify origin headers
   - Use CSRF tokens for state-changing operations

5. **XSS Prevention**
   - Never use dangerouslySetInnerHTML
   - Escape user input
   - Use Content Security Policy headers

### Backend Security

1. **Rate Limiting**
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   
   @limiter.limit("10/minute")
   @app.post("/api/reviews/submit")
   def submit_review():
       pass
   ```

2. **Input Validation**
   ```python
   from pydantic import BaseModel, validator
   
   class ReviewRequest(BaseModel):
       review_text: str
       
       @validator('review_text')
       def validate_text(cls, v):
           if len(v) < 10:
               raise ValueError('Too short')
           return v
   ```

3. **Authentication & Authorization**
   - Use Supabase Auth tokens
   - Verify JWT tokens on each request
   - Implement row-level security (RLS)

4. **HTTPS Only**
   - Enable HTTPS redirects
   - Set HSTS headers
   - Secure cookies

5. **Secrets Management**
   - Store in environment variables
   - Never commit secrets to Git
   - Rotate keys regularly

### Database Security

1. **Row-Level Security (RLS)**
   ```sql
   ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can read own reviews"
   ON reviews FOR SELECT
   USING (auth.uid() = user_id);
   ```

2. **Backups**
   - Enable automated backups
   - Test restore procedures
   - Store backups securely

3. **Access Control**
   - Minimal permissions
   - Service role for backend
   - Anon role for frontend (limited)

## Monitoring & Logging

### Setup Logging

```python
import logging
import json
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
```

### Monitor Key Metrics

- API response times
- Error rates
- Database performance
- Model inference time
- User engagement

### Uptime Monitoring

- Use Uptime Robot or similar
- Monitor `/health` endpoint
- Set up alerts for downtime

## Continuous Integration/Deployment

### GitHub Actions Example

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        env:
          RENDER_DEPLOY_KEY: ${{ secrets.RENDER_DEPLOY_KEY }}
        run: |
          curl https://api.render.com/deploy/srv-${{ secrets.RENDER_SERVICE_ID }}?key=$RENDER_DEPLOY_KEY
```

### Pre-deployment Checks

```bash
#!/bin/bash
# Run before deployment

# Frontend checks
npm run lint
npm run build
npm run type-check

# Backend checks
python -m flake8 .
python -m mypy .
pytest .
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Run `npm install` or `pip install -r requirements.txt`
   - Check `.gitignore` doesn't exclude required files

2. **CORS errors**
   - Verify FRONTEND_ORIGIN matches your domain
   - Check CORS headers in backend

3. **Database connection errors**
   - Verify SUPABASE_URL and keys are correct
   - Check database is accessible from deployment region

4. **Timeout errors**
   - Increase timeout values
   - Check for slow database queries
   - Monitor model loading time

## Support Resources

- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [FastAPI Docs](https://fastapi.tiangolo.com)
