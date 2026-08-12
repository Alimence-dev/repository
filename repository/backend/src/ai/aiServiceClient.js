// Thin HTTP client for the Python AI microservice (ai-service/, sentence-transformers + cosine
// similarity). Wired up for real in Phase 7 - before this, topics.controller.js used a stub here
// that always reported "no duplicate" so the rest of the flow could be built first.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Surfaced with a 503 by the global error handler (see app.js) instead of a generic 500,
// so callers get an actionable message when ai-service isn't running (a likely mistake in a
// viva/demo where three separate services need to be started).
function aiServiceUnavailableError(detail) {
  const error = new Error(`AI service is unavailable (${detail}). Make sure ai-service is running.`);
  error.statusCode = 503;
  return error;
}

async function postJson(path, body) {
  let response;
  try {
    response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw aiServiceUnavailableError(err.message);
  }

  if (!response.ok) {
    const text = await response.text();
    throw aiServiceUnavailableError(`${path} returned ${response.status}: ${text}`);
  }

  return response.json();
}

async function embedTexts(texts) {
  const { embeddings } = await postJson('/embed', { texts });
  return embeddings;
}

async function checkDuplicate(text, existing) {
  return postJson('/duplicate-check', { text, existing });
}

async function suggestTopics(text, candidates) {
  return postJson('/suggest-topics', { text, candidates });
}

async function checkPlagiarism(text, corpusTexts) {
  return postJson('/plagiarism-check', { text, corpus_texts: corpusTexts });
}

module.exports = { embedTexts, checkDuplicate, suggestTopics, checkPlagiarism };
