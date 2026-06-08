# EstetoOne API Documentation

## Swagger UI (local)

With the backend running:

- **Interactive docs:** http://localhost:3000/api/docs
- **OpenAPI JSON:** http://localhost:3000/api/docs-json

## OpenAPI spec files

| File | Description |
|------|-------------|
| `openapi.yaml` | Committed OpenAPI 3.x export (51 operations) |
| `openapi.json` | Same spec in JSON format |
| `formal/HEN-25-EstetoOne-API-Documentation.pdf` | Formal PDF deliverable |
| `formal/HEN-25-EstetoOne-API-Documentation.docx` | Formal DOCX deliverable |

## Regenerate

```bash
npm run openapi:export   # updates openapi.yaml + openapi.json
npm run docs:formal      # regenerates PDF/DOCX from openapi.yaml
```

Spec is generated from NestJS `@nestjs/swagger` decorators (single source of truth).
