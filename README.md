# KSP Dominion Group / EchoTrack Weekly Report System

A role-based weekly report system for KSP Dominion Group and EchoTrack.
Supports students submitting weekly reports, and Admin, Program Managers, Coaches, and Instructors reviewing, tracking, and engaging with those reports.

## Prerequisites
- Node.js (v18+)
- SQLite (included for local development)

## Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Update the `.env` file with a secure `JWT_SECRET` and Firebase settings.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Setup the database and run migrations:
   ```bash
   npx prisma db push
   ```
   *(Optional)* Seed default data:
   ```bash
   NODE_ENV=development npx prisma db seed
   ```

## Running Locally
Start both the Vite frontend and Express backend:
```bash
npm run dev
```

The local API is mounted under `/api`. You can verify it with:
```bash
curl http://localhost:3000/api/health
```

## Production deployment on Vercel

The app includes a Vercel serverless API catch-all at `api/[...path].ts`, which reuses the same Express API app as local development. After deployment, verify the API with:

- https://echo-track-omega.vercel.app/api/health

### Required Vercel environment variables

Set these in **Vercel Project Settings → Environment Variables** for Production (and Preview/Development as needed):

```text
DATABASE_URL="file:./dev.db"
JWT_SECRET="REPLACE_WITH_RANDOM_HEX_64"

VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
VITE_FIREBASE_MEASUREMENT_ID=""
VITE_FIREBASE_FIRESTORE_DATABASE_ID=""

FIREBASE_PROJECT_ID=""
FIREBASE_SERVICE_ACCOUNT_BASE64=""
GOOGLE_APPLICATION_CREDENTIALS=""
```

Use a strong random `JWT_SECRET`; for example, generate one with `openssl rand -hex 32`.

For Firebase Admin in Vercel, prefer `FIREBASE_SERVICE_ACCOUNT_BASE64` instead of committing a JSON key file. Generate it from a downloaded Firebase service account JSON file with Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
```

Never commit service account JSON files, private keys, or `.env` files. The `.gitignore` file excludes common Firebase service account filenames.

### Firebase Authorized Domain

In the Firebase Console, add this production host to **Authentication → Settings → Authorized domains**:

```text
echo-track-omega.vercel.app
```

### Production database note

Production database currently needs migration from SQLite to Supabase Postgres before real production use. The current Prisma schema intentionally keeps SQLite so local development continues to work with `DATABASE_URL="file:./dev.db"`.

Before using real production data, update `prisma/schema.prisma` to a Postgres datasource, set Vercel `DATABASE_URL` to the Supabase Postgres connection string, and run the appropriate Prisma migration or `prisma db push` against the production database.

## Roles
- **Admin**: Full access.
- **Program Manager**: Views their assigned students, coaches, and alerts.
- **Coach**: Tracks individual student progress and flags alerts.
- **Instructor**: Views class feedback and performance metrics.
- **Student**: Submits weekly reports and views class tracking.
