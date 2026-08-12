import { useEffect, useState } from 'react';
import { listUsers, createUser, updateUserRole, updateUserStatus } from '../../services/usersService';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { INPUT_CLASS } from '../../components/ui/input';

const ROLES = ['student', 'supervisor', 'coordinator', 'admin'];
const SELECT_CLASS =
  'border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function UserManagementPage() {
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
  });

  async function load() {
    try {
      const data = await listUsers(roleFilter ? { role: roleFilter } : {});
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  async function handleRoleChange(userId, role) {
    setError('');
    setMessage('');
    try {
      await updateUserRole(userId, role);
      setMessage(`Role updated to ${role}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role.');
    }
  }

  async function handleStatusToggle(user) {
    setError('');
    setMessage('');
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUserStatus(user.user_id, nextStatus);
      setMessage(`${user.full_name} is now ${nextStatus}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setCreateError('');
    setCreateMessage('');
    setCreating(true);
    try {
      await createUser({
        ...newUser,
        department: newUser.department || null,
      });
      setCreateMessage('New account created successfully.');
      setNewUser({ full_name: '', email: '', password: '', role: 'student', department: '' });
      await load();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">User Management</h1>

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

      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create user account</h2>
            <p className="text-sm text-slate-500">Create new student, supervisor, coordinator, or admin accounts.</p>
          </div>
          {createError && (
            <Alert variant="error">{createError}</Alert>
          )}
          {createMessage && (
            <Alert variant="success">{createMessage}</Alert>
          )}
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreateUser}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                className={INPUT_CLASS + ' mt-1 w-full'}
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                className={INPUT_CLASS + ' mt-1 w-full'}
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                className={INPUT_CLASS + ' mt-1 w-full'}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                className={SELECT_CLASS + ' mt-1 w-full'}
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Department</span>
              <input
                className={INPUT_CLASS + ' mt-1 w-full'}
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create user'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
      <div className="mb-4">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${INPUT_CLASS} w-48`}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {users === null && <p className="text-sm text-slate-400">Loading…</p>}
      {users && users.length === 0 && <p className="text-sm text-slate-400">No users found.</p>}

      {users && users.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">{u.email}</td>
                  <td className="px-4 py-2 text-slate-500">{u.department || '—'}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-500 ring-slate-200'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="link" onClick={() => handleStatusToggle(u)}>
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
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
