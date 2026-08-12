import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProject, listMilestones, listFeedback, listDocuments } from '../../services/projectsService';
import { uploadProjectDocument } from '../../services/proposalsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { StageBadge, MILESTONE_TONE } from '../../components/ui/Badge';
import Badge from '../../components/ui/Badge';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

const DOC_TYPES = ['proposal', 'chapter', 'final'];

export default function ProgressPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [docType, setDocType] = useState('chapter');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  async function loadAll() {
    const [p, m, f, d] = await Promise.all([
      getProject(projectId),
      listMilestones(projectId),
      listFeedback(projectId),
      listDocuments(projectId),
    ]);
    setProject(p);
    setMilestones(m);
    setFeedback(f);
    setDocuments(d);
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.response?.data?.message || 'Failed to load project.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleUpload(e) {
    e.preventDefault();
    setError('');
    setUploadMessage('');
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadProjectDocument(projectId, file, docType);
      setFile(null);
      e.target.reset();
      let msg = `${docType} v${result.version} uploaded.`;
      if (result.plagiarism_check) {
        msg += ` Plagiarism risk: ${result.plagiarism_check.risk_band} (${Math.round(result.plagiarism_check.risk_score * 100)}%).`;
      }
      setUploadMessage(msg);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }

  if (error && !project) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!project) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
        <StageBadge stage={project.stage} />
      </div>
      <Card className="p-4 mb-6 space-y-1">
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
        {!project.predicted_deadline && (project.plagiarism_score === null || project.plagiarism_score === undefined) && (
          <p className="text-sm text-slate-400">No predictions yet.</p>
        )}
      </Card>

      <h2 className="font-medium text-slate-900 mb-2">Milestones</h2>
      <div className="space-y-2 mb-8">
        {milestones.map((m) => (
          <Card key={m.milestone_id} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-slate-900">{m.name}</span>
              <Badge tone={MILESTONE_TONE[m.status]}>{m.status}</Badge>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${m.progress_percent}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      <h2 className="font-medium text-slate-900 mb-2">Documents</h2>
      {documents.length === 0 && <p className="text-sm text-slate-400 mb-4">No documents uploaded yet.</p>}
      {documents.length > 0 && (
        <div className="space-y-2 mb-4">
          {documents.map((d) => (
            <Card key={d.document_id} className="p-3 flex justify-between items-center">
              <span className="text-sm text-slate-800 capitalize">{d.doc_type}</span>
              <span className="text-sm text-slate-500">v{d.version}</span>
              <span className="text-xs text-slate-400">{new Date(d.uploaded_at).toLocaleDateString()}</span>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}
      {uploadMessage && (
        <Alert variant="success" className="mb-4">
          {uploadMessage}
        </Alert>
      )}

      <Card className="p-5 mb-8">
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className={LABEL_CLASS} htmlFor="docType">
              Document type
            </label>
            <select
              id="docType"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className={INPUT_CLASS}
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="docFile">
              File (PDF or Word)
            </label>
            <input
              id="docFile"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
        </form>
      </Card>

      <h2 className="font-medium text-slate-900 mb-2">Feedback</h2>
      {feedback.length === 0 && <p className="text-sm text-slate-400">No feedback yet.</p>}
      <div className="space-y-2">
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
    </div>
  );
}
