import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';

const ACTIONS = [
  { to: '/coordinator/projects', title: 'Project monitoring', desc: 'Every project, any stage, with student and supervisor at a glance.' },
  { to: '/coordinator/topics', title: 'Manage topics', desc: 'Add topics of interest, and review every proposed topic and its duplicate-check status.' },
  { to: '/coordinator/allocations', title: 'Allocate supervisors', desc: 'Review AI-ranked matches and assign a supervisor to a proposal.' },
  { to: '/coordinator/defense', title: 'Schedule defenses', desc: 'Look up or schedule a defense, and record results.' },
  { to: '/coordinator/archive', title: 'Archive a completed project', desc: 'Move a finished project into the searchable repository.' },
  { to: '/coordinator/reports', title: 'Reports', desc: 'Download project status and defense results as Excel or PDF.' },
  { to: '/coordinator/statistics', title: 'Statistics', desc: 'Visual breakdown of project stages, topic outcomes, and workload.' },
  { to: '/repository', title: 'Search research repository', desc: 'Search archived projects by keyword, department, or year.' },
];

export default function CoordinatorDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Coordinator Dashboard</h1>
      <p className="text-slate-500 mb-6">Welcome back, {user?.full_name || 'coordinator'}.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <Card key={a.to} className="p-5">
            <h2 className="font-medium text-slate-900 mb-1">{a.title}</h2>
            <p className="text-sm text-slate-500 mb-3">{a.desc}</p>
            <Link to={a.to} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Open →
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
