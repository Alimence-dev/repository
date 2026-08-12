import { useEffect, useState } from 'react';
import { listProjects } from '../../services/projectsService';
import { getAllocationRecommendations, createAllocation } from '../../services/allocationsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

export default function AllocationsPage() {
  const [projects, setProjects] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    listProjects({ stage: 'proposal' })
      .then((data) => setProjects(data.filter((p) => !p.supervisor_id)))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load projects.'));
  }, []);

  async function handleSelectProject(projectId) {
    setError('');
    setMessage('');
    setSelectedProjectId(projectId);
    try {
      const data = await getAllocationRecommendations(projectId);
      setRecommendations(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recommendations.');
    }
  }

  async function handleAllocate(project, supervisor) {
    setError('');
    try {
      await createAllocation(project.student_id, supervisor.supervisor_id, project.project_id, supervisor.match_score);
      setMessage(`Allocated ${supervisor.full_name} to ${project.student_name}.`);
      setProjects((prev) => prev.filter((p) => p.project_id !== project.project_id));
      setRecommendations(null);
      setSelectedProjectId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate.');
    }
  }

  const selectedProject = (projects || []).find((p) => p.project_id === selectedProjectId);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Supervisor Allocation</h1>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {message && (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Awaiting allocation</h2>
      {projects === null && <p className="text-sm text-slate-400 mb-8">Loading…</p>}
      {projects && projects.length === 0 && <p className="text-sm text-slate-400 mb-8">No proposals awaiting allocation.</p>}
      <div className="space-y-2 mb-8">
        {(projects || []).map((p) => (
          <Card key={p.project_id} className="p-4 flex justify-between items-center gap-4">
            <div>
              <p className="font-medium text-slate-900">{p.title}</p>
              <p className="text-sm text-slate-500">{p.student_name}</p>
            </div>
            <Button variant="secondary" className="shrink-0" onClick={() => handleSelectProject(p.project_id)}>
              View recommendations
            </Button>
          </Card>
        ))}
      </div>

      {selectedProject && (
        <>
          <h2 className="font-medium text-slate-900 mb-2">
            Recommended supervisors for &quot;{selectedProject.title}&quot;
          </h2>
          {recommendations === null && <p className="text-sm text-slate-400">Loading…</p>}
          {recommendations && recommendations.length === 0 && (
            <p className="text-sm text-slate-400">No active supervisors found.</p>
          )}
          <div className="space-y-2">
            {recommendations?.map((r) => (
              <Card key={r.supervisor_id} className="p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium text-slate-900">{r.full_name}</p>
                  <p className="text-sm text-slate-500">
                    Match score: {r.match_score} — {r.active_project_count} active project(s)
                  </p>
                  {r.matched_tags.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Matched: {r.matched_tags.join(', ')}</p>
                  )}
                </div>
                <Button className="shrink-0" onClick={() => handleAllocate(selectedProject, r)}>
                  Allocate
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
