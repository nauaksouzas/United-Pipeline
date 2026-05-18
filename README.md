# KSP Dominion Group / EchoTrack Weekly Report System

A role-based weekly report system for KSP Dominion Group and EchoTrack. 
Supports students submitting weekly reports, and Admin, Program Managers, Coaches, and Instructors reviewing, tracking, and engaging with those reports.

## Prerequisites
- Node.js (v18+)
- SQLite (included)

## Setup
1. Copy the example environment file:
   `cp .env.example .env`
2. Update the `.env` file with a secure `JWT_SECRET`.
3. Install dependencies:
   `npm install`
4. Setup the database and run migrations:
   `npx prisma db push`
   *(Optional)* Seed default data:
   `NODE_ENV=development npx prisma db seed`

## Running Locally
Start both the Vite frontend and Express backend:
`npm run dev`

## Roles
- **Admin**: Full access.
- **Program Manager**: Views their assigned students, coaches, and alerts.
- **Coach**: Tracks individual student progress and flags alerts.
- **Instructor**: Views class feedback and performance metrics.
- **Student**: Submits weekly reports and views class tracking.
