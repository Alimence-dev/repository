import { useEffect, useState } from 'react';
import { getStats } from '../../services/reportsService';
import Card from '../../components/ui/Card';
import BarChart from '../../components/ui/BarChart';
import Alert from '../../components/ui/Alert';

// Color choices reuse the same semantic tones as the Badge component elsewhere in the
// app (green = good/approved, amber = warning/pending, red = critical/high-risk), so a
// color means the same thing on a chart as it does on a status pill.
const TOPIC_COLORS = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-slate-400'];
const DEFENSE_COLORS = ['bg-indigo-500', 'bg-emerald-500'];
const RISK_COLORS = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500'];

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="p-5">
      <h2 className="font-medium text-slate-900 mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      {children}
    </Card>
  );
}

function isEmpty(data) {
  return data.every((d) => d.count === 0);
}

export default function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load statistics.'));
  }, []);

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!stats) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Statistics</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title="Projects by Stage" subtitle="All projects, current lifecycle stage">
          <BarChart data={stats.projectsByStage} colorClass="bg-indigo-500" />
        </ChartCard>

        <ChartCard title="Topics by Status" subtitle="Outcome of the AI duplicate-check on every proposed topic">
          <BarChart data={stats.topicsByStatus} barColors={TOPIC_COLORS} />
        </ChartCard>

        <ChartCard title="Defense Status" subtitle="Scheduled vs. completed defenses">
          {isEmpty(stats.defenseByStatus) ? (
            <p className="text-sm text-slate-400">No defenses scheduled yet.</p>
          ) : (
            <BarChart data={stats.defenseByStatus} barColors={DEFENSE_COLORS} />
          )}
        </ChartCard>

        <ChartCard title="Plagiarism Risk" subtitle="Latest chapter/final upload per project, where checked">
          {isEmpty(stats.plagiarismRiskBands) ? (
            <p className="text-sm text-slate-400">No chapter/final documents checked yet.</p>
          ) : (
            <BarChart data={stats.plagiarismRiskBands} barColors={RISK_COLORS} />
          )}
        </ChartCard>

        <ChartCard title="Supervisor Workload" subtitle="Active project count per allocated supervisor">
          {stats.supervisorWorkload.length === 0 ? (
            <p className="text-sm text-slate-400">No supervisors allocated yet.</p>
          ) : (
            <BarChart data={stats.supervisorWorkload} colorClass="bg-indigo-500" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
