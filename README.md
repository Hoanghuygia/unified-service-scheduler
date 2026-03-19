# Unified Service Scheduler

Unified Service Scheduler is a NestJS backend for managing vehicle service reservations, confirmed appointments, and occupied service slots. The project uses PostgreSQL with Prisma and includes local Docker support for development.

## Tech Stack

- Framework: NestJS with TypeScript
- Database: PostgreSQL
- ORM: Prisma
- API documentation: Swagger / OpenAPI
- Containerization: Docker and Docker Compose
- Automation: GitHub Actions

## Features

- Create reservations for vehicle services
- Return alternative time recommendations when a requested slot is unavailable
- Confirm reservations into booked appointments
- Cancel reservations
- Complete or cancel appointments with business rules
- Query occupied slots by dealership and optional technician or service bay filters
- Seed local development data for quick manual testing

## API Endpoints

- `GET /health` - health check
- `POST /reservations` - create a reservation or receive alternative slot recommendations
- `PATCH /reservations/:reservationId/cancel` - cancel an active reservation
- `POST /appointments` - confirm a reservation and create an appointment
- `PATCH /appointments/:id/complete` - mark an appointment as completed
- `PATCH /appointments/:id/cancel` - cancel an appointment if it still satisfies the cancellation rule
- `GET /slots?dealershipId=...&endTime=...` - list occupied slots from now until the requested end time

Swagger UI is available at `http://localhost:3000/api-docs` after the application starts.

## Prerequisites

Make sure the following tools are available on your machine:

- Node.js 20.x
- npm
- Docker and Docker Compose

Check your Node.js version:

```bash
node -v
```

The CI workflow uses Node.js `20`, so using the same major version locally is recommended.

## Environment Variables

Create your local environment file from the example:

```bash
cp .env.example .env
```

Default local values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/booking"
PORT=3000
```

When the app runs directly on your machine, use `localhost` in `DATABASE_URL`.
When the app runs inside Docker Compose, the Postgres hostname is `postgres`.

## First-Time Local Setup

Use this flow when setting up the project for the first time on your machine.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd unified-service-scheduler
```

### 2. Verify Node.js version

```bash
node -v
```

Use Node.js `20.x` if your current version does not match the CI environment.

### 3. Create the environment file

```bash
cp .env.example .env
```

### 4. Install dependencies

```bash
npm install
```

### 5. Generate the Prisma client

```bash
npx prisma generate
```

### 6. Start the PostgreSQL container

```bash
docker compose up -d postgres
```

This starts only the database container required for local development.

### 7. Initialize the database and seed sample data

```bash
npm run db:init
```

This command will:

- create and apply the Prisma migration
- seed sample dealerships, technicians, service bays, service types, reservations, and appointments

### 8. Optionally open Prisma Studio

```bash
npm run prisma:studio
```

Use Prisma Studio if you want to inspect the seeded data visually before testing the API.

### 9. Start the application in development mode

```bash
npm run dev
```

### 10. Test the API

After the server starts, use either:

- Swagger UI: `http://localhost:3000/api-docs`
- Postman or another API client

## Daily Local Run

After first-time setup, the usual local workflow is:

```bash
docker compose up -d postgres
npm run dev
```

If the schema changes, run:

```bash
npx prisma generate
```

If you add or change migrations, run:

```bash
npm run db:init
```

## Build

Build the production bundle:

```bash
npm run build
```

Run the compiled application:

```bash
npm run start
```

## Run With Docker

To build and run the full application stack with Docker Compose:

```bash
docker compose up --build
```

## Testing

### Test Commands

Run unit tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

Run lint checks:

```bash
npm run lint
```

Run a production build validation:

```bash
npm run build
```

### What Is Covered

- Unit tests in `test/unit`
- E2E API tests in `test/e2e`
- Lint validation for TypeScript source and tests
- Build validation through the TypeScript compiler

### Current E2E Coverage

- reservation creation flow
- appointment confirmation flow
- appointment patch flow
- occupied slot listing flow

Note: the current e2e tests bootstrap the Nest application in-memory. They validate HTTP behavior without requiring a live PostgreSQL container.

## CI/CD

GitHub Actions workflow file: `.github/workflows/ci.yml`

The current workflow runs on pushes and pull requests and includes:

- dependency installation with `npm ci`
- Prisma client generation
- lint checks
- unit tests
- e2e tests
- production build validation
- Docker image build validation

At the moment, the workflow includes a placeholder step for future AWS App Runner deployment. CI is implemented; deployment automation can be expanded later.

## Suggested Manual Verification Flow

After seeding and starting the app, a practical manual test flow is:

1. Call `GET /health` to confirm the application is running.
2. Open Prisma Studio and copy a seeded `dealershipId` and one or more `serviceTypeId` values.
3. Call `POST /reservations` with a future `desiredTime`.
4. If a reservation is returned, use its `reservationId` with `POST /appointments`.
5. Call `GET /slots` with the same `dealershipId` and a future `endTime` to inspect occupied slots.
6. Test cancellation or completion endpoints as needed.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── common/
│   ├── config/
│   ├── modules/
│   │   ├── appointments/
│   │   ├── health/
│   │   ├── reservations/
│   │   └── slots/
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── e2e/
│   └── unit/
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## AI Collaboration Narrative

This section is intentionally a draft placeholder and can be refined later.

### High-Level Strategy

I used AI as a productivity partner for scaffolding, refactoring, and documentation support while keeping all architecture and business-rule decisions under manual review. The AI was most useful for accelerating repetitive implementation tasks and helping structure boilerplate consistently across modules, DTOs, and tests.

### Verification and Refinement Process

AI-generated output was not accepted blindly. Each proposed change was reviewed against project requirements, existing coding patterns, NestJS conventions, Prisma schema constraints, and expected API behavior. After generation, I manually adjusted naming, validation rules, error handling, transaction behavior, and documentation to match the actual implementation.

### Quality Control

Final quality was ensured by combining manual code review with linting, automated tests, build validation, and endpoint-level verification through Swagger and API requests. The goal was to use AI to accelerate delivery without lowering the engineering standard of the final codebase.
