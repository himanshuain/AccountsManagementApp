# Shop Manager - Clothes Shop Accounting

A modern, mobile-first web application for managing clothes shop suppliers, customers, transactions, and bills with secure cloud storage.

## ✨ Features

### Core Features
- **Supplier Management** - Store supplier profiles with photos, contact details, GST numbers, UPI QR codes, and bank information
- **Customer Management** - Track customers with khata (ledger) photos and pending amounts
- **Transaction Tracking** - Record transactions with itemized bills, payment status, and due dates
- **Udhar (Credit) System** - Manage customer credit with payment tracking and receipts
- **Bill Image Storage** - Upload and store bill/receipt images with CDN optimization
- **Revenue Reports** - Track income and expenses with date filtering

### Technical Features
- **Multi-User Sync** - Data syncs to cloud for access across devices
- **PIN Authentication** - Secure 6-digit PIN with rate limiting and bcrypt hashing
- **Offline Support** - Local preview during uploads, graceful fallbacks
- **Image Optimization** - Automatic compression, WebP/AVIF conversion, responsive thumbnails
- **Mobile-First UI** - Optimized for mobile with bottom navigation and touch gestures

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Dashboard  │  │  Suppliers  │  │  Customers  │  │   Reports   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │               │
│         └────────────────┴────────────────┴────────────────┘               │
│                                   │                                        │
│                          ┌────────┴────────┐                               │
│                          │   API Routes    │                               │
│                          │  (Protected)    │                               │
│                          └────────┬────────┘                               │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
            ┌───────▼───────┐            ┌───────▼───────┐
            │   Supabase    │            │ Cloudflare R2 │
            │  (Database)   │            │   (Storage)   │
            │               │            │               │
            │ - Suppliers   │            │ - Bill Images │
            │ - Customers   │            │ - Receipts    │
            │ - Transactions│            │ - Profiles    │
            │ - Udhar       │            │ - QR Codes    │
            │ - Income      │            │               │
            └───────────────┘            └───────┬───────┘
                                                 │
                                         ┌───────▼───────┐
                                         │   ImageKit    │
                                         │    (CDN)      │
                                         │               │
                                         │ - Transforms  │
                                         │ - WebP/AVIF   │
                                         │ - Thumbnails  │
                                         └───────────────┘
```

---

## 📸 Image Storage Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           IMAGE UPLOAD FLOW                              │
└──────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
  │  User   │────▶│  Compress   │────▶│  Validate    │────▶│  Upload to  │
  │ Selects │     │  (Client)   │     │  (Server)    │     │     R2      │
  │  Image  │     │  Max 500KB  │     │  Type/Size   │     │             │
  └─────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                  │
                                                                  ▼
                                                         ┌───────────────┐
                                                         │ Return Storage│
                                                         │     Key       │
                                                         │ e.g. bills/   │
                                                         │ 123-abc.jpg   │
                                                         └───────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          IMAGE DISPLAY FLOW                              │
└──────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
  │  Storage    │────▶│  resolveUrl()   │────▶│  ImageKit CDN URL       │
  │    Key      │     │  (Client)       │     │  with transformations   │
  │             │     │                 │     │                         │
  │ bills/      │     │ + IMAGEKIT_URL  │     │ ik.imagekit.io/xxx/     │
  │ 123-abc.jpg │     │   ENDPOINT      │     │ tr:w-200,q-80/bills/... │
  └─────────────┘     └─────────────────┘     └─────────────────────────┘
```

**Key Concept**: Only storage keys (e.g., `bills/123-abc.jpg`) are stored in the database, not full URLs. URLs are resolved at display time using ImageKit CDN.

---

## 🔐 Security Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                              │
└──────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
  │  User   │────▶│ Rate Limit  │────▶│ Verify PIN   │────▶│ Set Cookies │
  │ Enters  │     │ Check       │     │ (bcrypt)     │     │ (HttpOnly)  │
  │   PIN   │     │ 5/min/IP    │     │              │     │             │
  └─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
                        │
                        ▼ (if exceeded)
                  ┌─────────────┐
                  │   Block     │
                  │   Access    │
                  └─────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          API PROTECTION                                  │
└──────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
  │  API        │────▶│   Middleware    │────▶│  Route Handler          │
  │  Request    │     │   Check Auth    │     │  (Protected)            │
  │             │     │   Cookies       │     │                         │
  └─────────────┘     └────────┬────────┘     └─────────────────────────┘
                               │
                               ▼ (if unauthorized)
                         ┌───────────┐
                         │ 401 Error │
                         └───────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        UPLOAD SECURITY                                   │
└──────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────┐
  │  Validations:                                                         │
  │  ✓ File size limit (10MB max)                                         │
  │  ✓ MIME type whitelist (jpeg, png, gif, webp, heic)                   │
  │  ✓ Extension whitelist                                                │
  │  ✓ Magic bytes verification (prevents content-type spoofing)          │
  │  ✓ Folder whitelist (general, suppliers, customers, bills, etc.)      │
  │  ✓ Sanitized storage keys                                             │
  └───────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | JavaScript (React) |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI |
| **Data Grid** | MUI DataGrid |
| **Database** | Supabase (PostgreSQL) |
| **Image Storage** | Cloudflare R2 (S3-compatible) |
| **Image CDN** | ImageKit (transforms, optimization) |
| **Deployment** | Vercel |
| **Auth** | Custom PIN-based with bcrypt |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.11.0 or later
- npm or yarn
- Accounts: Supabase, Cloudflare R2, ImageKit, Vercel

