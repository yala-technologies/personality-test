# AWS Amplify Deployment Guide

## Overview

This guide explains how to deploy the Yala BDR Personality Assessment to AWS Amplify.

## Prerequisites

- AWS Account with Amplify access
- GitHub repository: `yala-technologies/personality-test`
- Supabase project configured (ref: `sbbfsvdzeaxiypiokhqi`)

## Deployment Steps

### 1. Create Amplify App

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Select "GitHub"
4. Authorize AWS Amplify to access your repositories
5. Select repository: `yala-technologies/personality-test`
6. Select branch: `main`

### 2. Configure Build Settings

The `amplify.yml` file in the repository root contains the build configuration:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Amplify will automatically detect and use this configuration.

### 3. Configure Environment Variables

In the Amplify Console, go to "Environment variables" and add:

```
VITE_SUPABASE_URL=https://sbbfsvdzeaxiypiokhqi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_OgPjujiFubiEjYpnBsIHQw_wiy4oxUw
```

**Important:** These environment variables are required for the app to connect to Supabase.

### 4. Advanced Settings (Optional)

**Custom Domain:**
- Go to "Domain management"
- Add your custom domain (e.g., `assessment.yala.com`)
- Follow DNS configuration instructions

**Redirects and Rewrites:**

Add these redirect rules for SPA routing:

```
Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>
Target: /index.html
Type: 200 (Rewrite)
```

This ensures that React Router works correctly with direct URL access.

### 5. Deploy

1. Click "Save and deploy"
2. Amplify will:
   - Clone the repository
   - Install dependencies (`npm ci`)
   - Build the application (`npm run build`)
   - Deploy to CloudFront CDN

The build typically takes 2-3 minutes.

### 6. Verify Deployment

After deployment completes:

1. Click the generated URL (e.g., `https://main.d1234567890.amplifyapp.com`)
2. Test the admin login at `/admin` (password: `Yala123`)
3. Create a test candidate
4. Complete the assessment
5. Verify the admin dashboard displays results correctly

## Continuous Deployment

Amplify automatically deploys when you push to the `main` branch:

```bash
git add .
git commit -m "Update assessment"
git push origin main
```

Amplify will detect the push and start a new build automatically.

## Monitoring and Logs

### Build Logs
- Go to "Build history" in Amplify Console
- Click on any build to see detailed logs
- Check for errors during `npm ci` or `npm run build`

### Application Logs
- CloudWatch Logs are automatically configured
- Access via Amplify Console → "Monitoring"

### Common Issues

**Build fails with "Module not found":**
- Check that all dependencies are in `package.json`
- Ensure `package-lock.json` is committed

**Environment variables not working:**
- Verify variables are set in Amplify Console
- Ensure they start with `VITE_` prefix
- Rebuild the app after adding variables

**Blank page after deployment:**
- Check browser console for errors
- Verify Supabase URL and publishable key are correct
- Check redirect rules are configured

## Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Custom domain configured (if needed)
- [ ] Redirect rules added for SPA routing
- [ ] Admin login tested
- [ ] Assessment flow tested on mobile
- [ ] Edge Function deployed and working
- [ ] Database migration applied
- [ ] Delete test candidates from database
- [ ] SSL certificate verified (Amplify provides free SSL)

## Rollback

To rollback to a previous version:

1. Go to "Build history" in Amplify Console
2. Find the working build
3. Click "Redeploy this version"

## Cost Estimate

AWS Amplify pricing (as of 2026):
- **Build minutes:** $0.01 per minute
- **Hosting:** $0.15 per GB served
- **Storage:** $0.023 per GB/month

For this application:
- Build time: ~2-3 minutes per deploy
- Expected traffic: Low to medium
- **Estimated monthly cost:** $5-15/month

## Support

For deployment issues:
- AWS Amplify Documentation: https://docs.aws.amazon.com/amplify/
- Amplify Discord: https://discord.gg/amplify
- GitHub Issues: https://github.com/yala-technologies/personality-test/issues

## Alternative: Manual Deployment

If you prefer not to use Amplify:

```bash
# Build locally
npm run build

# Deploy dist/ folder to:
# - AWS S3 + CloudFront
# - Netlify
# - Vercel
# - Cloudflare Pages
```

All of these platforms support static React apps with environment variables.
