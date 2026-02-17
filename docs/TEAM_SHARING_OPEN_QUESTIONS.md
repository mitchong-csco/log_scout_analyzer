# Team Sharing (MongoDB) - Open Questions

## Context
We may leverage the same MongoDB used for TagScout pattern sync to support shared analysis cache and collaboration. This document records the questions to resolve when we plan and implement team sharing.

## Goals and Scope
- What data is shared: analysis summaries, full match payloads, annotations, overrides, or all of the above?
- Are we targeting read-only sharing first, or full collaboration (create/update/delete)?
- What is the minimal viable feature set for the first rollout?

## Data Model and Storage
- What is the canonical schema for shared cache entries?
- Should we store full match details, or only summaries plus pointers?
- How do we version entries against pattern versions and analyzer versions?
- What retention policy and size limits apply?

## Tenancy and Access
- How is workspace or project ownership represented (team, org, repo, workspace)?
- What auth mechanism should the LSP use to access MongoDB?
- What roles/permissions are required (read, write, admin)?

## Sync and Freshness
- Push vs. pull updates: which user experience is required?
- What constitutes stale data (file hash, pattern version, time window)?
- How do we handle offline or intermittent connectivity?

## Conflicts and Collaboration
- How do we resolve concurrent updates (last-write-wins, versioned merge, locking)?
- Do we need audit history or change tracking?
- Are annotations or overrides mutable by multiple users?

## Client/UI Integration
- Which UI elements should surface shared data (cached files, tree views, panels)?
- Do we need cross-file navigation helpers (next/prev, quick pick)?
- How will the client indicate stale vs. fresh entries?

## Security and Compliance
- Are there data residency or PII constraints for shared analysis data?
- What data should be redacted before persistence?
- How are credentials stored and rotated?

## Rollout and Ownership
- Which team owns the MongoDB schema and operational support?
- What is the initial rollout scope (pilot group, specific products)?
- What metrics define success (latency, adoption, reduction in re-analysis)?

## Decision Points
- Select storage strategy (MongoDB only vs. MongoDB + local fallback).
- Decide on summary-only vs. full payload storage.
- Determine sync strategy (push, pull, hybrid).
