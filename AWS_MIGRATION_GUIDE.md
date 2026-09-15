# Complete Migration Guide: Moving from Vercel to AWS

This comprehensive, step-by-step guide provides everything required to migrate the **Teach Grow Guide / Cuvasol Tutor** platform (Vite + React SPA Frontend & Express.js + Mongoose REST Backend) from **Vercel** to **Amazon Web Services (AWS)**.

---

## Table of Contents
1. [Architecture Overview & Strategy Selection](#1-architecture-overview--strategy-selection)
2. [Environment Variables Inventory](#2-environment-variables-inventory)
3. [Strategy 1 (Recommended): S3 + CloudFront (Frontend) & AWS App Runner (Backend)](#3-strategy-1-recommended-s3--cloudfront--aws-app-runner)
   - [Part A: Backend on AWS App Runner](#part-a-backend-on-aws-app-runner)
   - [Part B: Frontend on AWS S3 + CloudFront CDN](#part-b-frontend-on-aws-s3--cloudfront-cdn)
   - [Part C: Custom Domains & SSL (Route 53 + ACM)](#part-c-custom-domains--ssl-route-53--acm)
4. [Strategy 2 (Budget / Monolith): Single AWS EC2 Instance with Nginx & PM2](#4-strategy-2-budget--monolith-single-aws-ec2-with-nginx--pm2)
5. [Strategy 3 (Quickest Frontend): AWS Amplify Hosting](#5-strategy-3-quickest-frontend-aws-amplify-hosting)
6. [Database & 3rd-Party Integrations Updates](#6-database--3rd-party-integrations-updates)
7. [Automated CI/CD Pipelines (GitHub Actions)](#7-automated-cicd-pipelines-github-actions)
8. [Cutover & Rollback Plan](#8-cutover--rollback-plan)
9. [Cost Breakdown & Optimization](#9-cost-breakdown--optimization)

---

## 1. Architecture Overview & Strategy Selection

### Current Vercel Architecture
* **Frontend**: Static hosting with `@vercel/rewrites` to `index.html`.
* **Backend**: Serverless Node.js functions via `@vercel/node` wrapping Express.
* **Limitations on Vercel**: 10-60s serverless timeout limits, cold-start delays on MongoDB Mongoose connection pools, higher bandwidth cost at scale.

### Target AWS Architecture Options

```mermaid
flowchart TB
    subgraph Client["Users & Tutors"]
        Browser["Web Browser / Mobile"]
    end

    subgraph Route53["AWS Route 53 (DNS)"]
        DNS_Frontend["app.yourdomain.com"]
        DNS_Backend["api.yourdomain.com"]
    end

    subgraph FrontendHosting["Frontend Tier (S3 + CloudFront)"]
        CF["CloudFront CDN (Global Edge)"]
        S3["S3 Bucket (Static Assets)"]
        CF -->|Origin Access Control| S3
    end

    subgraph BackendHosting["Backend Tier (AWS App Runner / EC2)"]
        AppRunner["AWS App Runner (Express API Container / Node)"]
    end

    subgraph External["External Services"]
        MongoDB[("MongoDB Atlas")]
        Razorpay["Razorpay Gateway"]
        Google["Google Meet / OAuth"]
        SMTP["Brevo / SMTP Email"]
    end

    Browser --> DNS_Frontend --> CF
    Browser --> DNS_Backend --> AppRunner
    AppRunner --> MongoDB
    AppRunner --> Razorpay
    AppRunner --> Google
    AppRunner --> SMTP
```

### Strategy Comparison

| Strategy | Best For | Frontend Tech | Backend Tech | Management Effort | Approx Monthly Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Strategy 1 (Recommended)** | **Production Scale** | S3 + CloudFront | AWS App Runner | Very Low (Serverless/Managed) | $5 - $25 / month |
| **Strategy 2 (Monolith)** | **Budget / Dev / Staging** | Nginx on EC2 | Node.js (PM2) on EC2 | Medium (Server Maintenance) | $3.50 - $15 / month (t3.micro/small) |
| **Strategy 3 (Amplify)** | **Fastest Git Setup** | AWS Amplify Hosting | AWS App Runner | Minimal | $5 - $25 / month |

---

## 2. Environment Variables Inventory

Before beginning the migration, prepare your environment variables for both tiers.

### Frontend Variables (`.env.production`)
| Variable | Value / Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL of your deployed AWS backend | `https://api.yourdomain.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `xxxx.apps.googleusercontent.com` |

### Backend Variables (App Runner / EC2 `.env`)
| Variable | Purpose | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (App Runner defaults to 5000 or 8080) | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/teachgrow` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | `https://yourdomain.com,https://www.yourdomain.com` |
| `BACKEND_URL` | Public backend URL for generated upload links | `https://api.yourdomain.com` |
| `JWT_SECRET` | Secret key for auth tokens | `your-secure-jwt-random-string` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_live_xxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | `xxxxxxxxxxxxxxxx` |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay Webhook secret | `your_webhook_secret` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxxxx` |
| `GOOGLE_REDIRECT_URI` | Google OAuth Callback URL | `https://yourdomain.com/google-callback` |
| `ADMIN_GOOGLE_REFRESH_TOKEN`| Refresh token for Google Meet generation | `1//04xxxx...` |
| `ADMIN_EMAIL` | Admin account email | `support@yourdomain.com` |
| `SMTP_HOST` | Email SMTP Server (e.g. Brevo) | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Email SMTP Port | `587` (or `465`) |
| `SMTP_USER` | Email SMTP Username | `your-smtp-login` |
| `SMTP_PASS` | Email SMTP Password / Master Key | `your-smtp-key` |
| `EMAIL_FROM` | Sender Name & Address | `"Cuvasol Tutor" <noreply@yourdomain.com>` |
| `GEMINI_API_KEY` | Google Gemini AI Key (if using AI features) | `AIzaSy...` |

---

## 3. Strategy 1 (Recommended): S3 + CloudFront & AWS App Runner

This strategy provides an ultra-reliable, auto-scaling, low-latency production deployment identical to or exceeding Vercel performance with zero server management.

---

### Part A: Backend on AWS App Runner

**AWS App Runner** runs Node.js applications directly from GitHub or a Docker container. It automatically manages SSL, load balancing, health checks, and horizontal auto-scaling (scales to zero or up with traffic).

#### Option 1: Direct GitHub Integration (No Docker needed)
1. Open the **AWS Management Console** and navigate to **AWS App Runner**.
2. Click **Create service**.
3. **Source**: Choose **Source code repository**.
   - Connect your GitHub account and select your repository (`teach-grow-guide`).
   - Select the branch (e.g., `main`).
   - Set **Source directory** to `/backend`.
   - Select **Deployment trigger**: **Automatic** (deploys on every git push).
4. **Build Settings**:
   - **Runtime**: `Nodejs 18` or `Nodejs 20`
   - **Build command**: `npm install`
   - **Start command**: `node index.js`
   - **Port**: `5000`
5. **Configure service**:
   - **Service name**: `cuvasol-backend-api`
   - **Virtual CPU & Memory**: `1 vCPU, 2 GB` (can scale up or down as needed)
   - **Environment variables**: Add all backend variables from [Section 2](#backend-variables-app-runner--ec2-env).
6. **Health check**:
   - **Protocol**: `HTTP`
   - **Path**: `/api/health`
   - **Interval**: `10` seconds, **Timeout**: `5` seconds.
7. Click **Create & Deploy**.
8. Once deployed, App Runner provides a default domain like `https://xxxxxx.us-east-1.awsapprunner.com`.
9. Test the health check in your browser: `https://xxxxxx.us-east-1.awsapprunner.com/api/health`.

#### Option 2: Containerized Deployment (Using Docker)
If you prefer containerized deployment:
1. Use the provided [`backend/Dockerfile`](file:///d:/teach-grow-guide/backend/Dockerfile):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
CMD ["node", "index.js"]
```
2. Build and push image to **Amazon ECR (Elastic Container Registry)** or connect directly in App Runner.

---

### Part B: Frontend on AWS S3 + CloudFront CDN

#### Step 1: Create the S3 Bucket for Static Assets
1. Open **Amazon S3 Console** and click **Create bucket**.
2. **Bucket name**: `cuvasol-frontend-production` (must be globally unique).
3. **Region**: Choose your target region (e.g., `us-east-1` or `ap-south-1`).
4. **Object Ownership**: ACLs disabled (recommended).
5. **Block Public Access**: Keep **Block all public access enabled** (Security Best Practice: CloudFront will access S3 privately via **Origin Access Control / OAC**).
6. Click **Create bucket**.

#### Step 2: Build the Frontend Production Assets
In your local project or CI/CD environment:
1. Ensure your `.env.production` contains the App Runner backend URL:
   ```env
   VITE_API_URL=https://api.yourdomain.com/api
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```
2. Run build:
   ```bash
   npm run build
   ```
   This generates the optimized production bundle in the `dist/` folder.

#### Step 3: Create the Amazon CloudFront Distribution
CloudFront distributes your frontend across edge locations worldwide with ultra-fast CDN caching, free SSL, and Single Page Application (SPA) routing.

1. Open **Amazon CloudFront Console** and click **Create distribution**.
2. **Origin domain**: Select your S3 bucket `cuvasol-frontend-production.s3.amazonaws.com`.
3. **Origin access**:
   - Select **Origin access control settings (recommended)**.
   - Click **Create new OAC** and select your bucket.
4. **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
5. **Allowed HTTP methods**: `GET, HEAD, OPTIONS`.
6. **Cache key and origin requests**: Choose **CacheOptimized** (recommended).
7. **Web Application Firewall (WAF)**: Enable or disable based on security preference.
8. **Custom SSL Certificate**: (If you have an ACM certificate in `us-east-1`, select it; otherwise use the default CloudFront certificate initially).
9. **Default root object**: Set to `index.html`.
10. Click **Create distribution**.

#### Step 4: Update S3 Bucket Policy for CloudFront OAC
1. CloudFront will display a prompt to copy the S3 bucket policy.
2. Go to **S3 Console** > `cuvasol-frontend-production` > **Permissions** tab > **Bucket Policy** > **Edit**.
3. Paste the policy generated by CloudFront (replaces `<BUCKET_NAME>`, `<ACCOUNT_ID>`, and `<DISTRIBUTION_ID>`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cuvasol-frontend-production/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<YOUR_AWS_ACCOUNT_ID>:distribution/<YOUR_CLOUDFRONT_DISTRIBUTION_ID>"
        }
      }
    }
  ]
}
```

#### Step 5: Configure SPA Routing (Handling 404 / 403 Rewrites for React Router)
Because React Router handles client-side routing (e.g. `/dashboard/tutor`, `/find-tutors`), direct visits or browser refreshes on subroutes will request non-existent S3 keys unless redirected to `index.html`.

1. Go to your CloudFront distribution > **Error pages** tab.
2. Click **Create custom error response**.
   - **HTTP error code**: `403: Forbidden` (S3 returns 403 when private objects are not found)
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP Response code**: `200: OK`
3. Click **Create custom error response** again:
   - **HTTP error code**: `404: Not Found`
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP Response code**: `200: OK`

#### Step 6: Upload the Frontend Build to S3
Using the AWS CLI:
```bash
# Upload static assets with long cache times
aws s3 sync dist/ s3://cuvasol-frontend-production --delete --cache-control "max-age=31536000,public,immutable" --exclude "index.html" --exclude "*.json"

# Upload index.html and manifest with zero cache so updates reflect immediately
aws s3 sync dist/ s3://cuvasol-frontend-production --exclude "*" --include "index.html" --include "*.json" --cache-control "max-age=0,no-cache,no-store,must-revalidate"

# Invalidate CloudFront edge caches
aws cloudfront create-invalidation --distribution-id <YOUR_DISTRIBUTION_ID> --paths "/*"
```

---

### Part C: Custom Domains & SSL (Route 53 + ACM)

To point your custom domain (e.g., `cuvasoltutor.com` and `api.cuvasoltutor.com`):

1. **Request SSL Certificate in AWS Certificate Manager (ACM)**:
   > **Note**: CloudFront certificates **must** be created in region `us-east-1` (N. Virginia). App Runner certificates can be in your service region.
   - Go to **ACM Console** in `us-east-1`.
   - Click **Request a certificate** -> **Public certificate**.
   - Add Domain names: `yourdomain.com`, `*.yourdomain.com`.
   - Validation method: **DNS validation**.
   - Copy the CNAME records to your DNS manager (Route 53, Cloudflare, or GoDaddy) to validate ownership.

2. **Map Frontend Custom Domain in CloudFront**:
   - Open your CloudFront distribution -> **General** -> **Edit**.
   - **Alternate domain names (CNAMEs)**: Add `yourdomain.com` and `www.yourdomain.com`.
   - **Custom SSL certificate**: Select the validated ACM certificate.
   - Save changes.

3. **Map Backend Custom Domain in App Runner**:
   - Open App Runner console -> Select `cuvasol-backend-api` -> **Custom domains** tab.
   - Click **Link domain** -> Enter `api.yourdomain.com`.
   - Follow the prompt to add the provided DNS CNAME records to your DNS provider.

4. **Add DNS Records (in Route 53 or your DNS provider)**:
   | Type | Name / Host | Target / Value |
   | :--- | :--- | :--- |
   | **A (Alias)** | `yourdomain.com` | CloudFront Distribution Domain (`dxxxxxxxx.cloudfront.net`) |
   | **CNAME** | `www.yourdomain.com` | CloudFront Distribution Domain (`dxxxxxxxx.cloudfront.net`) |
   | **CNAME** | `api.yourdomain.com` | App Runner Domain (`xxxxxx.us-east-1.awsapprunner.com`) |

---

## 4. Strategy 2 (Budget / Monolith): Single AWS EC2 with Nginx & PM2

If you want the simplest, lowest-cost server hosting everything on a single virtual machine (costing ~$3.50–$10/month on AWS Free Tier / t3.micro or t3.small):

```mermaid
flowchart LR
    User["Web Client"] -->|HTTPS (443)| Nginx["Nginx Reverse Proxy"]
    Nginx -->|Static Files /index.html| Frontend["/var/www/frontend (dist)"]
    Nginx -->|Proxy /api/ to :5000| Backend["Node.js + PM2 (Port 5000)"]
    Backend --> MongoDB[("MongoDB Atlas")]
```

### Step 1: Launch EC2 Instance
1. In **AWS EC2 Console**, click **Launch Instance**.
2. **Name**: `cuvasol-production-server`.
3. **OS**: **Ubuntu Server 24.04 LTS (HVM)**, SSD Volume Type.
4. **Instance type**: `t3.small` (2 vCPU, 2GB RAM recommended) or `t3.micro` (Free tier eligible).
5. **Key pair**: Create and download an SSH key pair (`cuvasol-key.pem`).
6. **Network / Security Group**: Check:
   - Allow SSH traffic from your IP (Port 22)
   - Allow HTTPS traffic from the internet (Port 443)
   - Allow HTTP traffic from the internet (Port 80)
7. **Storage**: 20–30 GB gp3 SSD.
8. Click **Launch Instance**.
9. Assign an **Elastic IP** in EC2 Console and associate it with the instance so the public IP remains static.

### Step 2: Server Setup & Dependencies
Connect via SSH:
```bash
ssh -i "cuvasol-key.pem" ubuntu@<YOUR_ELASTIC_IP>
```

Update packages and install Node.js 20, Nginx, and Git:
```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git

# Verify installations
node -v
npm -v
nginx -v

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

### Step 3: Deploy Backend on EC2
```bash
# Create application directory
sudo mkdir -p /var/www/cuvasol
sudo chown -R ubuntu:ubuntu /var/www/cuvasol
cd /var/www/cuvasol

# Clone your repository
git clone <YOUR_GITHUB_REPO_URL> .

# Setup backend
cd /var/www/cuvasol/backend
npm install --production

# Create backend .env file
nano .env
# (Paste all backend variables from Section 2)

# Start backend with PM2
pm2 start index.js --name "cuvasol-api"
pm2 save

# Ensure PM2 starts automatically on server reboot
pm2 startup
# (Run the sudo env PATH=... command printed on screen)
```

### Step 4: Build Frontend on EC2
```bash
cd /var/www/cuvasol
npm install

# Create frontend .env.production
nano .env.production
# Add:
# VITE_API_URL=https://yourdomain.com/api
# VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Build frontend
npm run build
```

### Step 5: Configure Nginx Reverse Proxy & SPA Fallback
Create the Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/cuvasol
```

Paste the following configuration (replace `yourdomain.com` with your domain or Elastic IP):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Root directory where Vite built the frontend
    root /var/www/cuvasol/dist;
    index index.html;

    # Frontend Single Page Application (SPA) routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M; # Support file & credential uploads
    }

    # Uploaded static files fallback
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache static assets (JS, CSS, images)
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/cuvasol /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Install Free SSL Certificate (Certbot / Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot automatically configures HTTPS redirection and sets up a systemd cron job for automatic certificate renewal.

---

## 5. Strategy 3 (Quickest Frontend): AWS Amplify Hosting

If you want the closest experience to Vercel's Git-push deploy for the frontend:

1. Open **AWS Amplify Console** -> Click **Host web app**.
2. Select **GitHub** and authorize AWS Amplify.
3. Select the repository and `main` branch.
4. Set build settings (`amplify.yml`):
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
5. In **Environment variables**, add `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`.
6. Go to **Rewrites and redirects** tab in Amplify Console and add the SPA rewrite rule:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
7. Connect your custom domain in **Amplify Domain Management**.

---

## 6. Database & 3rd-Party Integrations Updates

After shifting from Vercel to AWS, update external third-party providers with your new endpoints:

### 1. MongoDB Atlas Network Access
* Open [MongoDB Atlas](https://cloud.mongodb.com).
* Go to **Network Access** -> **IP Access List**.
* Add your AWS EC2 Elastic IP or allow access (`0.0.0.0/0` protected by strong database username/password) to avoid connection issues from dynamic AWS IPs (App Runner / Lambda).

### 2. Google OAuth & Google Meet API
* Open the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
* Edit your OAuth 2.0 Client ID:
  - **Authorized JavaScript origins**: Add `https://yourdomain.com`, `https://www.yourdomain.com`.
  - **Authorized redirect URIs**: Add `https://yourdomain.com/google-callback` and `https://api.yourdomain.com/api/auth/google/callback`.

### 3. Razorpay Payment Gateway
* Open [Razorpay Dashboard](https://dashboard.razorpay.com).
* Navigate to **Settings** -> **Webhooks**.
* Update the Webhook URL to: `https://api.yourdomain.com/api/payments/webhook` (or `https://yourdomain.com/api/payments/webhook` if using EC2 Nginx proxy).

### 4. Brevo / SMTP Email
* Ensure DNS TXT records (`SPF` and `DKIM`) for your custom domain remain valid as per your [Brevo DNS Instructions](file:///d:/teach-grow-guide/Brevo_DNS_Instructions.md).

---

## 7. Automated CI/CD Pipelines (GitHub Actions)

To automatically deploy new code commits to AWS without manual intervention:

Create `.github/workflows/deploy-aws.yml` in your repository:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Frontend
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
        run: npm run build

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://${{ secrets.AWS_S3_BUCKET }} --delete --exclude "index.html" --exclude "*.json" --cache-control "max-age=31536000,public,immutable"
          aws s3 sync dist/ s3://${{ secrets.AWS_S3_BUCKET }} --exclude "*" --include "index.html" --include "*.json" --cache-control "max-age=0,no-cache,no-store,must-revalidate"

      - name: Invalidate CloudFront Cache
        run: |
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

### GitHub Secrets Required:
In your GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions**, add:
* `AWS_ACCESS_KEY_ID`: IAM user access key with S3 & CloudFront permissions.
* `AWS_SECRET_ACCESS_KEY`: IAM user secret key.
* `AWS_S3_BUCKET`: `cuvasol-frontend-production`
* `CLOUDFRONT_DISTRIBUTION_ID`: Your CloudFront distribution ID.
* `VITE_API_URL`: `https://api.yourdomain.com/api`
* `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID.

---

## 8. Cutover & Rollback Plan

### Step-by-Step Cutover (Zero Downtime)
1. **Reduce DNS TTL**: 24–48 hours prior to switch, lower the DNS TTL of your domain records to `300` (5 minutes).
2. **Deploy and Smoke-Test AWS Environment**: Verify API endpoints (`/api/health`, `/api/auth/login`, `/api/tutors`) directly on your AWS URLs before pointing custom domains.
3. **Update DNS Records**:
   - Point root `@` and `www` to CloudFront distribution / Amplify / EC2 Elastic IP.
   - Point `api` to App Runner / EC2.
4. **Monitor Real-Time Logs**:
   - AWS CloudWatch logs for backend errors.
   - Browser console for CORS or network issues.
5. **Verify All Critical User Flows**:
   - Student & Tutor Login / Signup
   - Tutor Discovery & Search Filters
   - Profile photo & credential document uploads (stored in MongoDB binary buffer)
   - Razorpay Booking & Payment flow
   - Google Meet link generation & Email notifications

### Rollback Strategy
If critical unforeseen issues arise during cutover:
1. Immediately switch the DNS A/CNAME records back to Vercel (`cname.vercel-dns.com` or `76.76.21.21`).
2. Because TTL was reduced to 5 minutes in step 1, global traffic will revert to Vercel within minutes.

---

## 9. Cost Breakdown & Optimization

### Strategy 1 (CloudFront + S3 + App Runner)
| Component | Free Tier Allowance | Est. Normal Usage Cost |
| :--- | :--- | :--- |
| **Amazon CloudFront** | 1 TB data transfer/month free forever | **$0.00** |
| **Amazon S3** | 5 GB standard storage free for 12 months | **< $0.50 / month** |
| **AWS App Runner** | 1 vCPU, 2GB RAM provisioned instance | **$5.00 - $18.00 / month** (scales with requests) |
| **ACM SSL Certificate** | Free public certificates | **$0.00** |
| **Total Estimated Cost** | — | **~$5.50 - $20.00 / month** |

### Strategy 2 (Single EC2 Instance)
| Component | Free Tier Allowance | Est. Cost |
| :--- | :--- | :--- |
| **EC2 `t3.micro`** | 750 hours/month free for 12 months | **$0.00 (Year 1)** / ~$7.50/mo after |
| **EC2 `t3.small`** | Not free tier | **~$15.00 / month** |
| **EBS Storage (30GB)** | 30 GB gp3 free for 12 months | **$0.00 - $2.40 / month** |
| **Certbot SSL** | Free forever via Let's Encrypt | **$0.00** |
| **Total Estimated Cost** | — | **$0.00 - $17.40 / month** |

---

## Migration Checklist Summary

- [ ] Choose deployment strategy (**Strategy 1: S3 + CloudFront + App Runner** or **Strategy 2: EC2 Monolith**).
- [ ] Deploy and verify backend API (`/api/health`).
- [ ] Configure CORS `FRONTEND_URL` on backend to accept new domains.
- [ ] Build and upload frontend bundle to S3 / Amplify / EC2.
- [ ] Configure SPA rewrite rule (403/404 -> `/index.html`).
- [ ] Link custom domain and issue SSL certificates via ACM or Certbot.
- [ ] Update MongoDB Atlas IP access rules.
- [ ] Update Google Cloud OAuth authorized origins & redirect URIs.
- [ ] Update Razorpay Webhook URL.
- [ ] Perform end-to-end smoke testing across Student, Tutor, and Admin dashboards.
- [ ] Switch DNS records from Vercel to AWS.
