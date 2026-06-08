# EstetoOne Backend

NestJS 10 + Prisma + PostgreSQL 16 + Redis 7 backend for the EstetoOne telehealth platform.

## Branching

| Branch | Purpose |
|--------|---------|
| `develop` | Default integration branch — open all PRs here |
| `staging` | QA + frontend integration — promoted from `develop` |
| `main` | Production — promoted from `staging` |

Flow: `feature → develop → staging → main`. See [docs/BRANCHING.md](docs/BRANCHING.md).

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

## Local Setup

1. **Clone and install dependencies**

```bash
cd estetoone-backend
npm install
```

2. **Start infrastructure**

```bash
docker compose up -d
```

3. **Configure environment**

```bash
cp .env.example .env
```

4. **Run database migrations and seed**

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

5. **Start the API**

```bash
npm run start:dev
```

The API runs at `http://localhost:3000`.

| Probe | Endpoint | Purpose |
|-------|----------|---------|
| Liveness | `GET /v1/health/live` | Process is running |
| Readiness | `GET /v1/health/ready` | DB + Redis are up (503 if degraded) |
| Legacy | `GET /v1/health` | Same checks as readiness (always 200) |

## Project Structure

```
src/
├── config/              # Environment validation (zod)
├── common/              # Shared decorators, guards, pipes (future)
├── infrastructure/      # Prisma, Redis clients
├── modules/             # Feature modules (Controller/Service/Repository)
│   └── health/
└── domain/              # Domain models and validators
```

### SRP Layers

| Layer | Responsibility |
|-------|----------------|
| Controller | HTTP request/response only |
| Service | Business logic and orchestration |
| Repository | Database queries via Prisma |
| Infrastructure | External clients (Redis, S3, Stripe) |

## Database Schema

Core models: `User`, `PatientProfile`, `DoctorProfile`, `HealthCondition`, `Medication`, `Vital`, `Consultation`, `MedicalRecord`, `PaymentPlan`, `Subscription`, `AuditLog`.

Domain shapes align with the frontend `AuthContext` `UserData`, `HealthCondition`, and `Medication` interfaces.

## Seed Data

After seeding, dev credentials:

- **Patient:** `maria.silva@example.com` / `password123`
- **Doctor:** `dr.carlos@example.com` / `password123`

## Tests

```bash
# Unit tests (validators, services)
npm run test:unit

# Integration tests (DB + health endpoint)
npm run test:integration
```

Integration tests require PostgreSQL and Redis running via `docker compose up`.

## Observability

- **Structured logging:** Pino (JSON in prod, pretty in dev) with PHI field redaction
- **Error tracking:** Sentry (optional — set `SENTRY_DSN` in `.env`)
- **Performance:** `X-Response-Time-Ms` response header on every request

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for staging/prod AWS deployment, backups, and encryption.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:seed` | Seed dev data |

## Related Issues

- [HEN-6](https://github.com) — Architecture spec
- [HEN-7](https://github.com) — This scaffold
- [HEN-8](https://github.com) — Auth API (next)
