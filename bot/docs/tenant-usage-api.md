# Tenant & Power Admin API — Frontend Integration Guide

## Authentication

All APIs use **JWT Bearer tokens** — no static API keys.

```
Authorization: Bearer <accessToken>
```

Obtain a token via `POST /api/auth/login` with `{ email, password }`.

| Role | Guard | Access |
|------|-------|--------|
| `admin` | `JwtAuthGuard` | Own restaurant only (`/api/admin/*`) |
| `super_admin` | `PowerAdminGuard` | All restaurants (`/api/power-admin/*`) |

If the JWT is missing → **401**. If the JWT is valid but the role is wrong → **403**.

---

## Tier Reference

| Tier | Monthly Message Limit |
|------|-----------------------|
| `growth` | 12,000 |
| `business` | 30,000 |
| `pro` | 75,000 |

---

## Power Admin Endpoints

All under `/api/power-admin/`. Require `role: super_admin` JWT.

---

### Tenant Management

#### `GET /api/power-admin/tenants`

List all restaurants.

**Response**
```json
[
  {
    "restaurantId": "663f...",
    "name": "Burger House",
    "whatsappNumber": "+923001234567",
    "tier": "growth",
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00Z"
  }
]
```

---

#### `GET /api/power-admin/tenants/:id`

Single tenant detail with their admin users.

**Response**
```json
{
  "restaurantId": "663f...",
  "name": "Burger House",
  "whatsappNumber": "+923001234567",
  "tier": "growth",
  "isActive": true,
  "deliveryFee": 100,
  "minOrderAmount": 0,
  "address": "...",
  "city": "Karachi",
  "activeHours": { ... },
  "createdAt": "2026-01-15T10:00:00Z",
  "admins": [
    { "id": "...", "name": "Owner", "email": "owner@email.com", "role": "admin", "isActive": true }
  ]
}
```

---

#### `POST /api/power-admin/tenants`

Create a new tenant — creates both the restaurant record and the admin account.

**Request body**
```json
{
  "restaurant": {
    "whatsappNumber": "+923001234567",
    "name": "New Restaurant",
    "phoneNumberId": "whatsapp_phone_number_id",
    "accessToken": "whatsapp_access_token",
    "tier": "growth",
    "deliveryFee": 100,
    "minOrderAmount": 500,
    "address": "Block 5, Clifton",
    "city": "Karachi"
  },
  "admin": {
    "name": "Restaurant Owner",
    "email": "owner@newrestaurant.com",
    "password": "securepassword123"
  }
}
```

Required fields: `restaurant.whatsappNumber`, `restaurant.name`, `restaurant.phoneNumberId`, `restaurant.accessToken`, `admin.name`, `admin.email`, `admin.password` (min 8 chars).

**Response**
```json
{
  "restaurantId": "663f...",
  "name": "New Restaurant",
  "tier": "growth",
  "admin": {
    "id": "...",
    "email": "owner@newrestaurant.com",
    "role": "admin"
  }
}
```

**Errors**

| Status | Reason |
|--------|--------|
| 400 | Missing required field or password < 8 chars |
| 409 | WhatsApp number or admin email already registered |

---

#### `PATCH /api/power-admin/tenants/:id/tier`

Change a restaurant's subscription tier.

**Request body**
```json
{ "tier": "business" }
```

Valid values: `"growth"`, `"business"`, `"pro"`.

**Response**
```json
{ "restaurantId": "...", "name": "Burger House", "tier": "business" }
```

> After a tier update, `/live` reflects the new limit immediately. The nightly rollup will use the new limit from the next run.

---

#### `PATCH /api/power-admin/tenants/:id/status`

Activate or deactivate a restaurant. Deactivated restaurants stop accepting bot messages.

**Request body**
```json
{ "isActive": false }
```

**Response**
```json
{ "restaurantId": "...", "name": "Burger House", "isActive": false }
```

---

### Usage Monitoring

#### `GET /api/power-admin/usage/report`

