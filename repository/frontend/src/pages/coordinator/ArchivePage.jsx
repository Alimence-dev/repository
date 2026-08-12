import { useEffect, useState } from 'react';
import { listProjects } from '../../services/projectsService';
import { archiveProject, searchRepository } from '../../services/repositoryService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

export default function ArchivePage() {
  const [candidates, setCandidates] = useState(null);
  const [listError, setListError] = useState('');

  const [projectId, setProjectId] = useState('');
  const [keywords, setKeywords] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadCandidates() {
    try {
      const [completedProjects, archived] = await Promise.all([
        listProjects({ stage: 'completed' }),
        searchRepository({}),
      ]);
      const archivedIds = new Set(archived.map((r) => r.project_id));
      setCandidates(completedProjects.filter((p) => !archivedIds.has(p.project_id)));
    } catch (err) {
      setListError(err.response?.data?.message || 'Failed to load completed projects.');
    }
  }

  useEffect(() => {
    loadCandidates();
  }, []);

  function selectProject(id) {
    setProjectId(String(id));
    setError('');
    setResult(null);
  }

  async function handleArchive(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const data = await archiveProject(projectId, keywords || undefined);
      setResult(data);
      setProjectId('');
      setKeywords('');
      await loadCandidates();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive project.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Archive Completed Project</h1>
      <p className="text-sm text-slate-500 mb-6">
        A project must be in the &quot;completed&quot; stage with a final document uploaded before it can be archived.
      </p>

      {listError && (
        <Alert variant="error" className="mb-4">
          {listError}
        </Alert>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Ready to archive</h2>
      {candidates === null && <p className="text-sm text-slate-400 mb-6">Loading…</p>}
      {candidates && candidates.length === 0 && (
        <p className="text-sm text-slate-400 mb-6">No completed projects awaiting archiving.</p>
      )}
      {candidates && candidates.length > 0 && (
        <div className="space-y-2 mb-8">
          {candidates.map((p) => (
            <Card key={p.project_id} className="p-3 flex justify-between items-center gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{p.title}</p>
                <p className="text-xs text-slate-500">{p.student_name}</p>
              </div>
              <Button variant="secondary" className="shrink-0" onClick={() => selectProject(p.project_id)}>
                Select
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5">
        <form onSubmit={handleArchive} className="space-y-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="projectId">
              Project ID
            </label>
            <input
              id="projectId"
              type="number"
              min="1"
              step="1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="keywords">
              Keywords (optional — defaults to the topic description)
            </label>
            <input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          {result && <Alert variant="success">Archived as repository entry #{result.repository_id}.</Alert>}
          <Button type="submit" disabled={submitting || !projectId}>
            {submitting ? 'Archiving…' : 'Archive'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
