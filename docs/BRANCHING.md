# Branching model — estetoone-backend

Per workspace `DIRETIVAS.md` §1 — flow: **feature → develop → staging → main**

| Branch | Purpose | CI / deploy |
|--------|---------|-------------|
| `develop` | Squad Multica integration (default PR base) | `ci.yml` — lint, test, build |
| `staging` | QA + frontend integration | `deploy-staging.yml` → ECS staging |
| `main` | Produção | `deploy-prod.yml` → ECS production |

## Environment URLs

| Environment | API URL |
|-------------|---------|
| Staging | https://api-staging.estetoone.com.br |
| Production | https://api.estetoone.com.br |

## Promotion runbook

### 1. Feature → develop

```bash
git checkout develop && git pull
git checkout -b feature/my-change
gh pr create --base develop
# Wait for ci.yml (required check)
```

### 2. develop → staging

```bash
git checkout staging && git pull
git merge origin/develop
git push origin staging
# Triggers deploy-staging.yml
# Verify: curl https://api-staging.estetoone.com.br/v1/health/ready
```

### 3. staging → main

```bash
git checkout main && git pull
git merge origin/staging
git push origin main
# Triggers deploy-prod.yml
# Verify: curl https://api.estetoone.com.br/v1/health/ready
```

See `docs/DEPLOYMENT.md` for ECS/AWS details.
