# Color Rizz 🎨

A modern, high-performance colour prediction & trading platform built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Firebase**.

---

## ✨ Features

- **⚡ Real-time Color Trading Game**:
  - Live round countdown & visual round timers.
  - Multi-tier color betting (Green, Violet, Red, Numbers 0-9).
  - Automated round payout calculation with parity checks and reconciliation.
- **📱 Responsive User Experience**:
  - Native app-like experience with animated bottom navigation.
  - Responsive wallet management (Transactions, Recharge, Withdrawal, Bank Card Linking).
  - Modern Telegram-support recharge payment flow with UTR submission.
- **🛡️ Comprehensive Admin Console (`/admin`)**:
  - Live User Directory (search by phone number, balance breakdown, status management).
  - Recharges & Payouts approval dashboard (showing player phone numbers, bank snapshots, and quick actions).
  - Game rounds supervisor & manual override.
  - Full audit logging & immutable action history.
  - Dynamic game & system configuration.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI & Styling**: React 19, Tailwind CSS v4, Lucide Icons, React Hot Toast
- **Backend & Database**: Firebase Firestore, Firebase Admin SDK, Firebase Auth
- **Automation**: Vercel Cron (`/api/game/tick`)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file based on `.env.example`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment

Deploy easily to **Vercel**:
1. Connect your repository (`himanshupal24/color-rizz`) on Vercel.
2. Add your environment variables in Vercel project settings.
3. Add your Vercel production domain to **Firebase Console → Authentication → Authorized domains**.
