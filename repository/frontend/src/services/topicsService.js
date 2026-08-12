import api from './api';

export async function listTopics(params = {}) {
  const { data } = await api.get('/topics', { params });
  return data;
}

export async function proposeTopic(title, description) {
  const { data } = await api.post('/topics', { title, description });
  return data;
}

export async function suggestTopics(idea) {
  const { data } = await api.post('/topics/suggest', { idea });
  return data;
}
