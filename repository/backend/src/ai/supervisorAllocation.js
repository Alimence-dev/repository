// Rule-based supervisor allocation scoring - no ML model, no training data required.
// Score = (how much of the supervisor's expertise matches the topic) * (1 / (1 + current workload)).
// This rewards subject-matter overlap while penalizing supervisors who already have more active projects.

function parseTags(tagString) {
  return (tagString || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function scoreSupervisorMatch(topicText, supervisor) {
  const tags = parseTags(supervisor.expertise_tags);
  const normalizedTopic = (topicText || '').toLowerCase();

  if (tags.length === 0) {
    return { score: 0, matchedTags: [] };
  }

  const matchedTags = tags.filter((tag) => normalizedTopic.includes(tag));
  const overlapRatio = matchedTags.length / tags.length;
  const workloadPenalty = 1 / (1 + (supervisor.active_project_count || 0));
  const score = Number((overlapRatio * workloadPenalty).toFixed(4));

  return { score, matchedTags };
}

function rankSupervisors(topicText, supervisors) {
  return supervisors
    .map((s) => {
      const { score, matchedTags } = scoreSupervisorMatch(topicText, s);
      return {
        supervisor_id: s.user_id,
        full_name: s.full_name,
        active_project_count: s.active_project_count || 0,
        match_score: score,
        matched_tags: matchedTags,
      };
    })
    .sort((a, b) => b.match_score - a.match_score);
}

module.exports = { parseTags, scoreSupervisorMatch, rankSupervisors };