All tenants — monthly aggregate from the nightly rollup.

**Query params**

| Param | Required | Default | Example |
|-------|----------|---------|---------|
| `month` | No | current month | `2026-04` |

**Response**
```json
[
  {
    "restaurantId": "663f...",
    "restaurantName": "Burger House",
    "tier": "growth",
    "tierMonthlyLimit": 12000,
    "actualMessages": 9340,
    "overagePct": 0,
    "avgPerDay": 311,
    "flags": { "upgradeRecommended": false, "downgradeCandidate": false }
  }
]
```

> Data freshness: reflects the last 1:00 AM nightly rollup — not real-time.

---

#### `GET /api/power-admin/usage/recommendations`

Tenants with an active flag this month. Use for the "action required" panel.

**Response**
```json
[
  {
    "restaurantId": "663f...",
    "restaurantName": "Pizza Palace",
    "tier": "business",
    "tierMonthlyLimit": 30000,
    "actualMessages": 38200,
    "overagePct": 27.33,
    "flags": { "upgradeRecommended": true, "downgradeCandidate": false },
    "recommendation": "upgrade"
  }
]
```

`recommendation` is `"upgrade"` or `"downgrade"` — use this to label the action button.

---

#### `GET /api/power-admin/usage/:restaurantId/live`

Real-time Redis count for the current month. No rollup lag.

**Response**
```json
{
  "restaurantId": "663f...",
  "restaurantName": "Burger House",
  "month": "2026-04",
  "tier": "growth",
  "tierMonthlyLimit": 12000,
  "currentCount": 4821,
  "utilizationPct": 40.18
}
```

Use `utilizationPct` for a progress bar. Warn at 80%, alert at 100%.

---

#### `GET /api/power-admin/usage/:restaurantId/breakdown`

Daily message counts — data for a bar/line chart.

**Query params:** `month` (optional, default current month)

**Response**
```json
{
  "restaurantId": "663f...",
  "restaurantName": "Burger House",
  "month": "2026-04",
  "tier": "growth",
  "tierMonthlyLimit": 12000,
  "actualMessages": 9340,
  "overagePct": 0,
  "dailyBreakdown": [
    { "date": "2026-04-01", "count": 312 },
    { "date": "2026-04-02", "count": 287 }
  ],
  "flags": { "upgradeRecommended": false, "downgradeCandidate": false }
}
```

Returns `dailyBreakdown: []` (not 404) if no rollup data exists yet.

> Combine `/breakdown` (historical daily bars) with `/live` (today's count) for a complete current-month chart.

---

#### `GET /api/power-admin/usage/:restaurantId/history`

Multi-month trend for a single tenant. Sorted newest first.

**Query params:** `months` (optional, default `3`, max `12`)

**Response**
```json
[
  {
    "month": "2026-04",
    "tier": "growth",
    "tierMonthlyLimit": 12000,
    "actualMessages": 9340,
    "overagePct": 0,
    "avgPerDay": 311,
    "flags": { "upgradeRecommended": false, "downgradeCandidate": false }
  }
]
```

Months with no data are absent (not returned as zeroes).

---

## Suggested Power Admin Dashboard Layout

| Panel | Endpoint |
|-------|----------|
| All tenants table | `GET /api/power-admin/tenants` |
| Action required (flagged) | `GET /api/power-admin/usage/recommendations` |
| Monthly usage overview | `GET /api/power-admin/usage/report` |
| Tenant detail + admins | `GET /api/power-admin/tenants/:id` |
| Drill-in: live usage | `GET /api/power-admin/usage/:id/live` |
| Drill-in: daily chart | `GET /api/power-admin/usage/:id/breakdown` |
| Drill-in: trend chart | `GET /api/power-admin/usage/:id/history` |
| Create new tenant | `POST /api/power-admin/tenants` |
| Change tier | `PATCH /api/power-admin/tenants/:id/tier` |
| Activate / deactivate | `PATCH /api/power-admin/tenants/:id/status` |

