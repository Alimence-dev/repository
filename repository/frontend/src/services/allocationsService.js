import api from './api';

export async function getAllocationRecommendations(projectId) {
  const { data } = await api.get('/allocations/recommendations', { params: { projectId } });
  return data;
}

export async function createAllocation(studentId, supervisorId, projectId, matchScore) {
  const { data } = await api.post('/allocations', {
    student_id: studentId,
    supervisor_id: supervisorId,
    project_id: projectId,
    match_score: matchScore,
  });
  return data;
}
