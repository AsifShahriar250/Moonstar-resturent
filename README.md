# Moonstar Restaurant

Moonstar Restaurant is a restaurant web project consisting of a customer-facing website, a backend API, and an admin dashboard.

## Project Structure

```text
Moonstar-resturent/
├── index.html             # Restaurant website entry point
├── moon.css               # Website styles
├── moon.js                # Website JavaScript
├── style.css              # Additional styles
├── images/                # Website images
├── scripts/               # Project scripts
├── backend/               # Express + TypeScript + Prisma API
└── admin/                 # React + Vite + TypeScript dashboard
```

## Technology Stack

### Backend
- Node.js
- Express 5
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT-based authentication

### Admin Dashboard
- React
- TypeScript
- Vite
- ESLint

### Customer Website
- HTML
- CSS
- JavaScript

## Features

- Restaurant website interface
- Admin authentication
- Order management
- Order status updates
- Dashboard statistics
- Revenue reporting
- PostgreSQL database integration
- JWT token-version checks for token revocation

## Requirements

Install the following before starting:

- Node.js and npm
- PostgreSQL
- Git

## Getting Started

Clone the repository:

```bash
git clone https://github.com/AsifShahriar250/Moonstar-resturent.git
cd Moonstar-resturent
```

### 1. Configure the Backend

```bash
cd backend
npm install
```

Create your local environment file using the example, if available:

```bash
cp .env.example .env
```

Configure the required database connection and authentication settings in `backend/.env`. Use your own local credentials and secrets.

Generate the Prisma client:

```bash
npm run db:generate
```

Validate the Prisma schema:

```bash
npm run db:validate
```

Configure PostgreSQL and apply the appropriate development migrations:

```bash
npm run db:migrate
```

Start the backend development server:

```bash
npm run dev
```

The backend is configured to serve the API at:

`http://localhost:4000/api`

Check the root health endpoint at:

`http://localhost:4000/`

### 2. Start the Admin Dashboard

Open a second terminal:

```bash
cd ~/Documents/Resturent/Moonstar-resturent/admin
npm install
npm run dev
```

Use the local URL printed by Vite in the terminal.

Configure the admin frontend's API base URL as required by the project. Do not commit local environment files.

### 3. Open the Customer Website

Open `index.html` in a browser or serve the project root with a local static web server.

Some website functionality may require the backend to be running.

## Available Scripts

### Backend

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Compile the backend |
| `npm start` | Run the compiled backend |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Run Prisma development migrations |

### Admin

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## API Overview

The backend exposes REST API endpoints under `/api`.

Known endpoint groups include:

- Authentication
- Orders
- Dashboard statistics
- Revenue reporting

Examples:

- `GET /api/dashboard/stats`
- `GET /api/dashboard/revenue`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`

Protected endpoints require valid authentication. Consult the backend source for the current request schemas, response formats, and authorization requirements.

## Verification

Run backend checks:

```bash
cd backend
npm run typecheck
npm run build
npm run db:validate
```

Build the admin dashboard:

```bash
cd ../admin
npm run build
npm run lint
```

The lint command should be run and any reported issues reviewed before release.

## Security

- Never commit `.env`, `config.env`, passwords, JWT secrets, API keys, or database credentials.
- Keep local environment files out of version control.
- Use strong, unique secrets in production.
- Use HTTPS in production deployments.
- Validate input and enforce authorization on protected endpoints.
- Review dependencies and security advisories before deployment.
- Back up the production database regularly.
- Rotate any credential accidentally exposed in Git history.

## Roadmap

- Add automated unit and integration tests.
- Enforce valid order status transitions.
- Complete authentication and logout integration testing.
- Review payment processing, webhooks, and refund handling.
- Improve menu and inventory management.
- Add reporting and data export capabilities.
- Add Docker-based deployment and CI/CD.
- Improve logging, monitoring, backups, and production security.
- Optimize large frontend bundles through code splitting.

## License

No license has been specified yet. Add an appropriate license before allowing reuse or redistribution.
