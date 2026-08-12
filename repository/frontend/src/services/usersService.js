import api from './api';

export async function listUsers(params = {}) {
  const { data } = await api.get('/users', { params });
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post('/users', payload);
  return data;
}

export async function getAuditLogs() {
  const { data } = await api.get('/users/audit');
  return data;
}

export async function updateUserRole(userId, role) {
  const { data } = await api.patch(`/users/${userId}/role`, { role });
  return data;
}

export async function updateUserStatus(userId, status) {
  const { data } = await api.patch(`/users/${userId}/status`, { status });
  return data;
}
