'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, FileText } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  };

  const highlight = (text: string, q: string) => {
    if (!q || !text) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? `<mark class="bg-yellow-500/30 text-yellow-300 rounded px-0.5">${part}</mark>`
        : part
    ).join('');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Full-Text Search</h1>
      <p className="text-gray-400 mb-6">Search across all lease documents for any clause or term</p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for any term, clause, or condition..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
        </button>
      </form>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">No results found for &quot;{query}&quot;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-4">{results.length} lease{results.length !== 1 ? 's' : ''} found</p>
          <div className="space-y-4">
            {results.map(r => (
              <Link
                key={r.id}
                href={`/leases/${r.id}`}
                className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <FileText className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">{r.propertyAddress || r.fileName}</p>
                    {r.tenantName && <p className="text-sm text-gray-400">{r.tenantName}</p>}
                  </div>
                </div>
                {r.snippet && (
                  <p
                    className="text-sm text-gray-400 leading-relaxed font-mono bg-gray-800 rounded p-3 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: `...${highlight(r.snippet, query)}...` }}
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
