import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getProject,
  updateProjectStage,
  listMilestones,
  updateMilestone,
  listFeedback,
  addFeedback,
  predictDeadline,
} from '../../services/projectsService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge, { StageBadge, MILESTONE_TONE, RISK_TONE } from '../../components/ui/Badge';
import { INPUT_CLASS } from '../../components/ui/input';

const STAGES = ['proposal', 'in_progress', 'defense', 'completed'];
const MILESTONE_STATUSES = ['pending', 'submitted', 'approved', 'late'];
const SELECT_CLASS =
  'border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const BACK_PATH = { supervisor: '/supervisor', coordinator: '/coordinator/projects' };

// Used by both /supervisor/projects/:projectId and /coordinator/projects/:projectId —
// the backend RBAC already allows a coordinator through every one of these actions
// regardless of who the assigned supervisor is, so the same screen works for both.
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadAll() {
    const [p, m, f] = await Promise.all([getProject(projectId), listMilestones(projectId), listFeedback(projectId)]);
    setProject(p);
    setMilestones(m);
    setFeedback(f);
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.response?.data?.message || 'Failed to load project.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleStageChange(e) {
    setError('');
    setMessage('');
    try {
      await updateProjectStage(projectId, e.target.value);
      setMessage(`Stage updated to "${e.target.value}".`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stage.');
    }
  }

  async function handleMilestoneStatusChange(milestoneId, status) {
    setError('');
    setMessage('');
    try {
      await updateMilestone(projectId, milestoneId, { status });
      setMessage('Milestone updated.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update milestone.');
    }
  }

  async function handleFeedbackSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await addFeedback(projectId, comment, rating ? Number(rating) : undefined);
      setComment('');
      setRating('');
      setMessage('Feedback added.');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add feedback.');
    }
  }

  async function handlePredictDeadline() {
    setError('');
    setMessage('');
    try {
      const result = await predictDeadline(projectId);
      await loadAll();
      setPrediction(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to predict deadline.');
    }
  }

  if (error && !project) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!project) {
    return <p className="text-slate-500">Loading…</p>;
  }

  const backPath = BACK_PATH[user?.role];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
        <StageBadge stage={project.stage} />
      </div>

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

      <div className="flex items-center gap-2 mb-6">
        <label className="text-sm font-medium text-slate-700" htmlFor="stage">
          Stage:
        </label>
        <select id="stage" value={project.stage} onChange={handleStageChange} className={SELECT_CLASS}>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-4 mb-6">
        {project.predicted_deadline && (
          <p className="text-sm text-slate-600">
            Predicted completion:{' '}
            <span className="font-medium">{new Date(project.predicted_deadline).toLocaleDateString()}</span>
          </p>
        )}
        {project.plagiarism_score !== null && project.plagiarism_score !== undefined && (
          <p className="text-sm text-slate-600">
            Plagiarism risk score (latest chapter/final):{' '}
            <span className="font-medium">{Math.round(project.plagiarism_score * 100)}%</span>
          </p>
        )}
        {prediction && (
          <p className="text-sm text-slate-700 mt-1 flex items-center gap-2">
            Risk band: <Badge tone={RISK_TONE[prediction.risk_band]}>{prediction.risk_band}</Badge>
            <span className="text-slate-500">(avg {prediction.average_days_per_stage} days/stage)</span>
          </p>
        )}
        <Button variant="link" className="mt-2 inline-block" onClick={handlePredictDeadline}>
          Predict deadline
        </Button>
      </Card>

      <h2 className="font-medium text-slate-900 mb-2">Milestones</h2>
      <div className="space-y-2 mb-8">
        {milestones.map((m) => (
          <Card key={m.milestone_id} className="p-4 flex justify-between items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{m.name}</p>
                <Badge tone={MILESTONE_TONE[m.status]}>{m.status}</Badge>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${m.progress_percent}%` }} />
              </div>
            </div>
            <select
              value={m.status}
              onChange={(e) => handleMilestoneStatusChange(m.milestone_id, e.target.value)}
              className={`${SELECT_CLASS} shrink-0`}
            >
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Card>
        ))}
      </div>

      <h2 className="font-medium text-slate-900 mb-2">Feedback</h2>
      <div className="space-y-2 mb-4">
        {feedback.length === 0 && <p className="text-sm text-slate-400">No feedback yet.</p>}
        {feedback.map((f) => (
          <Card key={f.feedback_id} className="p-4">
            <p className="text-sm text-slate-500 mb-1">
              {f.given_by_name}
              {f.rating ? ` — ${f.rating}/5` : ''}
            </p>
            <p className="text-slate-800">{f.comment}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <form onSubmit={handleFeedbackSubmit} className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment"
            className={INPUT_CLASS}
            rows={3}
          />
          <input
            type="number"
            min="1"
            max="5"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Rating (1-5, optional)"
            className={`${INPUT_CLASS} w-40`}
          />
          <Button type="submit">Add feedback</Button>
        </form>
      </Card>

      {backPath && (
        <p className="mt-6">
          <Link to={backPath} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            ← Back
          </Link>
        </p>
      )}
    </div>
  );
}
