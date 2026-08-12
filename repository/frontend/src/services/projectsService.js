import api from './api';

export async function listProjects(params = {}) {
  const { data } = await api.get('/projects', { params });
  return data;
}

export async function getProject(id) {
  const { data } = await api.get(`/projects/${id}`);
  return data;
}

export async function updateProjectStage(id, stage) {
  const { data } = await api.patch(`/projects/${id}/stage`, { stage });
  return data;
}

export async function listMilestones(projectId) {
  const { data } = await api.get(`/projects/${projectId}/milestones`);
  return data;
}

export async function updateMilestone(projectId, milestoneId, updates) {
  const { data } = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, updates);
  return data;
}

export async function listFeedback(projectId) {
  const { data } = await api.get(`/projects/${projectId}/feedback`);
  return data;
}

export async function addFeedback(projectId, comment, rating) {
  const { data } = await api.post(`/projects/${projectId}/feedback`, { comment, rating });
  return data;
}

export async function predictDeadline(projectId) {
  const { data } = await api.post(`/projects/${projectId}/predict-deadline`);
  return data;
}

export async function listDocuments(projectId) {
  const { data } = await api.get(`/projects/${projectId}/documents`);
  return data;
}
