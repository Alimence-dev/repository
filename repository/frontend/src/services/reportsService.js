import api from './api';

async function downloadReport(path, filename) {
  const response = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadProjectsReport(format) {
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  await downloadReport(`/reports/projects?format=${format}`, `projects-report.${ext}`);
}

export async function downloadDefenseReport(format) {
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  await downloadReport(`/reports/defense?format=${format}`, `defense-report.${ext}`);
}

export async function getStats() {
  const { data } = await api.get('/reports/stats');
  return data;
}
