// Rule-based deadline prediction - no trained model, no historical labeled dataset required.
// Per the design doc: count overdue/late milestones for a risk band, and estimate a completion
// date from the average time-per-stage seen so far across the whole system.
//
// Simplification worth noting for the viva/dissertation: "average time per stage" here is
// approximated as the average number of days between a project's creation and each of its
// completed milestones - a coarse stand-in for true per-stage durations, chosen because it
// needs no extra schema and is honest about being a first-version heuristic (see design doc
// §7.4's own "future work" note about eventually training a real model once usage data exists).

const DEFAULT_DAYS_PER_STAGE = 21;

function computeRiskBand(milestones) {
  const today = new Date();
  let flags = 0;

  for (const m of milestones) {
    if (m.status === 'late') flags += 1;
    else if (m.due_date && m.status !== 'approved' && new Date(m.due_date) < today) flags += 1;
  }

  if (flags >= 2) return 'high';
  if (flags === 1) return 'medium';
  return 'low';
}

function predictCompletionDate(pendingMilestonesCount, avgDaysPerStage, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() + Math.round(pendingMilestonesCount * avgDaysPerStage));
  return date;
}

async function getAverageDaysPerStage(pool) {
  const [rows] = await pool.query(
    `SELECT m.completed_at, p.created_at
     FROM milestones m
     JOIN projects p ON p.project_id = m.project_id
     WHERE m.completed_at IS NOT NULL`
  );

  if (rows.length === 0) return DEFAULT_DAYS_PER_STAGE;

  const totalDays = rows.reduce((sum, row) => {
    const days = (new Date(row.completed_at) - new Date(row.created_at)) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return totalDays / rows.length;
}

async function predictDeadline(pool, projectId) {
  const [milestones] = await pool.query(
    'SELECT status, progress_percent, due_date, completed_at FROM milestones WHERE project_id = ?',
    [projectId]
  );

  const riskBand = computeRiskBand(milestones);
  const pendingCount = milestones.filter((m) => m.status !== 'approved').length;
  const avgDaysPerStage = await getAverageDaysPerStage(pool);
  const predictedDate = predictCompletionDate(pendingCount, avgDaysPerStage);

  return {
    risk_band: riskBand,
    predicted_deadline: predictedDate.toISOString().slice(0, 10),
    average_days_per_stage: Number(avgDaysPerStage.toFixed(1)),
  };
}

module.exports = {
  DEFAULT_DAYS_PER_STAGE,
  computeRiskBand,
  predictCompletionDate,
  getAverageDaysPerStage,
  predictDeadline,
};
