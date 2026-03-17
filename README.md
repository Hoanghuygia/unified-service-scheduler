# Unified Service Scheduler

Production-ready NestJS backend template for a vehicle service appointment booking system. This template is designed for local development first (Docker + local PostgreSQL) while staying deployment-ready for AWS App Runner + AWS RDS.

## Tech Stack

- Framework: NestJS (TypeScript)
- Database: PostgreSQL
- ORM: Prisma
- Containerization: Docker
- CI/CD: GitHub Actions
- API docs: Swagger (OpenAPI)

## Folder Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker/
│   └── README.md
├── prisma/
│   └── schema.prisma
├── src/
│   ├── common/
│   │   ├── enums/
│   │   └── prisma/
│   ├── config/
│   ├── modules/
│   │   ├── reservations/
│   │   ├── appointments/
│   │   ├── health/
│   │   └── slots/
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── e2e/
│   └── unit/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API Endpoints

- `GET /health` health check
- `POST /reservations` create a temporary reservation (mocked behavior)
- `POST /appointments` confirm appointment from reservation (mocked behavior)
- `PATCH /appointments/:id` mark appointment as completed (mocked behavior)
- `GET /slots?dealershipId=...&from=...&to=...` list slots by status (mocked behavior)

Swagger UI is available at `http://localhost:3000/api-docs`.

## Environment Variables

Create `.env` from `.env.example`.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/booking"
PORT=3000
```

For Docker Compose, app-to-db connectivity uses the service DNS name `postgres`, not `localhost`.

## Local Run

```bash
npm install
npx prisma generate
npm run start:dev
```

## Docker Run

```bash
docker compose up --build
```

## CI Pipeline

GitHub Actions file: `.github/workflows/ci.yml`

Pipeline steps:
- Install dependencies
- Generate Prisma client
- Lint
- Unit tests
- E2E tests
- Build
- Build Docker image
- Placeholder for future AWS App Runner deployment

## Testing

### Commands

```bash
npm run test
npm run test:e2e
```

### What is tested

- Unit tests (`test/unit`):
  - `ReservationsService`
    - creates reservation when slot is available (mocked)
    - returns suggested slot when unavailable
  - `AppointmentsService`
    - confirms booking from reservation
    - marks appointment as completed
- Integration/e2e tests (`test/e2e`):
  - `POST /reservations` returns `201`
  - `POST /appointments` returns `201`
  - `PATCH /appointments/:id` returns `200`
  - `GET /slots` returns slot list

### Assumptions and limitations

- Business logic is intentionally mocked for template scaffolding.
- Unit tests do not require a real database.
- E2E tests run against in-memory Nest app instance, without PostgreSQL.
- AWS deployment steps are intentionally left as placeholders for future implementation.

## AWS Readiness Notes

- No hardcoded production hostnames.
- Database and port are environment-driven.
- Dockerized app suitable for App Runner image deployment.
- Prisma datasource supports direct migration from local PostgreSQL to AWS RDS connection strings.
