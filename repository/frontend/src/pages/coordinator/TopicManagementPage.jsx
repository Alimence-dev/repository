import { useEffect, useState } from 'react';
import { listTopics, proposeTopic } from '../../services/topicsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge, { TOPIC_TONE } from '../../components/ui/Badge';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

export default function TopicManagementPage() {
  const [topics, setTopics] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [listError, setListError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const data = await listTopics({ status: 'all' });
      setTopics(data);
    } catch (err) {
      setListError(err.response?.data?.message || 'Failed to load topics.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddTopic(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await proposeTopic(title, description);
      const topMatch = created.duplicate_check?.matches?.[0];
      if (created.status === 'duplicate') {
        setMessage(
          `Added, but flagged as a duplicate of an existing topic` +
            (topMatch ? ` (similarity ${Math.round(topMatch.similarity * 100)}%).` : '.')
        );
      } else if (created.status === 'pending') {
        setMessage(
          `Added, but flagged as similar to an existing topic` +
            (topMatch ? ` (similarity ${Math.round(topMatch.similarity * 100)}%)` : '') +
            ` and needs review.`
        );
      } else {
        setMessage(`"${created.title}" added and available for students to select.`);
      }
      setTitle('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add topic.');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = topics ? topics.filter((t) => !statusFilter || t.status === statusFilter) : null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Manage Topics</h1>
      <p className="text-sm text-slate-500 mb-6">
        Add topics of interest for students to browse and select, and review every topic that has
        come in through student proposals — including ones the AI duplicate-check flagged.
      </p>

      <Card className="p-5 mb-8">
        <h2 className="font-medium text-slate-900 mb-3">Add a topic</h2>
        <form onSubmit={handleAddTopic} className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="title">
              Title
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
            <label className={LABEL_CLASS} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={INPUT_CLASS}
              rows={3}
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Checking…' : 'Add topic'}
          </Button>
        </form>
      </Card>

      {listError && (
        <Alert variant="error" className="mb-4">
          {listError}
        </Alert>
      )}

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-medium text-slate-900">All topics</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${INPUT_CLASS} w-40`}>
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="duplicate">Duplicate</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered === null && <p className="text-sm text-slate-400">Loading…</p>}
      {filtered && filtered.length === 0 && <p className="text-sm text-slate-400">No topics found.</p>}

      <div className="space-y-2">
        {filtered?.map((t) => (
          <Card key={t.topic_id} className="p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="font-medium text-slate-900">{t.title}</p>
                {t.description && <p className="text-sm text-slate-500 mt-0.5">{t.description}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge tone={TOPIC_TONE[t.status]}>{t.status}</Badge>
                {t.claimed && <span className="text-xs text-slate-400">Claimed by a project</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
