import api from './api';

export async function searchRepository(params) {
  const { data } = await api.get('/repository/search', { params });
  return data;
}

export async function archiveProject(projectId, keywords) {
  const { data } = await api.post(`/repository/archive/${projectId}`, { keywords });
  return data;
}
