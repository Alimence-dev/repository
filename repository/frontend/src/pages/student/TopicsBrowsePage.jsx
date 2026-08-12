import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTopics, proposeTopic, suggestTopics } from '../../services/topicsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

function TopicRow({ topic, onSelect }) {
  return (
    <Card className="p-4 flex justify-between items-start gap-4">
      <div>
        <p className="font-medium text-slate-900">{topic.title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{topic.description}</p>
        {typeof topic.similarity === 'number' && (
          <p className="text-xs text-slate-400 mt-1">Match: {Math.round(topic.similarity * 100)}%</p>
        )}
      </div>
      <Button variant="secondary" className="shrink-0" onClick={() => onSelect(topic.topic_id, topic.title)}>
        Select
      </Button>
    </Card>
  );
}

export default function TopicsBrowsePage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [idea, setIdea] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState('');

  const navigate = useNavigate();

  async function loadTopics() {
    setLoading(true);
    setError('');
    try {
      const data = await listTopics();
      setTopics(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load topics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTopics();
  }, []);

  function goToProposal(topicId, topicTitle) {
    navigate(`/student/proposal?topicId=${topicId}&topicTitle=${encodeURIComponent(topicTitle)}`);
  }

  async function handleSuggest(e) {
    e.preventDefault();
    if (!idea.trim()) return;
    setSuggesting(true);
    try {
      const data = await suggestTopics(idea);
      setSuggestions(data);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleProposeNewTopic(e) {
    e.preventDefault();
    setProposeError('');
    if (!newTitle.trim()) {
      setProposeError('Title is required.');
      return;
    }
    setProposing(true);
    try {
      const created = await proposeTopic(newTitle, newDescription);
      const topMatch = created.duplicate_check?.matches?.[0];

      if (created.status === 'duplicate') {
        setProposeError(
          `This topic was flagged as a duplicate of an existing one` +
            (topMatch ? ` (similarity ${Math.round(topMatch.similarity * 100)}%).` : '.')
        );
        return;
      }
      if (created.status === 'pending') {
        setProposeError(
          `This topic looks similar to an existing one` +
            (topMatch ? ` (similarity ${Math.round(topMatch.similarity * 100)}%)` : '') +
            ` and needs coordinator review before it can be selected.`
        );
        return;
      }
      goToProposal(created.topic_id, created.title);
    } catch (err) {
      setProposeError(err.response?.data?.message || 'Failed to propose topic.');
    } finally {
      setProposing(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Browse Topics</h1>
      <p className="text-sm text-slate-500 mb-6">
        Pick an existing available topic, search by rough idea, or propose a brand-new one.
      </p>

      <form onSubmit={handleSuggest} className="mb-6 flex gap-2">
        <input
          type="text"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe a rough idea, e.g. 'AI in education'"
          className={`${INPUT_CLASS} flex-1`}
        />
        <Button type="submit" disabled={suggesting}>
          {suggesting ? 'Searching…' : 'Suggest'}
        </Button>
      </form>

      {suggestions !== null && (
        <div className="mb-8">
          <h2 className="font-medium text-slate-900 mb-2">
            {suggestions.length === 0 ? 'No matching topics found.' : 'Suggested topics'}
          </h2>
          <div className="space-y-2">
            {suggestions.map((t) => (
              <TopicRow key={t.topic_id} topic={t} onSelect={goToProposal} />
            ))}
          </div>
        </div>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Available topics</h2>
      {loading && <p className="text-sm text-slate-400 mb-6">Loading…</p>}
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}
      {!loading && !error && topics.length === 0 && (
        <p className="text-sm text-slate-400 mb-6">No available topics right now — propose one below.</p>
      )}
      {topics.length > 0 && (
        <div className="space-y-2 mb-8">
          {topics.map((t) => (
            <TopicRow key={t.topic_id} topic={t} onSelect={goToProposal} />
          ))}
        </div>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Propose a new topic</h2>
      <Card className="p-5">
        <form onSubmit={handleProposeNewTopic} className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="newTitle">
              Title
            </label>
            <input
              id="newTitle"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="newDescription">
              Description
            </label>
            <textarea
              id="newDescription"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className={INPUT_CLASS}
              rows={3}
            />
          </div>
          {proposeError && <Alert variant="error">{proposeError}</Alert>}
          <Button type="submit" disabled={proposing}>
            {proposing ? 'Checking…' : 'Propose topic'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
