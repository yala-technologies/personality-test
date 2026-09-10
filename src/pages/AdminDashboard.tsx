import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Search } from 'lucide-react';
import { adminListCandidates, adminCreateCandidate } from '../lib/api';
import { getSession, clearSession } from '../lib/auth';
import type { Candidate } from '../lib/types';
import { CandidateTable } from '../components/CandidateTable';
import { CreateCandidateModal } from '../components/CreateCandidateModal';
import { CandidateDetailsModal } from '../components/CandidateDetailsModal';
import { OverviewCards } from '../components/OverviewCards';

export function AdminDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCandidates();
  }, []);

  async function loadCandidates() {
    const session = getSession();
    if (!session) {
      navigate('/admin', { replace: true });
      return;
    }

    try {
      setLoading(true);
      const data = await adminListCandidates(session.token);
      setCandidates(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate('/admin', { replace: true });
  }

  async function handleCreateCandidate(name: string, email?: string) {
    const session = getSession();
    if (!session) {
      navigate('/admin', { replace: true });
      return;
    }

    try {
      const newCandidate = await adminCreateCandidate(session.token, name, email);
      setCandidates([newCandidate, ...candidates]);
      setShowCreateModal(false);
      setSelectedCandidate(newCandidate);
    } catch (err) {
      throw err;
    }
  }

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort: benchmark first, then by similarity (descending), then by created date (descending)
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (a.is_benchmark) return -1;
    if (b.is_benchmark) return 1;

    if (a.similarity_score !== null && b.similarity_score !== null) {
      return b.similarity_score - a.similarity_score;
    }
    if (a.similarity_score !== null) return -1;
    if (b.similarity_score !== null) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Yala Hiring</h1>
              <p className="text-sm text-gray-600">BDR Personality Assessment</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading candidates...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : (
          <>
            <OverviewCards candidates={candidates} />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="all">All statuses</option>
                      <option value="invited">Invited</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>

                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create candidate
                    </button>
                  </div>
                </div>
              </div>

              <CandidateTable
                candidates={sortedCandidates}
                onSelectCandidate={setSelectedCandidate}
              />
            </div>
          </>
        )}
      </main>

      {showCreateModal && (
        <CreateCandidateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCandidate}
        />
      )}

      {selectedCandidate && (
        <CandidateDetailsModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdate={(updated) => {
            setCandidates(
              candidates.map((c) => (c.id === updated.id ? updated : c))
            );
            setSelectedCandidate(updated);
          }}
        />
      )}
    </div>
  );
}
