import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

const ROLE_HOME = {
  student: '/student',
  supervisor: '/supervisor',
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register({
        full_name: fullName,
        email,
        password,
        role,
        department: department || undefined,
      });
      navigate(ROLE_HOME[user.role] || '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md border border-slate-100">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-block mb-3">
            <div className="mx-auto w-11 h-11 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-semibold text-lg">
              U
            </div>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">University of Kigali — Final Project Coordination System</p>
        </div>

        <label className={LABEL_CLASS} htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={`${INPUT_CLASS} mb-4`}
        />

        <label className={LABEL_CLASS} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={`${INPUT_CLASS} mb-4`}
        />

        <label className={LABEL_CLASS} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className={`${INPUT_CLASS} mb-4`}
        />
        <p className="text-xs text-slate-400 -mt-3 mb-4">At least 8 characters.</p>

        <label className={LABEL_CLASS} htmlFor="role">
          I am a
        </label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className={`${INPUT_CLASS} mb-4`}>
          <option value="student">Student</option>
          <option value="supervisor">Supervisor</option>
        </select>

        <label className={LABEL_CLASS} htmlFor="department">
          Department (optional)
        </label>
        <input
          id="department"
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={`${INPUT_CLASS} mb-4`}
        />

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-sm text-slate-500 text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
