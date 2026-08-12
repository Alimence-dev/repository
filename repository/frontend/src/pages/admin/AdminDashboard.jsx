import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';

const ACTIONS = [
  { to: '/admin/users', title: 'User Management', description: 'Create accounts, change roles, and suspend or reactivate users.' },
  { to: '/admin/audit', title: 'Activity Log', description: 'Review account activity and administrative changes across the system.' },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <Card key={action.to} className="p-6 hover:shadow-lg transition">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{action.title}</h2>
            <p className="text-slate-600 mb-4">{action.description}</p>
            <Link to={action.to} className="text-indigo-600 font-medium hover:text-indigo-700">
              Open
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
