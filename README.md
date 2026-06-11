# SyncStudy

SyncStudy is an offline-first study app for the Alcovia Full Stack Engineering Intern assignment.

The app is designed around operation-based synchronization, deterministic conflict resolution, and idempotent processing for focus rewards and notifications.

## Stack

- Frontend: React Native Expo, TypeScript, SQLite
- Backend: Express, TypeScript, PostgreSQL
- Automation: n8n
- Sync model: operation-based sync with Lamport clocks

## Current Status

Phase 1 is complete: project setup and repository structure.

Implementation will proceed one phase at a time:

1. Project Setup
2. Backend Foundation
3. Local Storage
4. Focus Sessions
5. Syllabus Progress
6. Sync Engine
7. Conflict Resolution
8. n8n Integration
9. Dev Panel
10. Testing
11. Documentation
12. Demo Video

## Development Commands

Install dependencies from the repository root:

```bash
npm install
```

Run the backend:

```bash
npm --workspace backend run migrate
npm --workspace backend run seed
npm run dev:backend
```

Backend health checks:

```bash
curl -i http://localhost:4000/health
curl -i http://localhost:4000/ready
```

Run the frontend:

```bash
npm run dev:frontend
```

## Assignment Notes

- Authentication is intentionally omitted. The app uses one hardcoded student account.
- Two browser clients must use separate device namespaces so they behave like separate physical devices.
- n8n notification delivery may use a mock HTTP sink for a reliable demo.
