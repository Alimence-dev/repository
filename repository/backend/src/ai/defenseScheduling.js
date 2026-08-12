// Rule-based defense scheduler - a plain constraint check, not a search/optimization algorithm.
// Given a list of candidate slots (tried in order) and the set of already-scheduled defenses,
// returns the first candidate that conflicts with neither the room nor any panel member's time.

const DEFENSE_DURATION_MINUTES = 60;

function getRange(dateStr) {
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + DEFENSE_DURATION_MINUTES * 60000);
  return { start, end };
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function parsePanelMembers(panelMembers) {
  if (Array.isArray(panelMembers)) return panelMembers;
  try {
    return JSON.parse(panelMembers || '[]');
  } catch {
    return [];
  }
}

function hasRoomConflict(candidate, existingDefenses) {
  const candidateRange = getRange(candidate.scheduled_date);
  return existingDefenses.some((d) => {
    if (d.room !== candidate.room) return false;
    return rangesOverlap(candidateRange, getRange(d.scheduled_date));
  });
}

function hasPanelConflict(candidate, existingDefenses, panelMembers) {
  const candidateRange = getRange(candidate.scheduled_date);
  return existingDefenses.some((d) => {
    if (!rangesOverlap(candidateRange, getRange(d.scheduled_date))) return false;
    const existingPanel = parsePanelMembers(d.panel_members);
    return existingPanel.some((memberId) => panelMembers.includes(memberId));
  });
}

function findAvailableSlot(candidateSlots, existingDefenses, panelMembers) {
  for (const candidate of candidateSlots) {
    if (!hasRoomConflict(candidate, existingDefenses) && !hasPanelConflict(candidate, existingDefenses, panelMembers)) {
      return candidate;
    }
  }
  return null;
}

module.exports = {
  DEFENSE_DURATION_MINUTES,
  rangesOverlap,
  hasRoomConflict,
  hasPanelConflict,
  findAvailableSlot,
};
