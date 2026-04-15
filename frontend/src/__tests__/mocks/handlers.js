import { http, HttpResponse } from "msw";

const BASE = "http://localhost:3001/api/v1";

export const handlers = [
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json(
      { message: "Logged in", user: { id: "1", email: "test@test.com", english_level: "B1", xp_points: 0, streak_days: 0 } },
      { headers: { Authorization: "Bearer fake-jwt-token" } }
    )
  ),

  http.get(`${BASE}/profile`, () =>
    HttpResponse.json({ id: "1", email: "test@test.com", english_level: "B1", xp_points: 50, streak_days: 3 })
  ),

  http.get(`${BASE}/conversations`, () =>
    HttpResponse.json([
      { id: "c1", title: "Ordering Coffee", topic: "Travel", message_count: 4, created_at: new Date().toISOString() },
    ])
  ),

  http.post(`${BASE}/conversations`, () =>
    HttpResponse.json({ id: "c2", title: "Test Convo", topic: "Business", message_count: 0, created_at: new Date().toISOString() }, { status: 201 })
  ),

  http.get(`${BASE}/conversations/:id`, ({ params }) =>
    HttpResponse.json({ id: params.id, title: "Test", topic: "Travel", messages: [] })
  ),

  http.post(`${BASE}/conversations/:id/messages`, () =>
    HttpResponse.json({
      user_message: { id: "m1", role: "user", content: "Hello", created_at: new Date().toISOString() },
      assistant_message: { id: "m2", role: "assistant", content: "Hi there!", created_at: new Date().toISOString() },
      vocabulary_suggestion: null,
    }, { status: 201 })
  ),

  http.get(`${BASE}/vocabulary_words`, () =>
    HttpResponse.json([
      { id: "v1", word: "ubiquitous", definition: "Present everywhere", mastery_level: 2, next_review_at: null },
    ])
  ),

  // ─── IELTS Reading handlers ──────────────────────────────────────────────

  http.post(`${BASE}/ielts/reading/passages`, () =>
    HttpResponse.json(
      {
        id:           "p1",
        title:        "The Rise of Urban Farming",
        body:         "Urban farming is growing rapidly across the world...",
        difficulty:   "band_6",
        passage_type: "academic",
        topic:        "urban farming",
        question_count: 2,
        questions: [
          { id: 1, type: "mcq", question: "What is the main topic?",
            options: ["A. Cities", "B. Farming", "C. Both", "D. None"], answer: "C" },
          { id: 2, type: "true_false_not_given",
            statement: "Urban farming is a new concept.", answer: "FALSE" },
        ],
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  ),

  http.post(`${BASE}/ielts/reading/passages/:id/submit`, () =>
    HttpResponse.json(
      {
        id:              "a1",
        score:           1,
        total_questions: 2,
        percentage:      50.0,
        band_score:      5.0,
        time_taken_seconds: 300,
        answers:         { "1": "C", "2": "TRUE" },
        feedback: {
          band_score: 5.0,
          tips:       "Keep practising.",
          questions: [
            { id: 1, is_correct: true,  explanation: "Correct!" },
            { id: 2, is_correct: false, explanation: "The answer was FALSE." },
          ],
        },
        completed_at: new Date().toISOString(),
        created_at:   new Date().toISOString(),
        ielts_reading_passage: {
          id: "p1", title: "The Rise of Urban Farming", difficulty: "band_6",
        },
      },
      { status: 201 }
    )
  ),

  http.get(`${BASE}/ielts/reading/attempts`, () =>
    HttpResponse.json({
      attempts: [
        {
          id: "a1", score: 1, total_questions: 2, percentage: 50.0,
          band_score: 5.0, completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          ielts_reading_passage: { id: "p1", title: "The Rise of Urban Farming", difficulty: "band_6" },
        },
      ],
      meta: { total: 1, page: 1, per_page: 10, pages: 1 },
    })
  ),

  http.get(`${BASE}/ielts/reading/attempts/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id, score: 1, total_questions: 2, percentage: 50.0,
      band_score: 5.0, completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ielts_reading_passage: { id: "p1", title: "The Rise of Urban Farming", difficulty: "band_6" },
    })
  ),

  // Phase 2 handlers
  http.get(`${BASE}/ielts/reading/attempts/:id/review`, ({ params }) =>
    HttpResponse.json({
      attempt: {
        id: params.id, score: 1, total_questions: 2,
        ielts_reading_passage: {
          id: "p1", title: "The Rise of Urban Farming",
          body: "Urban farming is growing rapidly across the world...",
          questions: [
            { id: 1, type: "mcq", question: "What is the main topic?",
              options: ["A. Cities", "B. Farming", "C. Both", "D. None"], answer: "C" },
          ],
        },
      },
      wrong_answers: [
        { id: "wa1", question_id: 2, question_type: "true_false_not_given",
          user_answer: "TRUE", correct_answer: "FALSE",
          is_correct: false, error_type: "trap",
          explanation: "This is a T/F/NG trap.",
          suggestion: "Read more carefully." },
      ],
      similar_questions: [],
    })
  ),

  http.get(`${BASE}/ielts/reading/weakness`, () =>
    HttpResponse.json({
      id:                    "wp1",
      weakness_by_type:      { mcq: { attempts: 8, correct: 6, rate: 0.75 } },
      error_type_counts:     { paraphrase: 2 },
      recommended_difficulty: "band_6",
      total_attempts:        3,
      weakest_type:          "mcq",
      ranked_weaknesses:     [{ type: "mcq", rate: 0.75, attempts: 8 }],
      last_updated_at:       new Date().toISOString(),
    })
  ),

  http.get(`${BASE}/ielts/reading/training`, () =>
    HttpResponse.json({
      weakness_type: "paraphrase",
      exercises: [
        {
          type:        "paraphrase_match",
          prompt:      "Which sentence means the same as 'Urban farming has grown'?",
          options:     ["A. City agriculture expanded", "B. Rural farming declined"],
          answer:      "A. City agriculture expanded",
          explanation: "'Grown' is paraphrased as 'expanded'.",
        },
      ],
    })
  ),
];
