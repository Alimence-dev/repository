import { useEffect, useMemo, useState } from 'react';
import { searchRepository } from '../../services/repositoryService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { INPUT_CLASS } from '../../components/ui/input';

export default function RepositorySearchPage() {
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [allEntries, setAllEntries] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    searchRepository({})
      .then((data) => {
        setAllEntries(data);
        setResults(data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load repository.'));
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    setSearching(true);
    try {
      const data = await searchRepository({
        q: q || undefined,
        department: department || undefined,
        year: year || undefined,
      });
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  // Filter option lists are derived from the full unfiltered set, so they don't shrink
  // to just the current results as the user narrows their search.
  const departments = useMemo(
    () => [...new Set((allEntries || []).map((r) => r.department).filter(Boolean))].sort(),
    [allEntries]
  );
  const years = useMemo(
    () => [...new Set((allEntries || []).map((r) => r.year).filter(Boolean))].sort((a, b) => b - a),
    [allEntries]
  );

  // Grouped by department, A-Z; titles A-Z within each department.
  const grouped = useMemo(() => {
    if (!results) return [];
    const byDept = new Map();
    for (const r of results) {
      const key = r.department || 'Unspecified';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key).push(r);
    }
    for (const entries of byDept.values()) {
      entries.sort((a, b) => a.title.localeCompare(b.title));
    }
    return [...byDept.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [results]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Research Repository</h1>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Keyword"
          className={`${INPUT_CLASS} flex-1 min-w-[150px]`}
        />
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`${INPUT_CLASS} w-44`}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={`${INPUT_CLASS} w-28`}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {results === null && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {results !== null && (
        <>
          <p className="text-sm text-slate-500 mb-4">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-6">
            {grouped.map(([deptName, entries]) => (
              <div key={deptName}>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  {deptName} <span className="text-slate-400 font-normal normal-case">({entries.length})</span>
                </h2>
                <div className="space-y-2">
                  {entries.map((r) => (
                    <Card key={r.repository_id} className="p-4">
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <p className="text-sm text-slate-500">{r.year}</p>
                      {r.keywords && <p className="text-xs text-slate-400 mt-1">{r.keywords}</p>}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
