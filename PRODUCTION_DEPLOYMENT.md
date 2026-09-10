# Production Deployment to big5.useyala.com

## Overview
Deploy the Yala BDR Personality Assessment to AWS Amplify with custom domain `big5.useyala.com`.

## Prerequisites
- AWS Account access (Yala AWS account)
- Access to DNS management for `useyala.com`
- Supabase project ref: `sbbfsvdzeaxiypiokhqi`

---

## Step 1: Create Amplify App

### Option A: Via AWS Console (Recommended)

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/
   - Ensure you're in the correct region (recommend `us-east-1`)

2. **Create New App**
   - Click "Create new app"
   - Choose "Host web app"
   - Select "GitHub" as the source

3. **Authorize GitHub**
   - Click "Authorize AWS Amplify"
   - Sign in to GitHub if prompted
   - Grant access to `yala-technologies` organization

4. **Select Repository**
   - Organization: `yala-technologies`
   - Repository: `personality-test`
   - Branch: `main`
   - Click "Next"

5. **Configure Build Settings**
   - App name: `yala-bdr-personality-assessment`
   - The build settings will be auto-detected from `amplify.yml`
   - Click "Next"

6. **Review and Create**
   - Review all settings
   - Click "Save and deploy"

### Option B: Via AWS CLI

```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Configure AWS credentials
aws configure

# Create the app
aws amplify create-app \
  --name yala-bdr-personality-assessment \
  --repository https://github.com/yala-technologies/personality-test \
  --oauth-token YOUR_GITHUB_TOKEN \
  --platform WEB

# Create branch
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --enable-auto-build
```

---

## Step 2: Configure Environment Variables

**In the Amplify Console:**

1. Go to your app → "Environment variables" (left sidebar)
2. Click "Manage variables"
3. Add the following variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://sbbfsvdzeaxiypiokhqi.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_OgPjujiFubiEjYpnBsIHQw_wiy4oxUw` |

4. Click "Save"

**Note:** After adding environment variables, you need to redeploy:
- Go to "Build history"
- Click "Redeploy this version" on the latest build

---

## Step 3: Configure Custom Domain

### A. Add Domain to Amplify

1. In Amplify Console, go to "Domain management" (left sidebar)
2. Click "Add domain"
3. Enter domain: `useyala.com`
4. Click "Configure domain"

### B. Configure Subdomain

1. You'll see domain settings page
2. Configure subdomain:
   - **Subdomain:** `big5`
   - **Target branch:** `main`
3. Click "Save"

### C. DNS Configuration

Amplify will provide you with DNS records. You need to add these to your DNS provider:

**Expected DNS Records:**

```
Type: CNAME
Name: big5
Value: [provided by Amplify, something like: xxxxxxxx.cloudfront.net]
```

**If using Route 53 (recommended):**
- Amplify can auto-configure DNS
- Click "Setup with Route 53"
- It will create the records automatically

**If using external DNS provider:**
1. Copy the CNAME record from Amplify
2. Go to your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap)
3. Add the CNAME record:
   - Name: `big5`
   - Value: [the cloudfront domain from Amplify]
   - TTL: 300 (or default)
4. Save the record

### D. SSL Certificate

Amplify automatically provisions an SSL certificate via AWS Certificate Manager (ACM):
- This process takes 5-15 minutes
- Status will show "Pending verification" then "Available"
- Once complete, your site will be accessible via HTTPS

---

## Step 4: Configure Redirects (SPA Routing)

1. In Amplify Console, go to "Rewrites and redirects"
2. Click "Edit"
3. Add this rule:

**Rule 1 - SPA Fallback:**
```
Source address: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>
Target address: /index.html
Type: 200 (Rewrite)
```

**Rule 2 - HTTPS Redirect (optional but recommended):**
```
Source address: https://big5.useyala.com
Target address: https://big5.useyala.com
Type: 301 (Permanent redirect)
Condition: https
Apply: No
```

4. Click "Save"

---

## Step 5: Verify Deployment

### A. Check Build Status

1. Go to "Build history" in Amplify Console
2. Wait for the build to complete (usually 2-3 minutes)
3. Check for any errors in the logs

**Build should show:**
- ✅ Provision
- ✅ Build
- ✅ Deploy
- ✅ Verify

### B. Test the Application

Once deployment is complete:

1. **Test default URL first:**
   - Go to: `https://main.xxxxxxxx.amplifyapp.com`
   - Verify the site loads

