import api from './api';

export async function submitProposal(topicId, title) {
  const { data } = await api.post('/proposals', { topic_id: topicId, title });
  return data;
}

export async function getProposal(id) {
  const { data } = await api.get(`/proposals/${id}`);
  return data;
}

export async function uploadProjectDocument(projectId, file, docType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  const { data } = await api.post(`/projects/${projectId}/documents`, formData);
  return data;
}
