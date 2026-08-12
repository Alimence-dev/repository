const pool = require('../../config/db');
const { createDefaultMilestones } = require('../milestones/milestones.controller');

async function createProposal(req, res) {
  const { topic_id, title } = req.body;

  if (!topic_id) {
    return res.status(400).json({ message: 'topic_id is required' });
  }

  const [topicRows] = await pool.query(
    'SELECT topic_id, title AS topic_title, status FROM topics WHERE topic_id = ?',
    [topic_id]
  );
  const topic = topicRows[0];
  if (!topic) {
    return res.status(404).json({ message: 'Topic not found' });
  }
  if (topic.status !== 'approved') {
    return res.status(400).json({ message: `Topic is not approved for selection (status: ${topic.status})` });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO projects (student_id, supervisor_id, topic_id, title, stage)
       VALUES (?, NULL, ?, ?, 'proposal')`,
      [req.user.user_id, topic_id, title || topic.topic_title]
    );

    await createDefaultMilestones(result.insertId);

    return res.status(201).json({
      project_id: result.insertId,
      student_id: req.user.user_id,
      topic_id,
      title: title || topic.topic_title,
      stage: 'proposal',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This topic has already been claimed by another project' });
    }
    throw err;
  }
}

async function getProposal(req, res) {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT project_id, student_id, supervisor_id, topic_id, title, stage, created_at
     FROM projects WHERE project_id = ?`,
    [id]
  );
  const project = rows[0];
  if (!project) {
    return res.status(404).json({ message: 'Proposal not found' });
  }

  const { user_id, role } = req.user;
  const isAuthorized = role === 'coordinator' || project.student_id === user_id || project.supervisor_id === user_id;
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to view this proposal' });
  }

  const [documents] = await pool.query(
    `SELECT document_id, file_path, version, doc_type, uploaded_at FROM documents WHERE project_id = ?`,
    [id]
  );

  return res.json({ ...project, documents });
}

module.exports = { createProposal, getProposal };
