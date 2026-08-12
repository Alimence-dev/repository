import { useState } from 'react';
import { downloadProjectsReport, downloadDefenseReport } from '../../services/reportsService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function ReportCard({ title, description, onDownload }) {
  const [downloading, setDownloading] = useState('');

  async function handle(format) {
    setDownloading(format);
    try {
      await onDownload(format);
    } finally {
      setDownloading('');
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-medium text-slate-900 mb-1">{title}</h2>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      <div className="flex gap-3">
        <Button variant="secondary" disabled={downloading === 'excel'} onClick={() => handle('excel')}>
          {downloading === 'excel' ? 'Downloading…' : 'Download Excel'}
        </Button>
        <Button variant="secondary" disabled={downloading === 'pdf'} onClick={() => handle('pdf')}>
          {downloading === 'pdf' ? 'Downloading…' : 'Download PDF'}
        </Button>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Reports</h1>

      <div className="space-y-4">
        <ReportCard
          title="Project Status Report"
          description="Every project with its student, supervisor, stage, and plagiarism/deadline data."
          onDownload={downloadProjectsReport}
        />
        <ReportCard
          title="Defense Schedule & Results Report"
          description="All scheduled and completed defenses with rooms, dates, and results."
          onDownload={downloadDefenseReport}
        />
      </div>
    </div>
  );
}
