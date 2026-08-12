import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects } from '../../services/projectsService';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import { StageBadge } from '../../components/ui/Badge';
import { INPUT_CLASS } from '../../components/ui/input';

const STAGES = ['proposal', 'in_progress', 'defense', 'completed'];

export default function ProjectMonitoringPage() {
  const [projects, setProjects] = useState(null);
  const [stageFilter, setStageFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listProjects(stageFilter ? { stage: stageFilter } : {})
      .then(setProjects)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load projects.'));
  }, [stageFilter]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Project Monitoring</h1>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="mb-4">
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={`${INPUT_CLASS} w-48`}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {projects === null && <p className="text-sm text-slate-400">Loading…</p>}
      {projects && projects.length === 0 && <p className="text-sm text-slate-400">No projects found.</p>}

      {projects && projects.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Supervisor</th>
                <th className="px-4 py-2 font-medium">Stage</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.project_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-900 max-w-xs truncate" title={p.title}>
                    {p.title}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{p.student_name}</td>
                  <td className="px-4 py-2 text-slate-500">{p.supervisor_name || '—'}</td>
                  <td className="px-4 py-2">
                    <StageBadge stage={p.stage} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/coordinator/projects/${p.project_id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
