import { useEffect, useState } from 'react';
import { listProjects } from '../../services/projectsService';
import { listDefenses, scheduleDefense, getDefense, recordDefenseResult } from '../../services/defenseService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge, { DEFENSE_TONE } from '../../components/ui/Badge';
import { INPUT_CLASS, LABEL_CLASS } from '../../components/ui/input';

export default function DefenseSchedulingPage() {
  const [readyProjects, setReadyProjects] = useState(null);
  const [defenses, setDefenses] = useState(null);
  const [listError, setListError] = useState('');

  const [projectId, setProjectId] = useState('');
  const [room, setRoom] = useState('');
  const [panelMembers, setPanelMembers] = useState('');
  const [dates, setDates] = useState(['', '', '']);
  const [schedule, setSchedule] = useState(null);
  const [looked, setLooked] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [looking, setLooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadLists() {
    try {
      const [defenseStageProjects, allDefenses] = await Promise.all([
        listProjects({ stage: 'defense' }),
        listDefenses(),
      ]);
      const scheduledProjectIds = new Set(allDefenses.map((d) => d.project_id));
      setReadyProjects(defenseStageProjects.filter((p) => !scheduledProjectIds.has(p.project_id)));
      setDefenses(allDefenses);
    } catch (err) {
      setListError(err.response?.data?.message || 'Failed to load defense lists.');
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  async function lookupProject(id) {
    setError('');
    setMessage('');
    setLooking(true);
    setProjectId(String(id));
    try {
      const data = await getDefense(id);
      setSchedule(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setSchedule(null);
      } else {
        setError(err.response?.data?.message || 'Failed to look up defense.');
      }
    } finally {
      setLooked(true);
      setLooking(false);
    }
  }

  async function handleLookupSubmit(e) {
    e.preventDefault();
    if (projectId) await lookupProject(projectId);
  }

  async function handleSchedule(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const panelIds = panelMembers
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
      const candidateDates = dates.filter(Boolean);
      const data = await scheduleDefense(projectId, panelIds, room, candidateDates);
      setSchedule(data);
      setMessage('Defense scheduled.');
      await loadLists();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule defense.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordResult(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const data = await recordDefenseResult(schedule.defense_id, resultText);
      setSchedule((prev) => ({ ...prev, ...data }));
      setMessage('Result recorded.');
      await loadLists();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record result.');
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Defense Scheduling</h1>

      {listError && (
        <Alert variant="error" className="mb-4">
          {listError}
        </Alert>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Ready to schedule</h2>
      {readyProjects === null && <p className="text-sm text-slate-400 mb-6">Loading…</p>}
      {readyProjects && readyProjects.length === 0 && (
        <p className="text-sm text-slate-400 mb-6">No projects are currently ready for defense scheduling.</p>
      )}
      {readyProjects && readyProjects.length > 0 && (
        <div className="space-y-2 mb-6">
          {readyProjects.map((p) => (
            <Card key={p.project_id} className="p-3 flex justify-between items-center gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{p.title}</p>
                <p className="text-xs text-slate-500">{p.student_name}</p>
              </div>
              <Button variant="secondary" className="shrink-0" onClick={() => lookupProject(p.project_id)}>
                Schedule
              </Button>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Scheduled &amp; completed defenses</h2>
      {defenses === null && <p className="text-sm text-slate-400 mb-6">Loading…</p>}
      {defenses && defenses.length === 0 && <p className="text-sm text-slate-400 mb-6">No defenses yet.</p>}
      {defenses && defenses.length > 0 && (
        <div className="space-y-2 mb-8">
          {defenses.map((d) => (
            <Card key={d.defense_id} className="p-3 flex justify-between items-center gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{d.title}</p>
                <p className="text-xs text-slate-500">
                  {d.student_name} — {new Date(d.scheduled_date).toLocaleDateString()} — {d.room}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge tone={DEFENSE_TONE[d.status]}>{d.status}</Badge>
                <Button variant="link" onClick={() => lookupProject(d.project_id)}>
                  Manage
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-medium text-slate-900 mb-2">Look up by project ID</h2>
      <form onSubmit={handleLookupSubmit} className="flex gap-2 mb-6">
        <input
          type="number"
          min="1"
          step="1"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Project ID"
          className={`${INPUT_CLASS} flex-1`}
        />
        <Button type="submit" disabled={looking || !projectId} variant="secondary">
          {looking ? 'Looking…' : 'Look up'}
        </Button>
      </form>

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

      {looked && schedule && (
        <Card className="p-5">
          <p className="font-medium text-slate-900 mb-1">
            Scheduled: {new Date(schedule.scheduled_date).toLocaleString()}
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <span>Room: {schedule.room}</span>
            <Badge tone={DEFENSE_TONE[schedule.status]}>{schedule.status}</Badge>
          </div>
          {schedule.result && <p className="text-sm text-slate-700 mb-3">Result: {schedule.result}</p>}
          {schedule.status !== 'completed' && (
            <form onSubmit={handleRecordResult} className="space-y-2">
              <input
                type="text"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Result (e.g. Pass, Pass with minor corrections)"
                className={INPUT_CLASS}
              />
              <Button type="submit">Record result</Button>
            </form>
          )}
        </Card>
      )}

      {looked && !schedule && (
        <Card className="p-5">
          <form onSubmit={handleSchedule} className="space-y-4">
            <p className="text-sm text-slate-500">No defense scheduled yet for project #{projectId}.</p>
            <div>
              <label className={LABEL_CLASS} htmlFor="room">
                Room
              </label>
              <input id="room" value={room} onChange={(e) => setRoom(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="panelMembers">
                Panel member user IDs (comma-separated)
              </label>
              <input
                id="panelMembers"
                value={panelMembers}
                onChange={(e) => setPanelMembers(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} id="candidateDatesLabel">
                Candidate dates/times (tried in order)
              </label>
              <div className="space-y-2">
                {dates.map((d, i) => (
                  <input
                    key={i}
                    type="datetime-local"
                    value={d}
                    onChange={(e) => {
                      const copy = [...dates];
                      copy[i] = e.target.value;
                      setDates(copy);
                    }}
                    className={INPUT_CLASS}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Scheduling…' : 'Schedule defense'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
