# Oracle-Salla Sync Server

A multi-tenant middleware server that syncs inventory from Oracle ERP systems to Salla e-commerce stores on demand.

## Architecture

```
Client PC Tool ──► POST /sync/inventory ──► This Server ──► Salla API
                                                │
                                          PostgreSQL DB
                                   (clients, tokens, sync_logs)
```

Each client has an API key (`sk_...`). Their Salla store is authorized via the Salla OAuth2 webhook. When a sync is triggered, the server:
1. Validates the API key
2. Refreshes the Salla token if needed
3. Aggregates barcodes/quantities from the ERP payload
4. Fetches all products from Salla (paginated)
5. Updates quantities with concurrency control + retries
6. Logs the result to the database

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3000) |
| `ADMIN_API_KEY` | Secret key for admin endpoints — generate a long random string |
| `SALLA_CLIENT_ID` | Your Salla app's client ID |
| `SALLA_CLIENT_SECRET` | Your Salla app's client secret |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default 5432) |
| `DB_USERNAME` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `SALLA_UPDATE_CONCURRENCY` | How many product updates to run in parallel (default 5) |
| `SALLA_RETRY_COUNT` | Number of retry attempts per product update (default 3) |
| `SALLA_RETRY_DELAY_MS` | Delay in ms between retries (default 500) |

### 3. Create PostgreSQL Database

```bash
psql -U postgres -c "CREATE DATABASE salla_sync;"
```

### 4. Run in Development

```bash
npm run start:dev
```

> **Note:** `synchronize: true` is set for development — TypeORM will auto-create/alter tables. For production, set `synchronize: false` and use TypeORM migrations instead.

### 5. Build for Production

```bash
npm run build
npm run start:prod
```

---

## API Reference

### No Auth Required

| Method | Path | Description |
|---|---|---|
| GET | `/` | Server info |
| GET | `/health` | Health check |
| POST | `/webhook/salla` | Salla OAuth webhook receiver |

### Admin Endpoints — Header: `X-Admin-Key: <ADMIN_API_KEY>`

| Method | Path | Description |
|---|---|---|
| POST | `/admin/clients` | Register a new client |
| GET | `/admin/clients` | List all clients |
| GET | `/admin/clients/:id` | Get client with token status |
| DELETE | `/admin/clients/:id` | Delete client and their tokens |

**Register a client:**
```json
POST /admin/clients
{ "name": "Acme Corp", "sallaMerchantId": "12345" }
```
Returns: `{ id, name, apiKey, sallaMerchantId, createdAt }`  
Save the `apiKey` — it is not retrievable again.

### Client Sync Endpoints — Header: `X-Api-Key: sk_...`

| Method | Path | Description |
|---|---|---|
| POST | `/sync/inventory` | Sync inventory from ERP to Salla |
| GET | `/sync/history/:clientId` | Last 20 sync logs |

**Sync inventory:**
```json
POST /sync/inventory
{
  "items": [
    { "barcode": "8901234567890", "quantity": 42 },
    { "barcode": "7891234560001", "quantity": 0 }
  ]
}
```
Returns:
```json
{
  "status": "success",
  "totalItems": 2,
  "matchedProducts": 2,
  "updatedProducts": 2,
  "skippedNoChange": 0,
  "skippedNotFound": 0,
  "failedUpdates": 0,
  "startedAt": "2026-01-01T10:00:00.000Z",
  "finishedAt": "2026-01-01T10:00:03.412Z"
}
```

---

## Onboarding a New Client

1. **Register the client** via `POST /admin/clients` → get their `apiKey`
2. **Give them the API key** (store it securely — only shown once)
3. **Install the Salla app** in their store — Salla will POST the OAuth token to `POST /webhook/salla`
4. **Give them the sync tool** configured with your server URL and their API key
5. They click "Sync" → `POST /sync/inventory` is called with barcode/quantity pairs from Oracle ERP

---

## Production Checklist

- [ ] Set `synchronize: false` in `database.module.ts` and run TypeORM migrations
- [ ] Use a strong random value for `ADMIN_API_KEY`
- [ ] Put the server behind a reverse proxy (nginx/Caddy) with HTTPS
- [ ] Use environment-specific `.env` files and never commit `.env`
- [ ] Set up PostgreSQL backups
