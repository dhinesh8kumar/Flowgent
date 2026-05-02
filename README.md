🚀 Flowgent — Multi-Tenant Service Automation SaaS
A full-stack SaaS platform that enables customers to book services via a WhatsApp AI chatbot, while businesses manage operations through a modern React dashboard. Built for scalable, real-time, AI-driven workflows.

---

## 📦 Project Structure

```
TankerOS/
├── backend/          Node.js + Express + TypeScript + Prisma
└── dashboard/        React 18 + Vite + Tailwind CSS
```

---

## ✨ Features

### Customer-Facing (WhatsApp)
- AI-powered chatbot handles natural language booking requests
- Understands messages like *"Book 10KL sweet water tomorrow morning Kondapur"*
- Quotes accurate prices from the database
- Multi-turn conversation with context memory
- Graceful fallback when AI is unsure

### Admin Dashboard
- Login with JWT authentication
- Overview stats: today's bookings, pending, revenue, customers
- Full bookings table with status filters and update actions
- Fleet management — add/edit tankers and drivers
- Customer list with booking history
- Settings — company profile and WhatsApp connection config

### Backend / Platform
- **Multi-tenant** — one backend supports many tanker companies
- Each tenant has their own WhatsApp number, pricing, and customers
- Dynamic pricing from database — update prices without redeploying
- Tenant context text blob — admins write free-form pricing/rules text that gets injected into every AI prompt
- JWT authentication for dashboard users
- Role-based access: `SUPER_ADMIN`, `ADMIN`, `OPERATOR`

---

## 🗂️ Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20 + TypeScript |
| Web framework | Express 4 |
| Database | PostgreSQL (Neon.tech recommended) |
| ORM | Prisma 5 |
| AI / LLM | Groq (llama-3.1-70b-versatile) |
| WhatsApp | Meta WhatsApp Cloud API |
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State / data | TanStack Query v5 |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (or free [Neon.tech](https://neon.tech) account)
- [Groq API key](https://console.groq.com) (free)
- Meta WhatsApp Cloud API credentials (for WhatsApp integration)
- [ngrok](https://ngrok.com) (for local WhatsApp webhook testing)

---

### 1. Backend Setup

```powershell
cd backend
npm install
copy .env.example .env
```

Edit `.env` with your values (see Environment Variables section below).

```powershell
# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed demo data (tenant + admin user + tankers)
npm run db:seed

# Seed services and pricing
npx ts-node --project tsconfig.seed.json prisma/seed-services.ts

# Start dev server
npm run dev
```

Server runs at **http://localhost:3000**

---

### 2. Dashboard Setup

```powershell
cd dashboard
npm install
copy .env.example .env
npm run dev
```

Dashboard runs at **http://localhost:5173**

Login with: `admin@sribalaji.com` / `admin123`

---

### 3. WhatsApp Webhook Setup (local dev)

```powershell
# In a separate terminal — expose local server to internet
ngrok http 3000
```

Copy the `https://xxxx.ngrok-free.app` URL.

In [Meta Developer Console](https://developers.facebook.com):
1. App → WhatsApp → Configuration → Webhook
2. Set **Callback URL**: `https://xxxx.ngrok-free.app/webhook`
3. Set **Verify Token**: same value as `WHATSAPP_VERIFY_TOKEN` in your `.env`
4. Click **Verify and Save**
5. Subscribe to the **`messages`** field

---

## 🔑 Environment Variables

### Backend `.env`

```env
# Database
DATABASE_URL="postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require"

# JWT
JWT_SECRET="your-random-secret-min-32-chars"
JWT_EXPIRES_IN="7d"

# WhatsApp Cloud API (from Meta Developer Console)
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxx"
WHATSAPP_PHONE_NUMBER_ID="1234567890"
WHATSAPP_VERIFY_TOKEN="your-webhook-verify-token"
WHATSAPP_API_VERSION="v19.0"

# Groq AI (from console.groq.com)
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
GROQ_MODEL="llama-3.1-70b-versatile"

# App
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
```

> ⚠️ The WhatsApp temporary access token expires every 24 hours during development. Regenerate it from Meta Developer Console → WhatsApp → API Setup when you get authentication errors.

### Dashboard `.env`

```env
VITE_API_URL=http://localhost:3000
```

---


## 🗃️ Database Schema

```
Tenant          — one row per tanker company
User            — dashboard admins/operators
Customer        — WhatsApp customers (auto-created on first message)
Tanker          — physical vehicles in the fleet
Booking         — confirmed delivery orders
Conversation    — WhatsApp chat session per customer
Message         — individual messages (inbound + outbound)
Service         — services and pricing per tenant
TenantContext   — free-form AI context text per tenant
```

---

## 🤖 AI Booking Flow

```
Customer: "Book 10KL sweet water tomorrow morning Kondapur"
        ↓
MessageRouter.processIncomingMessage()
        ↓
PricingService.getPricingForAI()     ← loads from Service table + TenantContext
        ↓
PromptBuilder.buildSystemPrompt()    ← injects real prices into system prompt
        ↓
Groq (llama-3.1-70b)                 ← understands intent, quotes price
        ↓
ParsedAIReply { intent: 'book', estimatedPrice: 700 }
        ↓
If all fields present → confirm with customer
If fields missing    → ask follow-up question
        ↓
createBooking() → saved to DB → confirmation sent
```

### Using Manual Pricing (for testing without DB)

In `src/routes/webhook.ts`, uncomment and edit the `manualPricingContext` block:

```typescript
manualPricingContext: {
  services: [
    {
      serviceName: 'Sweet Water 10KL',
      basePrice: 700,
      unit: 'INR',
      deliveryAreas: ['Kondapur', 'Gachibowli'],
    },
  ],
  rules: { currency: 'INR', operatingHours: '6AM-9PM' },
}
```

---

## 🏢 Multi-Tenancy

Every database table has a `tenantId` column. Tenant resolution works two ways:

| Source | How tenant is resolved |
|---|---|
| Dashboard (JWT) | `authenticate` middleware decodes JWT → `req.tenantId` |
| WhatsApp webhook | `resolveTenantFromPhoneId()` looks up tenant by `whatsappPhoneId` |

To onboard a new tanker company:
```bash
POST /tenants
{
  "tenantName": "Sri Lakshmi Waters",
  "slug": "sri-lakshmi-waters",
  "adminName": "Admin Name",
  "adminEmail": "admin@example.com",
  "adminPassword": "securepassword",
  "whatsappPhoneId": "their-meta-phone-number-id"
}
```

---



## 🔧 Common Issues

| Error | Fix |
|---|---|
| `P1001: Can't reach database server` | PostgreSQL not running. Start it or check DATABASE_URL |
| `Authentication Error (code 190)` | WhatsApp token expired. Regenerate in Meta Developer Console |
| `Webhook verification failed` | WHATSAPP_VERIFY_TOKEN in .env doesn't match Meta dashboard |
| `Cannot find module 'src/index.ts'` | Run `npm run dev` from inside the `backend/` folder |
| `Module has no exported member` | Run `npm run db:generate` after schema changes |
| `&&` not working in PowerShell | Use `;` instead: `npm run db:push; npm run db:seed` |

---

## 🗺️ Roadmap

- [ ] Admin approval flow for booking requests
- [ ] Instagram DM integration
- [ ] Telegram bot integration  
- [ ] Interactive WhatsApp buttons (service menu, time slots)
- [ ] Driver mobile app (PWA)
- [ ] Razorpay payment integration
- [ ] Auto-assign tanker based on locality + availability
- [ ] SMS fallback for non-WhatsApp customers
- [ ] Analytics dashboard with revenue charts