2. **Test custom domain:**
   - Go to: `https://big5.useyala.com`
   - May take a few minutes for DNS to propagate

3. **Test admin login:**
   - Navigate to: `https://big5.useyala.com/admin`
   - Try incorrect password (should fail)
   - Login with `Yala123` (should succeed)

4. **Test assessment flow:**
   - Create a test candidate
   - Copy the assessment link
   - Open in new incognito window
   - Complete a few questions
   - Verify autosave works
   - Verify progress bar updates
   - Test keyboard shortcuts (1-5)

5. **Test on mobile:**
   - Open `https://big5.useyala.com` on your phone
   - Test the assessment
   - Verify responsive design works

---

## Step 6: Production Checklist

Before sharing with candidates:

- [ ] Deployment successful
- [ ] Custom domain working (`https://big5.useyala.com`)
- [ ] SSL certificate active (HTTPS working)
- [ ] Admin login working
- [ ] Can create candidates
- [ ] Assessment link generation working
- [ ] Assessment flow working (desktop)
- [ ] Assessment flow working (mobile)
- [ ] Autosave working
- [ ] Resume capability working
- [ ] Keyboard shortcuts working (1-5)
- [ ] Completion page showing
- [ ] Admin dashboard showing results
- [ ] Scores calculating correctly
- [ ] Benchmark setting working
- [ ] Similarity calculations working
- [ ] Delete test candidates from database
- [ ] Environment variables verified

---

## Post-Deployment

### Monitor the Application

1. **CloudWatch Logs**
   - Amplify Console → "Monitoring"
   - View access logs and errors

2. **Build History**
   - Monitor deployments
   - Check build logs if issues arise

### Continuous Deployment

Amplify is now configured for automatic deployments:

```bash
# Any push to main branch will trigger a deployment
git add .
git commit -m "Update assessment"
git push origin main

# Amplify will automatically:
# 1. Detect the push
# 2. Run npm ci
# 3. Run npm run build
# 4. Deploy to production
# 5. Invalidate CloudFront cache
```

### DNS Propagation

- **DNS changes can take up to 48 hours** to fully propagate globally
- Most changes propagate within 5-15 minutes
- Use https://dnschecker.org to check propagation status
- Test with: `nslookup big5.useyala.com`

---

## Troubleshooting

### Build Fails

**Check build logs:**
1. Amplify Console → Build history
2. Click on failed build
3. Expand build steps
4. Look for error messages

**Common issues:**
- Missing environment variables → Add them in Amplify Console
- Node version mismatch → Specify in `amplify.yml` if needed
- Dependency issues → Clear cache and redeploy

### Custom Domain Not Working

**Check DNS:**
```bash
nslookup big5.useyala.com
# Should return the CloudFront domain
```

**Check SSL:**
- In Amplify Console → Domain management
- SSL status should be "Available"
- If stuck on "Pending", check DNS records

**If using Cloudflare:**
- Set SSL mode to "Full" (not "Flexible")
- Disable "Always use HTTPS" temporarily during setup

### Application Errors

**Check browser console:**
- F12 → Console tab
- Look for errors

**Common issues:**
- CORS errors → Check Supabase Edge Function CORS settings
- Environment variables not set → Redeploy after adding them
- Routes not working → Check SPA redirect rule

---

## Rollback

If you need to rollback:

1. Go to Amplify Console → Build history
2. Find the last working build
3. Click "Redeploy this version"

---

## Cost Estimate

**AWS Amplify Pricing:**
- Build: ~$0.01/min × 3 min × ~10 deploys/month = ~$0.30/month
- Hosting: $0.15/GB × estimated 2GB/month = $0.30/month
- **Total: ~$1-5/month** for low to medium traffic

**DNS:**
- Route 53: $0.50/month per hosted zone (if used)
- Queries: $0.40 per million queries

---

## Support

- **AWS Amplify Docs:** https://docs.aws.amazon.com/amplify/
- **GitHub Repo:** https://github.com/yala-technologies/personality-test
- **Supabase Project:** https://supabase.com/dashboard/project/sbbfsvdzeaxiypiokhqi

---

## Quick Reference

**Production URL:** https://big5.useyala.com
**Admin URL:** https://big5.useyala.com/admin
**Password:** Yala123
**Repository:** yala-technologies/personality-test
**Branch:** main
**Supabase URL:** https://sbbfsvdzeaxiypiokhqi.supabase.co
