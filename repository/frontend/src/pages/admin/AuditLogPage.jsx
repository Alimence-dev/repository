import { useEffect, useState } from 'react';
import { getAuditLogs } from '../../services/usersService';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getAuditLogs();
        setLogs(data);
      } catch (err) {
        setError('Unable to load audit logs.');
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Audit Log</h1>
      {loading ? (
        <div className="text-slate-600">Loading activity...</div>
      ) : error ? (
        <div className="text-rose-600">{error}</div>
      ) : (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-slate-600">No audit activity found.</div>
          ) : (
            <div className="overflow-x-auto bg-white shadow-sm rounded-lg border border-slate-200">
              <table className="min-w-full text-left divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-sm font-medium">Actor</th>
                    <th className="px-4 py-3 text-sm font-medium">Action</th>
                    <th className="px-4 py-3 text-sm font-medium">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {logs.map((log) => (
                    <tr key={log.audit_id}>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.actor_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.entity_affected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
