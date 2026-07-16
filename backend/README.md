# Backend

E-commerce REST API (Node.js, Express 5, PostgreSQL).

| Resource | Link |
|----------|------|
| **Full documentation** | [docs/README.md](./docs/README.md) |
| **Swagger UI** | http://localhost:5000/api/docs |
| **Health check** | http://localhost:5000/api/health |
| **Readiness** | http://localhost:5000/api/ready |
| **Versioned API** | `/api` and `/api/v1` (same routes) |

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```
