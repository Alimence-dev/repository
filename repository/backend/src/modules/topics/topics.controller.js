const pool = require('../../config/db');
const { embedTexts, checkDuplicate, suggestTopics: suggestTopicsAi } = require('../../ai/aiServiceClient');

function topicText(title, description) {
  return `${title}. ${description || ''}`.trim();
}

// Existing topics may not have an embedding yet (seeded data, or topics created before this
// wiring existed). Batch-embed only the ones missing one and persist them, so future
// comparisons don't need recomputation - this is the caching the design doc calls for.
//
// mysql2 returns JSON columns as raw strings, not parsed values, so every row's
// embedding_vector needs parsing before it's usable as a vector.
async function ensureEmbeddings(topics) {
  for (const t of topics) {
    if (typeof t.embedding_vector === 'string') {
      t.embedding_vector = JSON.parse(t.embedding_vector);
    }
  }

  const missing = topics.filter((t) => !t.embedding_vector);
  if (missing.length === 0) return topics;

  const embeddings = await embedTexts(missing.map((t) => topicText(t.title, t.description)));

  await Promise.all(
    missing.map((t, i) => {
      t.embedding_vector = embeddings[i];
      return pool.query('UPDATE topics SET embedding_vector = ? WHERE topic_id = ?', [
        JSON.stringify(embeddings[i]),
        t.topic_id,
      ]);
    })
  );

  return topics;
}

async function listTopics(req, res) {
  const { status } = req.query;

  if (status === 'all') {
    const [rows] = await pool.query(
      `SELECT t.topic_id, t.proposed_by, t.title, t.description, t.status, t.created_at,
              (p.project_id IS NOT NULL) AS claimed
       FROM topics t
       LEFT JOIN projects p ON p.topic_id = t.topic_id
       ORDER BY t.created_at DESC`
    );
    return res.json(rows.map((r) => ({ ...r, claimed: !!r.claimed })));
  }

  if (status) {
    const [rows] = await pool.query(
      `SELECT topic_id, proposed_by, title, description, status, created_at
       FROM topics WHERE status = ? ORDER BY created_at DESC`,
      [status]
    );
    return res.json(rows);
  }

  // Default view: "available" topics - approved and not yet claimed by a project.
  const [rows] = await pool.query(
    `SELECT t.topic_id, t.proposed_by, t.title, t.description, t.status, t.created_at
     FROM topics t
     LEFT JOIN projects p ON p.topic_id = t.topic_id
     WHERE t.status = 'approved' AND p.project_id IS NULL
     ORDER BY t.created_at DESC`
  );
  return res.json(rows);
}

async function createTopic(req, res) {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'title is required' });
  }

  const [existingTopics] = await pool.query(
    'SELECT topic_id, title, description, embedding_vector FROM topics'
  );
  await ensureEmbeddings(existingTopics);

  const duplicateResult = await checkDuplicate(
    topicText(title, description),
    existingTopics.map((t) => ({ id: t.topic_id, embedding: t.embedding_vector }))
  );

  // "duplicate" -> flagged and rejected from further use; "similar" -> needs a human
  // (coordinator) to look at it; "none" -> auto-approved. AI recommends, human reviews the gray area.
  let status;
  if (duplicateResult.verdict === 'duplicate') status = 'duplicate';
  else if (duplicateResult.verdict === 'similar') status = 'pending';
  else status = 'approved';

  const [result] = await pool.query(
    `INSERT INTO topics (proposed_by, title, description, status, embedding_vector) VALUES (?, ?, ?, ?, ?)`,
    [req.user.user_id, title, description || null, status, JSON.stringify(duplicateResult.embedding)]
  );

  return res.status(201).json({
    topic_id: result.insertId,
    title,
    description: description || null,
    status,
    duplicate_check: { verdict: duplicateResult.verdict, matches: duplicateResult.matches },
  });
}

async function checkDuplicateForTopic(req, res) {
  const { id } = req.params;

  const [rows] = await pool.query(
    'SELECT topic_id, title, description, embedding_vector FROM topics WHERE topic_id = ?',
    [id]
  );
  const topic = rows[0];
  if (!topic) {
    return res.status(404).json({ message: 'Topic not found' });
  }

  const [otherTopics] = await pool.query(
    'SELECT topic_id, title, description, embedding_vector FROM topics WHERE topic_id != ?',
    [id]
  );
  await ensureEmbeddings(otherTopics);

  const duplicateResult = await checkDuplicate(
    topicText(topic.title, topic.description),
    otherTopics.map((t) => ({ id: t.topic_id, embedding: t.embedding_vector }))
  );

  let status;
  if (duplicateResult.verdict === 'duplicate') status = 'duplicate';
  else if (duplicateResult.verdict === 'similar') status = 'pending';
  else status = 'approved';

  await pool.query('UPDATE topics SET status = ?, embedding_vector = ? WHERE topic_id = ?', [
    status,
    JSON.stringify(duplicateResult.embedding),
    id,
  ]);

  return res.json({ verdict: duplicateResult.verdict, matches: duplicateResult.matches, status });
}

async function suggestTopics(req, res) {
  const { idea } = req.body;

  if (!idea) {
    return res.status(400).json({ message: 'idea is required' });
  }

  const [candidates] = await pool.query(
    `SELECT t.topic_id, t.title, t.description, t.embedding_vector
     FROM topics t
     LEFT JOIN projects p ON p.topic_id = t.topic_id
     WHERE t.status = 'approved' AND p.project_id IS NULL`
  );

  if (candidates.length === 0) {
    return res.json([]);
  }

  await ensureEmbeddings(candidates);

  const { suggestions } = await suggestTopicsAi(
    idea,
    candidates.map((t) => ({ id: t.topic_id, embedding: t.embedding_vector }))
  );

  const byId = new Map(candidates.map((t) => [t.topic_id, t]));
  const results = suggestions
    .map((s) => {
      const topic = byId.get(s.id);
      return topic && { topic_id: topic.topic_id, title: topic.title, description: topic.description, similarity: s.similarity };
    })
    .filter(Boolean);

  return res.json(results);
}

module.exports = { listTopics, createTopic, checkDuplicateForTopic, suggestTopics };
