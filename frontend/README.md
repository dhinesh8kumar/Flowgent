# TankerOS — React Dashboard

## Setup

```powershell
# 1. Install dependencies
npm install

# 2. Copy env file
copy .env.example .env

# 3. Start (make sure backend is running on port 3000 first)
npm run dev
```

Opens at: http://localhost:5173

## Login
- Email: admin@sribalaji.com
- Password: admin123

## Folder Structure
```
src/
├── App.tsx               # Routes + providers
├── main.tsx              # Entry point
├── index.css             # Tailwind + global styles
├── context/
│   └── AuthContext.tsx   # JWT auth state
├── services/
│   └── api.ts            # Axios + API helpers
├── types/
│   └── index.ts          # TypeScript interfaces
├── components/
│   ├── ui/index.tsx      # Card, Button, Input, Badge, Modal...
│   └── layout/
│       ├── Layout.tsx    # Page wrapper
│       └── Sidebar.tsx   # Nav sidebar + mobile drawer
└── pages/
    ├── Login.tsx         # Auth page
    ├── Dashboard.tsx     # Overview + stats
    ├── Bookings.tsx      # Booking list + status updates
    ├── Tankers.tsx       # Fleet management
    ├── Customers.tsx     # Customer list
    └── Settings.tsx      # Company + WhatsApp config
```
