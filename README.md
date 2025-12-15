# Shop Manager - Clothes Shop Accounting

A modern, offline-first web application for managing clothes shop suppliers, transactions, and bills.

## Features

- **Supplier Management**: Store supplier profiles with photos, contact details, GST numbers, and bank information
- **Transaction Tracking**: Record transactions with itemized bills, payment status, and due dates
- **Bill Image Storage**: Upload and store bill images for each transaction
- **Offline-First**: Works offline with local IndexedDB storage, syncs when online
- **Multi-User Support**: Data syncs to cloud for access by multiple users (4-5)
- **Simple Authentication**: PIN-based access protection

## Tech Stack

- **Frontend**: Next.js 14, React, JavaScript
- **Styling**: Tailwind CSS, shadcn/ui, MUI5 DataGrid
- **Storage**: Vercel Blob (cloud), IndexedDB (local)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Vercel account (for deployment and Blob storage)

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
   - `BLOB_READ_WRITE_TOKEN`: Get from Vercel Dashboard > Storage > Blob
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

1. Push to GitHub repository

2. Import project in Vercel Dashboard

3. Configure environment variables:
   - `BLOB_READ_WRITE_TOKEN`
   - `APP_PIN`
   - `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`
   - `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`

4. Create Blob storage in Vercel (or use ImageKit):
   - Go to Storage > Create Database > Blob
   - Copy the token to your environment variables

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

## Offline Support

The app uses IndexedDB for local storage. When offline:
- All data is saved locally
- Changes are queued for sync
- A "pending sync" indicator shows unsynced changes

When back online:
- Data automatically syncs to cloud
- Conflicts are resolved using last-write-wins

## License

MIT
