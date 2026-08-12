import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

const ROLE_HOME = {
  student: '/student',
  supervisor: '/supervisor',
  coordinator: '/coordinator',
  admin: '/admin',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_HOME[user.role] || '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
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
          <h1 className="text-lg font-semibold text-slate-900">University of Kigali</h1>
          <p className="text-sm text-slate-500 mt-1">Final Project Coordination System — sign in to continue</p>
        </div>

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
          autoComplete="current-password"
          className={`${INPUT_CLASS} mb-4`}
        />

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-sm text-slate-500 text-center mt-4">
          New here?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
