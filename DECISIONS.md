# SyncStudy Decisions

This document records the architectural decisions for the assignment.

## Core Approach

SyncStudy uses an offline-first, operation-based synchronization model.

Each client writes user actions to local durable storage first, applies them locally for instant feedback, and later syncs pending operations to the backend. The backend deduplicates operations by stable UUIDs, applies them to canonical PostgreSQL state, and returns canonical changes to all devices.

## Conflict Resolution

Task and syllabus mutations will use Lamport clocks with deterministic tie-breakers instead of wall-clock timestamps. Deletes will be represented as tombstones and will win over updates.

This is intentionally simple and explainable: all devices receive the same canonical state from the server and apply the same deterministic rules.

## Idempotency

Focus rewards, streak updates, coin awards, and notifications will be guarded by backend uniqueness constraints. A successful focus session can be replayed during sync, but its reward event and notification event can be created only once.

## Tradeoff

The first implementation favors correctness and demo clarity over highly optimized sync. The backend will expose incremental server changes, but the design keeps the data model small enough to inspect through the Dev Panel.
