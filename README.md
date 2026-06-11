# 🚀 SyncStudy: Offline-First Full-Stack Study Platform

> An advanced offline-first study companion designed to handle offline data updates, client clock drift, concurrent conflicts, exactly-once rewards, and webhook automations using an operation-based CRDT-like sync engine.

[![Stack: React Native Expo](https://img.shields.io/badge/Frontend-React%20Native%20Expo-blue?logo=react&logoColor=white)](https://expo.dev/)
[![Stack: Express TypeScript](https://img.shields.io/badge/Backend-Express%20TypeScript-darkgreen?logo=express&logoColor=white)](https://expressjs.com/)
[![Database: PostgreSQL + SQLite](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20SQLite-blue?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Automation: n8n](https://img.shields.io/badge/Workflow-n8n-orange?logo=n8n&logoColor=white)](https://n8n.io/)
[![Status: Production Ready](https://img.shields.io/badge/Status-100%25%20Verified-brightgreen)](#)

---

## 📖 Table of Contents
1. [Core Features](#-core-features)
2. [System Architecture](#-system-architecture)
3. [Replication & Synchronization Engine](#-replication--synchronization-engine)
4. [Conflict Resolution Matrix](#-conflict-resolution-matrix)
5. [n8n Automation & Exactly-Once Webhooks](#-n8n-automation--exactly-once-webhooks)
6. [Project Structure](#-project-structure)
7. [Development Startup Guide](#-development-startup-guide)
8. [Observability & Verification Panel](#-observability--verification-panel)
9. [Verification Audit](#-verification-audit)

---

## 🌟 Core Features

### ⏱️ Focus Session Manager
* **Custom Timer Preset**: Choose target durations, start, and pause/give up focus sessions.
* **AppState Heartbeat Monitor**: Automatically fails running sessions with an `app_switch` reason if backgrounded for more than 5 seconds.
* **Heartbeat Crash Recovery**: Writes a 1-second interval timestamp to local metadata. If the app crashes or gets terminated, it auto-detects the crash upon next boot, retroactively marking the session as failed.

### 📚 Syllabus Progress rollup
* **Hierarchy**: Subject $\rightarrow$ Chapter $\rightarrow$ Task.
* **Progress Aggregation**: Dynamically aggregates completed tasks to calculate chapter percentage, rolling chapter statistics up to subject totals in real time.
* **Full Offline mutability**: Create, rename, update, check, or delete tasks completely offline.

### 📊 Observability Dev Panel
* **Network Mode Toggle**: Mock online/offline transitions dynamically on the client.
* **Operations Feed**: Real-time view of SQLite metadata and the pending operational queue.
* **Automation Log**: Live-polling feed displaying mock notifications triggered by n8n.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph "Mobile Client (Offline-First)"
        SQLite[(SQLite Database)]
        UI[React Native View]
        SyncMgr[Client Sync Manager]
        UI -->|Reads / Writes| SQLite
        SyncMgr -->|Pull & Push Ops| SQLite
    end

    subgraph "Express Backend"
        API[Sync Controller /api/sync]
        n8nSvc[n8n Webhook Service]
        NotifyController[Confirm & Sink Controllers]
    end

    subgraph "PostgreSQL Database"
        PG[(Postgres DB)]
        OpsTab[operations table]
        ChangesTab[server_changes table]
        EventsTab[processed_events table]
    end

    SyncMgr <-->|HTTPS Sync Payload| API
    API <-->|Transactional commit| PG
    n8nSvc -->|Trigger Webhook| WebhookNode[n8n Webhook Node]
    
    subgraph "n8n Workflow Automation"
        WebhookNode --> CheckNode[Dedupe Check: GET /notifications/confirm/check]
        CheckNode --> IfNode{Already Processed?}
        IfNode -->|No| MockSinkNode[HTTP POST /notifications/mock-sink]
        MockSinkNode --> ConfirmNode[HTTP POST /notifications/confirm]
        IfNode -->|Yes| NoOpNode[Finish]
    end

    ConfirmNode -->|Confirm Delivery| NotifyController
    NotifyController -->|Update status to processed| PG
```

---

## 🔄 Replication & Synchronization Engine

SyncStudy uses an **operation-based synchronization model** rather than transferring raw table states. 

* **Operational Immutability**: All client interactions are modeled as discrete operations (e.g. `TASK_STATUS_CHANGED`, `SESSION_COMPLETED`) logged to a local SQLite table (`pending_operations`) with UUIDs.
* **Lamport Logical Clocks**: In place of physical wall-clock timestamps (which suffer from system drift, time-zone shifts, and user manipulation), a logical counter is incremented on every client write.
* **Change Feed Ingestion**: When sync initiates, the client pushes all local pending operations to `/api/sync` and pulls all server changes committed by other devices since the client's last acknowledged sequence cursor.

---

## ⚡ Conflict Resolution Matrix

When concurrent edits arrive from different devices (split-brain scenarios), conflicts are resolved deterministically on the server:

| Current DB State | Incoming Operation | Merging Rule | Rationale |
| :--- | :--- | :--- | :--- |
| Task `lamport = T1` | Edit `lamport = T2 > T1` | **Incoming Wins** | Higher logical time denotes a newer causal update. |
| Task `lamport = T1` | Edit `lamport = T2 < T1` | **Ignore Incoming** | Stale change arriving out-of-order. |
| Task `lamport = T1` | Edit `lamport = T1` | **Lexicographical Tie-Breaker** | Compares `deviceId` values lexicographically to ensure total order. |
| Soft-Deleted Task | Any Update | **DB Wins (Tombstone)** | Tombstones are terminal; deleted entities cannot be mutated. |
| Succeeded Focus Session | Duplicate Succeeded/Failed | **Ignore Incoming** | A focus attempt can only reach a terminal state once. |

---

## 🔗 n8n Automation & Exactly-Once Webhooks

When a successful focus session is synchronized, the backend awards rewards and streak increments, registering the success inside `processed_events`. To guarantee **exactly-once** notification dispatch:

1. **Transactional Ingestion**: A lock record `focus_session_success:${sessionId}` is written to the `processed_events` table inside the PostgreSQL database transaction.
2. **Double-Check Handshake**: The backend dispatches `POST /webhook/focus-success` to n8n.
3. **Validation Call**: n8n calls back `/api/notifications/confirm/check` to query the event status.
4. **Mock Sink & Confirm**: If not already marked as processed, n8n invokes `/api/notifications/mock-sink` and calls `POST /api/notifications/confirm`, locking the event state to `'processed'`.

---

## 📁 Project Structure

```
├── backend/                  # Express TypeScript Service
│   ├── src/
│   │   ├── config.ts         # App Config (port, n8n urls, database URL)
│   │   ├── controllers/      # Sync, Bootstrap, and Notification Controllers
│   │   ├── database/         # Migrations, seeding and row mapping mappers
│   │   ├── middleware/       # Async handler, validation and error handling
│   │   ├── routes/           # Endpoint mapping (/api/sync, /api/notifications/*)
│   │   ├── services/         # Sync, curriculum, and n8n webhook dispatches
│   │   └── server.ts         # Server entry point & n8n queue worker
├── frontend/                 # React Native Expo Mobile Client
│   ├── src/
│   │   ├── components/       # Focus timers, syllabus lists, progress bars
│   │   ├── hooks/            # useSync, useSyllabus, useFocusSession hooks
│   │   ├── screens/          # Focus Dashboard, Syllabus progress, Dev Observability Panel
│   │   ├── storage/          # SQLite repos (Curriculum, Focus, Operations)
│   │   └── sync/             # Push-pull sync client implementation
└── n8n/                      # n8n Workflow JSON (n8n-workflow.json) and documentation
```

---

## ⚙️ Development Startup Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (Version >= 20.0.0)
* PostgreSQL Database instance

### 1. Set Up Environment
Create a `.env` file in the `backend/` directory:
```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/syncstudy
N8N_FOCUS_SUCCESS_WEBHOOK_URL=http://localhost:5678/webhook/focus-success
```

### 2. Install Dependencies
Run from the root workspace directory:
```bash
npm install
```

### 3. Initialize PostgreSQL Database
Compile migrations and seeds:
```bash
npm --workspace backend run migrate
npm --workspace backend run seed
```

### 4. Start Development Servers
Run the Express backend (monitored by tsx):
```bash
npm run dev:backend
```

Run the React Native web client (Expo):
```bash
npm run dev:frontend
```

---

## 📺 Observability & Verification Panel

Open the mobile app and navigate to the **Dev Panel** tab:
1. Use the **Go Offline** button to test the offline focus timers or curriculum check-offs.
2. View the **Operations Queue** to watch operations build up with local Lamport clocks.
3. Turn the network **Online** and click **Trigger Sync**.
4. Check the **Mock Notifications Log** card at the bottom to watch the webhook messages instantly update!

---

## 🔍 Verification Audit

A comprehensive requirement check, split-brain scenario verification, and schema indices audit has been compiled inside the repository:
📄 [docs/verification_audit.md](file:///Users/mohdsalauddin/Desktop/Sync-Study/docs/verification_audit.md)
