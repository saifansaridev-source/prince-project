# Ghar Bazaar — Vercel Deployment Guide

## Prerequisites
- Node.js 20.x
- Vercel CLI (`npm i -g vercel`) or Vercel dashboard
- MongoDB Atlas cluster (free tier works)
- Cloudinary account (free tier: 25 GB storage)
- Gmail App Password (for email OTP; or any SMTP)

---

## Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd ghar-bazaar
npm install
```

---

## Step 2 — Set Up Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `PORT` | Local server port (default 3000) | Local only |
| `NODE_ENV` | Set `production` on Vercel | Yes |
| `APP_URL` | Full public URL e.g. `https://ghar-bazaar.vercel.app` | Yes |
| `SESSION_SECRET` | Long random string (32+ chars) | **Yes** |
| `MONGODB_URI` | MongoDB Atlas connection string | **Yes** |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | **Yes** |
| `CLOUDINARY_API_KEY` | Cloudinary API key | **Yes** |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | **Yes** |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Optional |
| `EMAIL_USER` | Gmail address for sending OTPs | Optional |
| `EMAIL_PASS` | Gmail App Password (not account pw) | Optional |
| `SMTP_HOST` | SMTP host (default: gmail service) | Optional |
| `SMTP_PORT` | SMTP port (default: 587) | Optional |
| `SMTP_SECURE` | `true`/`false` for TLS (default: false) | Optional |
| `MAIL_FROM` | Sender display address | Optional |

> **Without EMAIL_USER/PASS**: OTP codes are printed to the server console (demo mode). The `/api/auth/demo-otp?email=xyz` endpoint reveals the OTP for testing.

---

## Step 3 — MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist IP: Add `0.0.0.0/0` (allow all) for Vercel serverless IPs
4. Copy the connection string to `MONGODB_URI` — e.g.:
   ```
   mongodb+srv://username:password@cluster0.abc12.mongodb.net/gharbazaar?retryWrites=true&w=majority
   ```

---

## Step 4 — Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. From Dashboard → copy: Cloud Name, API Key, API Secret
3. Add all three to your `.env` and Vercel env

---

## Step 5 — Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. **Authorized JavaScript origins** — add:
   - `http://localhost:3000`
   - `https://your-app.vercel.app`
5. **Authorized redirect URIs** — add:
   - `http://localhost:3000/auth/google/callback`
   - `https://your-app.vercel.app/auth/google/callback`
6. Copy Client ID → `GOOGLE_CLIENT_ID` in `.env` and Vercel

---

## Step 6 — Test Locally

```bash
node server.js
```

Verify:
- Home page loads at `http://localhost:3000`
- `GET http://localhost:3000/api/health` returns `{"ok":true,"db":1,...}`
- Signup → OTP in console → Verify → Login works
- Image upload via add-property goes to Cloudinary
- Session persists on page refresh

---

## Step 7 — Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "feat: Vercel serverless deployment ready"
   git push origin main
   ```

2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Framework Preset: **Other** (not Next.js)
4. Root Directory: `/` (root of the repo)
5. Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**:
   - `NODE_ENV` = `production`
   - `APP_URL` = `https://your-project.vercel.app`
   - All other variables from the table above
6. Click **Deploy**

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted, add environment variables or set them via:
```bash
vercel env add MONGODB_URI
vercel env add SESSION_SECRET
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
vercel env add NODE_ENV
vercel env add APP_URL
```

---

## Step 8 — Verify Deployment

After deploy, check:
```
GET https://your-app.vercel.app/api/health
```
Should return:
```json
{ "ok": true, "db": 1, "cloudinary": true, "emailService": true, ... }
```

---

## Default Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gharbazaar.com` | `Admin@123` |
| Broker 1 | `rajesh.broker@gharbazaar.com` | `Broker@123` |
| Broker 2 | `sunita.broker@gharbazaar.com` | `Broker@123` |
| Broker 3 | `vikram.broker@gharbazaar.com` | `Broker@123` |
| Renter | `rahul.renter@gmail.com` | `User@123` |

---

## Git Commands for Deployment

```bash
git add .
git commit -m "feat: Vercel serverless compatible — Cloudinary, MongoStore sessions, no fs writes"
git push origin main
```

Then re-deploy on Vercel dashboard or run `vercel --prod`.

---

## Architecture Notes

- **Sessions**: Stored in MongoDB via `connect-mongo` (not in-memory) — persists across Vercel cold starts
- **Images**: All uploads go directly to Cloudinary via `upload_stream` — no filesystem writes
- **DB Connection**: Cached in `global._mongoose` — reused across warm lambda invocations
- **File size limit**: 4MB per image (Vercel 4.5MB request body limit)
- **Client compression**: Canvas API compresses images >2MB before upload
