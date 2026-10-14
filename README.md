# Moonstar Restaurant

A restaurant management web application with a Node.js backend, PostgreSQL database, and React-based admin panel.

## Overview

Moonstar Restaurant is designed to support restaurant operations through menu management, order processing, administrative authentication, and dashboard reporting.

## Technology Stack

### Backend
- Node.js
- Express 5
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT-based authentication

### Admin Panel
- React
- TypeScript
- Vite

### Additional integrations
- Stripe payment integration
- Cloudinary media storage

> Integration availability and configuration depend on the current environment and enabled features.

## Features

- Menu category and item management
- Customer order creation
- Order listing and order details
- Order status management
- Admin authentication and logout
- Dashboard statistics
- Revenue reporting for the last seven days
- PostgreSQL database integration
- Request validation and centralized error handling
- Database-backed JWT session revocation

## Project Structure

```text
Moonstar-restaurant/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── admin/
│   ├── src/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
└── README.md
```

The exact structure may differ slightly from this overview.

## Prerequisites

Install the following before running the project:

- Node.js and npm
- PostgreSQL
- Git

A compatible Node.js version should be selected according to the project's package configuration.

## Local Setup

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Moonstar-restaurant
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create the backend environment file using the variable names required by the application. Configure the PostgreSQL connection, JWT authentication settings, and any enabled external integrations.

Never commit real passwords, API keys, JWT secrets, or production credentials.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

Check the database migration status:

```bash
npx prisma migrate status
```

Apply migrations only when the database and migration history have been reviewed and the migration is actually pending.

### 4. Start the backend

```bash
npm run dev
```

The local API is expected to run at:

`http://localhost:4000/api`

### 5. Start the admin panel

Open another terminal:

```bash
cd admin
npm install
npm run dev
```

Use the local URL printed by Vite. Configure the frontend API base URL according to the project's existing configuration.

## API Overview

The following endpoints are implemented in the current backend codebase.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database health |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get an order |
| POST | `/api/orders` | Create an order |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/revenue` | Revenue report |

Protected endpoints require valid authentication. The exact menu and authentication endpoints should be verified against the current source code.

## Health Check

```bash
curl -i http://localhost:4000/api/health
```

A successful response should indicate that the API is running and the database is connected.

## Development Checks

Backend type checking:

```bash
cd backend
npm run typecheck
```

Backend production build:

```bash
npm run build
```

Admin production build:

```bash
cd ../admin
npm run build
```

Run these checks before submitting changes.

## Security Notes

- Never commit `.env`, `config.env`, API keys, database passwords, or JWTs.
- Keep production secrets in environment variables or a secret manager.
- Use HTTPS in production.
- Restrict administrative endpoints by role and permission.
- Validate all incoming requests.
- Enforce allowed order-status transitions on the backend.
- Use secure authentication and session-revocation practices.
- Apply rate limiting to authentication and other sensitive endpoints.
- Review CORS settings before deployment.
- Back up the database and test the restore procedure.

## Known Verification Items

Before declaring the application production-ready:

- Verify login, logout, and token revocation end to end.
- Verify authenticated dashboard requests.
- Test every order-status transition.
- Add automated API and integration tests.
- Verify payment processing and payment webhooks, if enabled.
- Verify environment configuration for a clean installation.
- Run dependency and security audits.
- Test the application using production build settings.

## Future Development Roadmap

### Phase 1 — Reliability
- Complete authentication and authorization testing.
- Add automated backend tests.
- Validate order-status transitions.
- Add consistent API response and error conventions.

### Phase 2 — Restaurant Operations
- Improve menu and category management.
- Add inventory and stock tracking.
- Add order filtering, search, and pagination.
- Add printable receipts and invoices.
- Add order cancellation and refund workflows.

### Phase 3 — Payments and Customer Experience
- Complete and test Stripe payment workflows.
- Implement payment webhook verification and idempotency.
- Add customer order tracking.
- Add email or SMS notifications.
- Add customer accounts and order history.

### Phase 4 — Analytics
- Add date-range revenue reports.
- Track sales by menu item and category.
- Add CSV/PDF report exports.
- Add daily, weekly, and monthly analytics.

### Phase 5 — Production Deployment
- Dockerize the backend and admin application.
- Configure production PostgreSQL.
- Add CI/CD with automated build and test checks.
- Add structured logging and monitoring.
- Configure backups, HTTPS, and deployment documentation.

## Contributing

1. Create a feature branch.
2. Make a focused change.
3. Run the applicable checks.
4. Review the changes for secrets and regressions.
5. Submit a pull request.

## License

Choose and add an appropriate license before distributing this project publicly.
