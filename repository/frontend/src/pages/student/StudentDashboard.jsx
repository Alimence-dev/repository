import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listProjects } from '../../services/projectsService';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import { StageBadge } from '../../components/ui/Badge';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your projects.'));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Student dashboard</h1>
      <p className="text-slate-500 mb-6">Welcome back, {user?.full_name || 'student'}.</p>

      <h2 className="font-medium text-slate-900 mb-2">My Projects</h2>
      {projects === null && !error && <p className="text-sm text-slate-400 mb-6">Loading…</p>}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}
      {projects && projects.length === 0 && (
        <p className="text-sm text-slate-400 mb-6">
          You haven&apos;t submitted a proposal yet — browse topics below to get started.
        </p>
      )}
      {projects && projects.length > 0 && (
        <div className="space-y-2 mb-6 max-w-2xl">
          {projects.map((p) => (
            <Card key={p.project_id} className="p-4 flex justify-between items-center gap-4">
              <div>
                <p className="font-medium text-slate-900">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StageBadge stage={p.stage} />
                  {p.supervisor_name && <span className="text-sm text-slate-500">{p.supervisor_name}</span>}
                </div>
              </div>
              <Link
                to={`/student/progress/${p.project_id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
              >
                View progress →
              </Link>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <Card className="p-5">
          <h2 className="font-medium text-slate-900 mb-1">Topics &amp; Proposal</h2>
          <p className="text-sm text-slate-500 mb-3">Browse available topics, get AI suggestions, or propose your own.</p>
          <Link to="/student/topics" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Browse topics →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium text-slate-900 mb-1">Research Repository</h2>
          <p className="text-sm text-slate-500 mb-3">Search past completed projects by keyword, department, or year.</p>
          <Link to="/repository" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Search repository →
          </Link>
        </Card>
      </div>
    </div>
  );
}
