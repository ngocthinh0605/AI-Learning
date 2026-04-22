# LearningEnglishProject Task Tracker

This file tracks roadmap execution with clear phases, ownership-ready tasks, and test expectations.

## Current Status Snapshot

- IELTS Reading: implemented
- IELTS Speaking: module MVP implemented
- IELTS Listening: module MVP implemented
- IELTS Writing: module MVP implemented
- Unified dashboard with progress charts: implemented
- Multiplayer conversation rooms: MVP implemented
- Mobile app (React Native): scaffold implemented

## Execution Order

1. Sprint 1: Speaking module completion + README roadmap status update
2. Sprint 2: Listening module
3. Sprint 3: Writing module
4. Sprint 4: Unified dashboard charts
5. Sprint 5: Multiplayer conversation rooms
6. Sprint 6+: Mobile app (React Native)

## Sprint 1 - Speaking Module + Docs

### A) Documentation Alignment
- [x] Update `README.md` roadmap status to reflect implemented vs partial vs planned items
- [x] Add an "Implemented so far" section to reduce contributor confusion

### B) Dedicated IELTS Speaking Module
- [x] Add speaking route/page for IELTS Part 1/2/3 flow
- [x] Reuse existing speaking feedback backend APIs/services
- [x] Add pronunciation/fluency/grammar score breakdown UI
- [x] Add speaking attempt history and review view

### Sprint 1 Testing
- [x] Frontend unit tests for speaking API client
- [x] Frontend component/page tests for speaking flow (expected, edge, failure)
- [x] Backend request specs for speaking endpoints
- [x] Backend service specs for scoring normalization/parsing behavior

## Sprint 2 - IELTS Listening Module

### Feature Tasks
- [x] Build backend listening generation and scoring endpoints
- [x] Build frontend listening test UI (audio + questions + submit + review)
- [x] Persist listening attempts for trend analysis

### Sprint 2 Testing
- [x] Backend tests for listening generation (expected, edge, failure)
- [x] Backend tests for answer scoring logic (expected, edge, failure)
- [x] Frontend tests for listening session interactions and submission states

## Sprint 3 - IELTS Writing Module (AI Essay Grading)

### Feature Tasks
- [x] Build backend essay grading pipeline with structured rubric output
- [x] Add frontend writing editor + prompt + submission flow
- [x] Add graded review UI with criteria-level feedback
- [x] Persist writing attempts for progress tracking

### Sprint 3 Testing
- [x] Backend grading contract tests (expected, edge, failure)
- [x] Backend validation/error handling tests
- [x] Frontend tests for writing submission and feedback rendering

## Sprint 4 - Unified Dashboard with Progress Charts

### Feature Tasks
- [x] Add aggregated progress endpoint across IELTS skills
- [x] Implement dashboard charts/cards for cross-skill trends
- [x] Add recent-attempt summary and actionable recommendations

### Sprint 4 Testing
- [x] Backend tests for aggregation endpoint and metric consistency
- [x] Frontend tests for chart rendering/loading/error states
- [x] Frontend tests for empty-data and single-point trend edge cases

## Sprint 5 - Multiplayer Conversation Rooms

### Feature Tasks
- [x] Introduce room/membership/message data model
- [x] Add room join/leave/post APIs with authorization rules
- [x] Add realtime room channel protocol for multi-user updates
- [x] Build room list and room conversation UI

### Sprint 5 Testing
- [x] Backend authorization tests (expected, edge, failure)
- [x] Backend broadcast/event tests
- [x] Frontend realtime behavior tests (join/leave/new messages)

## Sprint 6+ - Mobile App (React Native)

### Feature Tasks
- [x] Initialize React Native app shell
- [x] Implement auth flow and dashboard summary screen
- [x] Implement conversation and IELTS module entry points
- [x] Reuse stable API contracts from web app

### Sprint 6+ Testing
- [x] API integration tests for mobile clients
- [x] Core screen tests for auth and dashboard states
- [x] Error-handling tests for offline/timeout scenarios

## Definition of Done (per Sprint)

- [ ] Feature behavior matches acceptance criteria
- [ ] API logic and UI logic remain in separate files
- [ ] New/changed logic has tests for expected, edge, and failure cases
- [ ] Documentation updated for newly shipped behavior
- [ ] Manual smoke test completed for key user flow

## Bug-Fix Backlog (Next Phase)

### API/Contract
- [ ] Normalize response shapes across IELTS modules (`attempts`, `meta`, error schema)
- [ ] Add stricter server-side validation for malformed AI JSON payloads
- [ ] Ensure all new endpoints return consistent auth/permission status codes

### Realtime/Rooms
- [ ] Prevent duplicate room messages when HTTP + ActionCable events arrive together
- [ ] Add presence indicators (member online count) for rooms
- [ ] Add moderation hooks (delete message / remove member) for room owners

### Frontend UX/Resilience
- [ ] Add robust empty/loading/error handling to all IELTS tabs and room views
- [ ] Add retry actions for transient failures in generate/submit flows
- [ ] Verify mobile scaffold API error handling with real backend responses
