import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listProjects } from '../../services/projectsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { StageBadge } from '../../components/ui/Badge';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Supervisor Dashboard</h1>
      <p className="text-slate-500 mb-6">Welcome back, {user?.full_name || 'supervisor'}.</p>

      <h2 className="font-medium text-slate-900 mb-2">My Students</h2>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {!loading && !error && projects.length === 0 && (
        <p className="text-sm text-slate-400 mb-6">No students allocated to you yet.</p>
      )}
      <div className="space-y-2 mb-8 max-w-2xl">
        {projects.map((p) => (
          <Card key={p.project_id} className="p-4 flex justify-between items-center gap-4">
            <div>
              <p className="font-medium text-slate-900">{p.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-500">{p.student_name}</p>
                <StageBadge stage={p.stage} />
              </div>
            </div>
            <Link to={`/supervisor/projects/${p.project_id}`} className="shrink-0">
              <Button variant="secondary">View</Button>
            </Link>
          </Card>
        ))}
      </div>

      <Link to="/repository" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
        Search research repository →
      </Link>
    </div>
  );
}