### Installation

1. **Clone and install**:
```bash
git clone <repository-url>
cd clothes-shop-manager
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

3. **Configure `.env.local`**:
```env
# Authentication
APP_PIN=123456

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare R2 (Storage)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=shop-images

# ImageKit (CDN)
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

4. **Set up database**:
   - Run the SQL in `supabase-schema.sql` in your Supabase SQL editor

5. **Configure ImageKit**:
   - Add R2 as an external storage source in ImageKit dashboard
   - Use the R2 public URL or S3-compatible endpoint

6. **Run development server**:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── page.js               # Dashboard home
│   │   ├── suppliers/            # Suppliers management
│   │   ├── customers/            # Customers & Udhar management
│   │   └── reports/              # Revenue reports
│   ├── login/                    # Login page
│   └── api/                      # API routes
│       ├── auth/                 # Authentication
│       ├── suppliers/            # Supplier CRUD
│       ├── customers/            # Customer CRUD
│       ├── transactions/         # Transaction CRUD
│       ├── udhar/                # Udhar CRUD
│       ├── upload/               # Image upload to R2
│       ├── storage/              # R2 storage stats
│       └── backup/               # Database backup/restore
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── ImageUpload.jsx           # Single/Multi image upload
│   ├── ImageViewer.jsx           # Image gallery viewer
│   ├── OptimizedImage.jsx        # CDN-optimized image display
│   ├── TransactionForm.jsx       # Transaction form
│   ├── SupplierForm.jsx          # Supplier form
│   ├── CustomerForm.jsx          # Customer form
│   ├── UdharForm.jsx             # Udhar (credit) form
│   └── ...
├── hooks/
│   ├── useSuppliers.js           # Supplier data hooks
│   ├── useCustomers.js           # Customer data hooks
│   ├── useTransactions.js        # Transaction data hooks
│   ├── useUdhar.js               # Udhar data hooks
│   └── useStorage.js             # R2 storage stats hook
└── lib/
    ├── supabase.js               # Supabase client
    ├── r2-storage.js             # Cloudflare R2 client
    ├── image-url.js              # CDN URL resolution
    ├── imagekit-server.js        # Server-side image operations
    ├── validation.js             # Zod schemas
    ├── auth.js                   # Auth utilities
    ├── password.js               # PIN hashing (bcrypt)
    └── rate-limit.js             # Rate limiting
```

---

## 🔄 Data Flow Diagrams

### Record Deletion with Image Cleanup

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELETE RECORD FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

  ┌───────────┐     ┌────────────────┐     ┌────────────────────────────┐
  │  DELETE   │────▶│ Fetch Record   │────▶│ Collect All Image Keys     │
  │  Request  │     │ with Images    │     │ (profile, bills, receipts) │
  └───────────┘     └────────────────┘     └─────────────┬──────────────┘
                                                         │
                    ┌────────────────────────────────────┘
                    │
                    ▼
  ┌────────────────────────────────┐     ┌────────────────────────────┐
  │  Delete Images from R2         │     │  Delete Record from DB     │
  │  (async, non-blocking)         │     │  (Supabase)                │
  └────────────────────────────────┘     └────────────────────────────┘
```

### Record Update with Image Replacement

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    UPDATE RECORD FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

  ┌───────────┐     ┌────────────────┐     ┌────────────────────────────┐
  │   PUT     │────▶│ Fetch Existing │────▶│ Compare Old vs New Images  │
  │  Request  │     │ Record         │     │                            │
  └───────────┘     └────────────────┘     └─────────────┬──────────────┘
                                                         │
                    ┌────────────────────────────────────┘
                    │
                    ▼
  ┌────────────────────────────────┐     ┌────────────────────────────┐
  │  Delete Replaced/Removed       │     │  Update Record in DB       │
  │  Images from R2 (async)        │     │  (Supabase)                │
  └────────────────────────────────┘     └────────────────────────────┘
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|----------------|
| **PIN Authentication** | 6-digit PIN hashed with bcrypt |
| **Rate Limiting** | 5 attempts/minute per IP |
| **Session Management** | HttpOnly cookies, session versioning |
| **API Protection** | Middleware checks auth on all `/api/*` routes |
| **Upload Security** | File type/size validation, magic bytes check |
| **Database Security** | RLS policies, service role key for server |
| **Input Validation** | Zod schemas on all API inputs |

---

## 📊 Storage Quotas

### Cloudflare R2 Free Tier
- **Storage**: 10 GB/month
- **Class A Operations**: 1 million/month (writes)
- **Class B Operations**: 10 million/month (reads)
- **Egress**: Free (via R2 public URL or ImageKit)

### ImageKit Free Tier
- **Bandwidth**: 20 GB/month
- **Storage**: Unlimited (when using external storage like R2)
- **Transformations**: Unlimited

---

## 🚢 Deployment

### Vercel Deployment

1. Push to GitHub repository
2. Import project in Vercel Dashboard
3. Configure environment variables (see above)
4. Deploy!

### Environment Variables for Production

Ensure all these are set in Vercel:
- `APP_PIN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`

---

## 📝 License

MIT
