# Shop Manager - Clothes Shop Accounting

A modern web application for managing clothes shop suppliers, transactions, and bills.

## Features

- **Supplier Management**: Store supplier profiles with photos, contact details, GST numbers, and bank information
- **Transaction Tracking**: Record transactions with itemized bills, payment status, and due dates
- **Bill Image Storage**: Upload and store bill images for each transaction
- **Multi-User Support**: Data syncs to cloud for access by multiple users (4-5)
- **Simple Authentication**: PIN-based access protection

## Tech Stack

- **Frontend**: Next.js 14, React, JavaScript
- **Styling**: Tailwind CSS, shadcn/ui, MUI5 DataGrid
- **Storage**: ImageKit (for storing images), Supabase ( for JSON data)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
cd clothes-shop-manager
```

2. Install dependencies:
```bash
npm install --registry=https://registry.npmjs.org/
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Configure environment variables:
   - `APP_PIN`: Set your desired 6-digit PIN (default: 123456)
   - `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`: Your ImageKit URL endpoint (e.g., https://ik.imagekit.io/your_id)
   - `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`: Your ImageKit public key
   - `IMAGEKIT_PRIVATE_KEY`: Your ImageKit private key (server-side only)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Default PIN

The default PIN is `123456`. Change it in your `.env.local` file for production.

## Deployment to Vercel

1. Push to the GitHub repository

2. Import project in Vercel Dashboard

3. Configure environment variables:
   - `APP_PIN`
   - `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`
   - `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`

4. Create Blob storage in Vercel (or use ImageKit).

5. Deploy!

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── page.js           # Dashboard home
│   │   ├── suppliers/        # Suppliers management
│   │   └── transactions/     # Transactions management
│   ├── login/                # Login page
│   └── api/                  # API routes
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── ...                   # Custom components
├── hooks/                    # Custom React hooks
└── lib/                      # Utilities and services
```

Security and Data Protection Implementations

1. Authentication Middleware (src/middleware.js)
Protects all /api/* routes (except /api/auth)
Checks for valid session cookies before allowing API access
Redirects unauthenticated users to login page for non-API routes
2. Rate Limiting (src/lib/rate-limit.js)
Limits PIN authentication attempts to 5 per minute per IP
Prevents brute-force attacks on the 6-digit PIN
Resets on successful login
3. PIN Hashing (src/lib/password.js)
Uses bcrypt to hash PINs before storage
Automatically upgrades legacy plaintext PINs to hashed versions on login
Secure comparison that's timing-attack resistant
4. Restrictive RLS Policies (supabase-schema.sql)
Updated policies to deny access via the anon key
Only the service_role key (used server-side) can access data
Added getServerClient() function that uses service role key in API routes
5. HttpOnly Auth Cookie (src/app/api/auth/route.js, src/lib/auth.js)
Main auth cookie is now httpOnly (can't be stolen via XSS)
Separate non-httpOnly UI indicator cookie for client-side rendering
Session version cookie for "logout other devices" feature
6. Full Database Backup (src/app/api/backup/route.js, src/lib/export.js)
New /api/backup endpoint exports all tables as JSON
Includes suppliers, transactions, customers, udhar, and income
Supports backup restoration via POST
7. Input Validation (src/lib/validation.js)
Zod schemas for all entity types
Validates and sanitizes input in POST/PUT routes
UUID validation for ID parameters
Prevents SQL injection and malformed data
Important Notes:
Environment Variable Required: You need to add SUPABASE_SERVICE_ROLE_KEY to your environment variables. Get this from your Supabase dashboard under Settings > API.
Run Updated Schema: Run the updated SQL in supabase-schema.sql in your Supabase SQL editor to apply the new RLS policies.
Existing PINs: Legacy plaintext PINs will be automatically upgraded to hashed versions when users log in.

## License

MIT
