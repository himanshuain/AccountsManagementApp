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


## License

MIT
