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
- [x] Normalize response shapes across IELTS modules (`attempts`, `meta`, error schema)
- [x] Add stricter server-side validation for malformed AI JSON payloads
- [x] Ensure all new endpoints return consistent auth/permission status codes

### Realtime/Rooms
- [x] Prevent duplicate room messages when HTTP + ActionCable events arrive together
- [x] Add presence indicators (member online count) for rooms
- [x] Add moderation hooks (delete message / remove member) for room owners

### Frontend UX/Resilience
- [x] Add robust empty/loading/error handling to all IELTS tabs and room views
- [x] Add retry actions for transient failures in generate/submit flows
- [ ] Verify mobile scaffold API error handling with real backend responses

## Next Sprint - Daily Learning Plan Engine

### Feature Tasks
- [x] Add backend daily-plan generation endpoint with strict JSON contract
- [x] Add validator for strict schema, allowed task types, and duration cap
- [x] Persist generated plans for analytics/session history
- [x] Add frontend daily-plan page and API integration
- [x] Add navigation route for daily plan workflow
- [x] Upgrade planner to cross-skill intelligence (weakness -> multi-skill mapping with weighted mix)
- [x] Enforce at least 2 different task types in generated daily plans
- [x] Add daily-plan UI cross-skill mix preview (generated plan + history cards)

### Testing
- [x] Backend request tests (expected, edge, failure)
- [x] Backend validator/service unit tests
- [x] Frontend API tests
- [x] Frontend page tests (expected, edge, failure)
- [x] Hardening: strict schema-level field validation and multi-skill enforcement

## AI Pipeline Foundation Sprints

### Sprint A - Mistake Analysis Prompt (Foundation)
- [x] Add pipeline endpoint: `POST /api/v1/pipeline/analyze_attempt`
- [x] Add strict mistake analysis service prompt and JSON contract validator
- [x] Persist mistake-analysis outcomes into `session_outcomes`
- [x] Add service/request tests for expected, edge, and failure cases

### Sprint B - Daily Learning Planner (Upgraded Pipeline)
- [x] Upgrade planner prompt inputs to include `latest_mistake_analysis`
- [x] Keep backward compatibility for legacy `recent_performance_json` clients
- [x] Add strict error-code contract (`INVALID_REQUEST`, `DAILY_PLAN_*`)
- [x] Add cross-skill mapping service and weighted intervention mix logic

### Sprint C - Training Generator (Weakness-Aligned)
- [x] Upgrade training generator prompt to strict weakness-focused schema
- [x] Add structured training inputs (`task_type`, `weakness_focus`, `cognitive_bias`)
- [x] Enforce strict exercise JSON shape (`question`, `options`, `correct_answer`, `explanation`)
- [x] Update reading training API and frontend to consume strict fields end-to-end

### Sprint D - Improvement Evaluation (Intelligence Layer)
- [x] Add pipeline endpoint: `POST /api/v1/pipeline/evaluate_improvement`
- [x] Add strict validator for before/after/delta integrity (`delta = after - before`)
- [x] Persist improvement evaluations into `session_outcomes`
- [x] Integrate improvement evaluation into Reading Training results UI
