import api from './api';

export async function listDefenses() {
  const { data } = await api.get('/defense');
  return data;
}

export async function scheduleDefense(projectId, panelMembers, room, candidateDates) {
  const { data } = await api.post('/defense/schedule', {
    project_id: Number(projectId),
    panel_members: panelMembers,
    room,
    candidate_dates: candidateDates,
  });
  return data;
}

export async function getDefense(projectId) {
  const { data } = await api.get(`/defense/${projectId}`);
  return data;
}

export async function recordDefenseResult(defenseId, result) {
  const { data } = await api.patch(`/defense/${defenseId}/result`, { result });
  return data;
}
