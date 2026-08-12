import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { submitProposal, uploadProjectDocument } from '../../services/proposalsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { StageBadge } from '../../components/ui/Badge';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

export default function ProposalForm() {
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topicId');
  const topicTitle = searchParams.get('topicTitle') || '';

  const [title, setTitle] = useState(topicTitle);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!topicId) {
    return (
      <div className="max-w-xl">
        <p className="mb-4 text-slate-600">No topic selected yet.</p>
        <Link to="/student/topics" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Browse topics first →
        </Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const project = await submitProposal(topicId, title);
      if (file) {
        await uploadProjectDocument(project.project_id, file, 'proposal');
      }
      setResult(project);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Proposal submitted</h1>
        <Card className="p-5 mb-4">
          <p className="text-slate-700 mb-2">
            Project #{result.project_id} — &quot;{result.title}&quot;
          </p>
          <StageBadge stage={result.stage} />
        </Card>
        <Link
          to={`/student/progress/${result.project_id}`}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View progress →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Submit Project Proposal</h1>
      <p className="text-sm text-slate-500 mb-6">Topic: {topicTitle}</p>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="title">
              Project title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="file">
              Proposal document (PDF or Word, optional at this step)
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit proposal'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
