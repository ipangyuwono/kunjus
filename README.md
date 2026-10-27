# 🎓 Kunjus — Industrial Visit & Fee Management System

A fast, lightweight, and modern web application designed to manage student billing, installment payments, and financial reporting for school industrial visits (*Kunjungan Industri*). Built with **pure Vanilla JavaScript**, backed by **Supabase**, and deployed seamlessly on **Vercel**.

---

## ✨ Features

- **📊 Interactive Dashboard** — Real-time insights into total funds collected, payment completion rates, and overall progress.
- **👥 Student Billing Management** — Comprehensive records of student profiles, classes, NIS, and billing targets with search, filters, and pagination.
- **💳 Cashier & Payment Processing** — Quick installment recording, remaining balance calculation, and instant printable digital receipts (*Kwitansi*).
- **📜 Transaction History & Audit** — Full transaction logs with receipt reprinting and payment cancellation capabilities.
- **📥 Batch Excel Import & Export** — High-speed bulk student onboarding and stylized `.xlsx` financial report generation powered by ExcelJS.
- **🔐 Secure Auth & Role Access** — Supabase Auth with granular role controls (Admin & Cashier/Operator).
- **🔑 Serverless Password Recovery** — Forgot and reset password workflows powered by Vercel Serverless Functions and Brevo email API.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Supabase Auth)
- **Serverless API:** Node.js on Vercel Serverless Functions (`/api`)
- **Third-Party Libraries:** ExcelJS (Excel Import/Export), Brevo API (Transactional Emails)
- **Deployment:** [Vercel](https://vercel.com/)

---

## 📁 Project Structure

```text
├── index.html                 # Main single-page application entry
├── forgot-password.html       # Password reset request page
├── reset-password.html        # New password submission page
├── api/                       # Vercel Serverless Functions (Server-side)
│   ├── _lib/supabase.js       # Secure Supabase client (service_role)
│   ├── forgot-password.js     # Password reset email handler
│   └── reset-password.js      # Password update handler
├── src/
│   ├── main.js                # Application entrypoint & DOM event bindings
│   ├── pages/                 # UI views (dashboard, siswa, bayar, riwayat, laporan)
│   ├── services/              # API layer, state store, and Supabase client
│   └── lib/                   # Utilities, UI helpers, and Excel import/export
├── server.js                  # Local Express development server
└── vercel.json                # Vercel deployment configuration
