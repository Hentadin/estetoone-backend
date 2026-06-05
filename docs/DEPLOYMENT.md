# EstetoOne Backend — Deployment & Infrastructure

Architecture reference: [HEN-6](https://github.com/Hentadin/estetoone-backend) §7 (Zangado spec).

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| `dev` | Local development (`docker compose`) | `http://localhost:3000` |
| `staging` | QA + frontend integration | `https://api-staging.estetoone.com.br` |
| `prod` | Production | `https://api.estetoone.com.br` |

All PRs target the `develop` branch. Production promotion from `develop` → `main` is manual.

## AWS Architecture (MVP)

```
Route 53 → ALB (HTTPS/TLS 1.3) → ECS Fargate (min 2 tasks)
                                    ├── estetoone-api (NestJS)
                                    └── estetoone-worker (BullMQ jobs — future)
         RDS PostgreSQL 16 (encryption at rest AES-256)
         ElastiCache Redis 7 (TLS in transit)
         S3 (documents bucket, SSE-S3, sa-east-1)
         Secrets Manager (JWT keys, DB creds, Stripe)
         CloudWatch (structured logs + alarms)
```

### ECS Task Definition (API)

| Setting | Value |
|---------|-------|
| Container port | `3000` |
| Liveness probe | `GET /v1/health/live` — interval 30s |
| Readiness probe | `GET /v1/health/ready` — interval 10s |
| Log driver | `awslogs` → CloudWatch group `/estetoone/api` |
| CPU / Memory | 0.5 vCPU / 1 GB (staging), 1 vCPU / 2 GB (prod) |

### Required Environment Variables

Copy from `.env.example`. In AWS, inject via Secrets Manager / task definition:

- `NODE_ENV=production`
- `DATABASE_URL` — RDS connection string (SSL required)
- `REDIS_URL` — ElastiCache with `rediss://` (TLS)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — min 32 chars
- `LOG_LEVEL=info`
- `SENTRY_DSN` — optional error tracking
- `AWS_REGION=sa-east-1`, `AWS_S3_BUCKET`

## Observability

### Structured Logging (Pino)

- JSON logs in staging/prod (CloudWatch ingestion)
- Pretty logs in local `development`
- **PHI redaction** on sensitive fields (email, CPF, clinical data, tokens)
- Health probe paths excluded from auto-request logging

### Error Tracking (Sentry)

Set `SENTRY_DSN` to enable. Request headers and PHI fields are sanitized before upload.

### Performance Baseline

- Every API response includes `X-Response-Time-Ms`
- CloudWatch alarm: **p95 latency > 500ms** (per HEN-6 KPI)
- CloudWatch alarm: **5xx error rate > 1%**

## Security & Encryption

| Layer | Control |
|-------|---------|
| Transit | TLS 1.3 on ALB; RDS/ElastiCache connections over SSL/TLS |
| At rest | RDS encryption (AES-256); S3 SSE-S3 |
| Secrets | AWS Secrets Manager — never commit to git |
| Logs | No PHI — Pino redaction + Sentry `beforeSend` sanitization |

## Backup & Disaster Recovery

| Resource | Policy |
|----------|--------|
| RDS | Automated backups — 7 days (staging), 30 days (prod) |
| S3 documents | Versioning enabled |
| RPO | 24 hours |
| RTO | 4 hours (MVP) |

Restore procedure:
1. Restore RDS snapshot to new instance
2. Update `DATABASE_URL` in Secrets Manager
3. Redeploy ECS tasks (rolling update)

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`):

1. `npm ci`
2. `npx prisma migrate deploy`
3. `npm run test:unit`
4. `npm run test:integration`
5. `npm run build`

Deployment (manual until CD is configured):
1. Build Docker image → push to ECR
2. Update ECS service task definition
3. Verify `GET /v1/health/ready` returns 200

## Local Verification

```bash
docker compose up -d
cp .env.example .env
npx prisma migrate dev
npm run start:dev

# Probes
curl http://localhost:3000/v1/health/live
curl http://localhost:3000/v1/health/ready
curl -I http://localhost:3000/v1/health  # check X-Response-Time-Ms header
```

## Cost Estimate (MVP ~500 users)

ECS Fargate + RDS db.t4g.micro + ElastiCache + S3: **~USD 150–250/month** (sa-east-1).
