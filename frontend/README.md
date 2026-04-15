# Frontend — React + Vite

The React frontend provides the user interface for all learning modules. It communicates with the Rails API over HTTP and WebSocket.

---

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Pages & Routing](#pages--routing)
- [Components](#components)
- [Hooks](#hooks)
- [API Layer](#api-layer)
- [State Management](#state-management)
- [Styling](#styling)
- [Running Locally](#running-locally)
- [Building for Production](#building-for-production)
- [Testing](#testing)

---

## Overview

- **Framework:** React 18 with functional components and hooks
- **Build tool:** Vite 5 (fast HMR in dev, optimised bundle in prod)
- **Styling:** Tailwind CSS 3.4 (utility classes, dark theme)
- **Routing:** React Router v6 (nested routes, protected routes)
- **State:** Zustand (lightweight global stores for auth + conversations)
- **HTTP:** Axios with a pre-configured `apiClient` that attaches JWT tokens
- **WebSocket:** `@rails/actioncable` for streaming AI responses
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Tests:** Vitest + Testing Library + MSW

---

## Folder Structure

```
frontend/
│
├── Dockerfile              # Nginx-based production image
├── nginx.conf              # Nginx config: SPA fallback + API proxy
├── index.html              # Vite entry HTML
├── vite.config.js          # Vite config: React plugin, test config
├── tailwind.config.js      # Tailwind theme (custom accent colours)
├── postcss.config.js       # PostCSS (Tailwind + Autoprefixer)
├── package.json            # Dependencies + scripts
├── .env.example            # Environment variable template
│
└── src/
    ├── main.jsx            # React entry point (BrowserRouter + Toaster)
    ├── App.jsx             # Route definitions + auth guards
    ├── index.css           # Global styles + Tailwind directives
    │
    ├── api/                # HTTP integration layer (no UI logic here)
    │   ├── client.js           # Axios instance: base URL + JWT header
    │   ├── authApi.js          # login(), register(), logout()
    │   ├── conversationsApi.js # CRUD for conversations + messages
    │   ├── vocabularyApi.js    # CRUD for vocabulary words + review
    │   ├── readingApi.js       # All IELTS Reading API calls
    │   └── cableApi.js         # ActionCable subscription factory
    │
    ├── components/
    │   ├── common/
    │   │   └── Layout.jsx          # Sidebar nav + <Outlet> for page content
    │   │
    │   ├── auth/
    │   │   └── AuthForm.jsx        # Shared login/register form
    │   │
    │   ├── chat/
    │   │   ├── ChatInput.jsx           # Text input + send button
    │   │   ├── MessageBubble.jsx       # Single chat message (user/assistant)
    │   │   ├── StreamingBubble.jsx     # Animated bubble for streaming response
    │   │   ├── VoiceButton.jsx         # Record audio button
    │   │   └── RealtimeSpeakingButton.jsx  # Real-time voice input button
    │   │
    │   ├── vocabulary/
    │   │   ├── VocabCard.jsx           # Flashcard front/back display
    │   │   ├── ReviewCard.jsx          # Review session card wrapper
    │   │   ├── ReviewProgress.jsx      # Progress bar for review session
    │   │   └── QualityRatingBar.jsx    # SM-2 quality rating (0–5 buttons)
    │   │
    │   └── ielts/reading/
    │       ├── PassageViewer.jsx       # Passage text + highlight-to-save vocab
    │       │                           # + highlightPhrase prop for answer location
    │       ├── QuestionPanel.jsx       # Single question renderer (all 6 types)
    │       ├── BandScoreCard.jsx       # Band score display with colour coding
    │       ├── FeedbackPanel.jsx       # Post-submission: band score + AI tips +
    │       │                           # per-question breakdown + Review button
    │       ├── AIExplanationBox.jsx    # Error type badge + explanation + suggestion
    │       ├── AnswerHighlight.jsx     # Highlights a phrase in passage body text
    │       ├── WeaknessRadar.jsx       # Bar chart of accuracy by question type
    │       ├── TrainingExerciseCard.jsx # Interactive micro-exercise card
    │       ├── ReviewModePanel.jsx     # Wrong answers + similar practice questions
    │       ├── PassagePracticeTab.jsx  # Practice Mode tab content
    │       ├── MockTestTab.jsx         # Mock Test tab (60-min timer, auto-submit)
    │       ├── ProgressTab.jsx         # Past attempts list + band score trend chart
    │       └── TrainingTab.jsx         # Training Mode: WeaknessRadar + exercises
    │
    ├── hooks/              # Custom React hooks (business logic, no JSX)
    │   ├── useReadingSession.js    # Manages practice/mock test state
    │   │                           # (passage, answers, timer, submit)
    │   ├── useWeaknessProfile.js   # Fetches + caches weakness profile
    │   ├── useTrainingSession.js   # Training exercise state (fetch, answer, next)
    │   ├── useReviewSession.js     # Review mode data + practice answer tracking
    │   ├── useStreamingChat.js     # ActionCable streaming chat state
    │   ├── useRealtimeSpeaking.js  # Real-time voice recording + streaming
    │   ├── useVoiceRecorder.js     # MediaRecorder API wrapper
    │   ├── useAudioStore.js        # Audio playback state
    │   └── useTTS.js               # Text-to-speech (browser Web Speech API)
    │
    ├── pages/
    │   ├── LoginPage.jsx           # /login
    │   ├── RegisterPage.jsx        # /register
    │   ├── DashboardPage.jsx       # /dashboard — stats + quick actions
    │   ├── ConversationPage.jsx    # /conversations/:id — chat interface
    │   ├── VocabularyPage.jsx      # /vocabulary — word list + add word
    │   ├── ReviewSessionPage.jsx   # /vocabulary/review — flashcard session
    │   ├── IELTSPage.jsx           # /ielts — hub with 4 skill cards
    │   └── ielts/
    │       ├── ReadingPage.jsx     # /ielts/reading — 4-tab reading interface
    │       └── ReviewPage.jsx      # /ielts/reading/attempts/:id/review
    │
    ├── stores/             # Zustand global state
    │   ├── useAuthStore.js         # user, token, login(), logout(), loading
    │   └── useConversationStore.js # conversations list, active conversation
    │
    ├── utils/
    │   └── formatters.js           # Date/time/number formatting helpers
    │
    └── __tests__/
        ├── setup.js                # Vitest setup: jest-dom matchers + MSW server
        ├── mocks/
        │   ├── server.js           # MSW service worker setup
        │   └── handlers.js         # Mock API response handlers
        ├── api/
        │   ├── conversationsApi.test.js
        │   └── readingApi.test.js
        ├── components/
        │   ├── AIExplanationBox.test.jsx
        │   ├── QuestionPanel.test.jsx
        │   ├── RealtimeSpeakingButton.test.jsx
        │   ├── TrainingExerciseCard.test.jsx
        │   └── VocabCard.test.jsx
        └── hooks/
            ├── useReadingSession.test.js
            ├── useRealtimeSpeaking.test.js
            ├── useStreamingChat.test.js
            ├── useVoiceRecorder.test.js
            └── useWeaknessProfile.test.js
```

---

## Pages & Routing

Routes are defined in `App.jsx`. There are two route guards:

- **`ProtectedRoute`** — redirects to `/login` if no user in auth store
- **`GuestRoute`** — redirects to `/dashboard` if already logged in

```
/                           → redirect to /dashboard
/login                      → LoginPage (guest only)
/register                   → RegisterPage (guest only)
/dashboard                  → DashboardPage (protected)
/conversations/:id          → ConversationPage (protected)
/vocabulary                 → VocabularyPage (protected)
/vocabulary/review          → ReviewSessionPage (protected)
/ielts                      → IELTSPage (protected)
/ielts/reading              → ReadingPage (protected)
/ielts/reading/attempts/:id/review → ReviewPage (protected)
```

All protected routes are children of a `Layout` route which renders the sidebar navigation.

---

## Components

### `Layout.jsx`
The persistent shell. Renders:
- Left sidebar with navigation links (Dashboard, Conversations, Vocabulary, IELTS)
- User info + XP/streak display at the bottom
- `<Outlet>` for the current page content

### `PassageViewer.jsx`
Two responsibilities:
1. **Vocabulary save on highlight** — when the user selects text, a tooltip appears with "Save to Vocabulary". Calls `saveVocabularyWord()`.
2. **Answer location highlight** — when `highlightPhrase` prop is provided (in Review Mode), wraps matching text in a yellow `<mark>`.

### `QuestionPanel.jsx`
Renders a single question based on its `type`. Supports all 6 IELTS question types:

| Type | UI |
|------|----|
| `mcq` | Radio-style buttons with A/B/C/D options |
| `true_false_not_given` | 3 toggle buttons |
| `fill_blank` | Text input (auto-uppercased) |
| `matching_headings` | List of roman numeral options |
| `matching_information` | Per-statement paragraph letter picker |
| `summary_completion` | Summary with blank slots + word box |

After submission, shows green/red styling and explanation text.

### `AIExplanationBox.jsx`
Displays AI-classified error analysis for a wrong answer:
- Colour-coded badge for error type (blue=vocabulary, purple=paraphrase, yellow=scanning, red=trap, orange=misread)
- Explanation of why the answer was wrong
- Suggestion for improvement (with lightbulb icon)

### `WeaknessRadar.jsx`
Horizontal bar chart showing accuracy rate per question type. Bars are:
- Green (≥70% correct)
- Yellow (50–69%)
- Red (<50%)

### `TrainingExerciseCard.jsx`
Interactive card for a single micro-exercise:
1. Shows exercise type badge + prompt
2. User clicks an option → answer is revealed with green/red styling
3. Explanation shown
4. "Next Exercise" / "See Results" button appears

### `ReviewModePanel.jsx`
Combines two sections:
1. **Mistakes** — each wrong answer with `AIExplanationBox`
2. **Similar Questions** — AI-generated practice questions rendered via `QuestionPanel`

---

## Hooks

### `useReadingSession`
The core hook for Practice and Mock Test modes. Manages:
- `passage` — current passage object
- `answers` — `{ questionId: answer }` map
- `attempt` — submitted attempt result
- `generating` / `submitting` — loading states
- `timeLeft` / `timerActive` — countdown timer for Mock Test
- `generate(params)` — calls API, sets passage
- `setAnswer(id, value)` — updates answers
- `handleSubmit()` — submits answers, gets feedback
- `reset()` — clears all state

### `useWeaknessProfile`
Fetches the weakness profile on mount. Exposes `profile`, `loading`, `error`, and `refresh()`.

### `useTrainingSession`
Manages a set of training exercises:
- `load({ count })` — fetches exercises from API
- `answerCurrent(answer)` — records answer for current exercise
- `next()` — advances to next exercise or sets `submitted=true`
- `score` — computed correct count (only when submitted)
- `reset()` — clears all state

### `useReviewSession`
Fetches review data for a specific attempt ID. Also manages practice answers for the similar questions section.

---

## API Layer

**Rule:** All HTTP calls live in `src/api/`. Components and hooks import from here — never call `axios` directly.

### `src/api/client.js`
Creates an Axios instance with:
- `baseURL` from `VITE_API_URL` env var
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: on 401, clears auth store and redirects to login

### `readingApi.js`

| Function | Method | Path |
|----------|--------|------|
| `generatePassage(params)` | POST | `/ielts/reading/passages` |
| `submitAnswers({ passageId, answers, timeTakenSeconds })` | POST | `/ielts/reading/passages/:id/submit` |
| `fetchAttempts(page)` | GET | `/ielts/reading/attempts` |
| `fetchAttempt(id)` | GET | `/ielts/reading/attempts/:id` |
| `fetchAttemptReview(id)` | GET | `/ielts/reading/attempts/:id/review` |
| `fetchWeaknessProfile()` | GET | `/ielts/reading/weakness` |
| `fetchTrainingExercises({ count })` | GET | `/ielts/reading/training` |

---

## State Management

Zustand is used for **global** state only. Local component state uses `useState`/`useReducer`.

### `useAuthStore`
```js
{
  user: null | { id, email, english_level, xp_points, streak_days },
  token: null | string,
  loading: boolean,
  login(email, password) → Promise,
  register(data) → Promise,
  logout() → Promise,
  fetchProfile() → Promise,
}
```

### `useConversationStore`
```js
{
  conversations: [],
  activeConversation: null,
  fetchConversations() → Promise,
  setActive(conversation),
  addMessage(conversationId, message),
}
```

---

## Styling

Tailwind CSS with a custom dark theme. Key design tokens (in `tailwind.config.js`):

- `accent-500` — primary brand colour (used for buttons, active states, badges)
- Dark background: `bg-gray-900` / `bg-gray-800`
- Text: `text-white` / `text-gray-300` / `text-gray-400`
- Borders: `border-white/10` (semi-transparent)

All components use Tailwind utility classes directly — no separate CSS files.

---

## Running Locally

```bash
# Install dependencies
cd frontend
yarn install

# Set up environment
cp .env.example .env.local
# Edit .env.local:
# VITE_API_URL=http://localhost:3001
# VITE_CABLE_URL=ws://localhost:3001/cable

# Start dev server (hot reload)
yarn dev
```

The app runs at `http://localhost:3000` with Vite HMR. Any `.jsx`/`.js`/`.css` change updates the browser instantly.

> The backend must be running separately (either via Docker or locally on port 3001).

---

## Building for Production

```bash
yarn build
```

Output goes to `dist/`. In Docker, the `Dockerfile` copies this into an Nginx container. `nginx.conf` handles:
- Serving static files from `/usr/share/nginx/html`
- SPA fallback: all routes return `index.html` (so React Router works)
- API proxy: `/api/` requests forwarded to `backend:3001`

---

## Testing

Tests use **Vitest** (Jest-compatible) + **@testing-library/react** + **MSW** (Mock Service Worker).

```bash
# Run all tests once
yarn test

# Watch mode
yarn test:watch
```

### MSW Handlers (`__tests__/mocks/handlers.js`)
Intercepts real HTTP requests during tests and returns mock responses. Covers all API endpoints including IELTS Reading Phase 2 endpoints.

### Test patterns

**API tests** — call the real API functions, MSW intercepts:
```js
it("returns passage with questions", async () => {
  const passage = await generatePassage({ difficulty: "band_6" });
  expect(passage).toHaveProperty("questions");
});
```

**Component tests** — render with Testing Library, assert DOM:
```js
it("shows error type badge", () => {
  render(<AIExplanationBox errorType="paraphrase" explanation="..." />);
  expect(screen.getByText(/Paraphrase Issue/i)).toBeTruthy();
});
```

**Hook tests** — use `renderHook` + `waitFor`:
```js
it("fetches weakness profile on mount", async () => {
  const { result } = renderHook(() => useWeaknessProfile());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.profile).not.toBeNull();
});
```
