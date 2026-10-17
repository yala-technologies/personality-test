import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Search } from 'lucide-react';
import { adminListCandidates, adminCreateCandidate, adminSetHidden } from '../lib/api';
import { getSession, clearSession } from '../lib/auth';
import type { Candidate } from '../lib/types';
import { CandidateTable } from '../components/CandidateTable';
import { CreateCandidateModal } from '../components/CreateCandidateModal';
import { CandidateDetailsModal } from '../components/CandidateDetailsModal';
import { OverviewCards } from '../components/OverviewCards';
import { BulkDownloadButton } from '../components/BulkDownloadButton';

type SortField = 'name' | 'email' | 'status' | 'created' | 'completed' | 'similarity';
type SortDirection = 'asc' | 'desc';
type ListView = 'results' | 'hidden';

export function AdminDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [listView, setListView] = useState<ListView>('results');
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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
    window.location.href = '/admin';
  }

  async function handleCreateCandidate(name: string, email?: string) {
    const session = getSession();
    if (!session) {
      navigate('/admin', { replace: true });
      return;
    }

    try {
      const result = await adminCreateCandidate(session.token, name, email);
      setCandidates([result.candidate, ...candidates]);
      setShowCreateModal(false);
      
      // Show invitation status feedback
      if (result.invitation.attempted) {
        if (result.invitation.sent) {
          alert(`✅ Candidate created successfully!\n\nInvitation email sent to ${result.invitation.email}`);
        } else {
          alert(`⚠️ Candidate created, but invitation email failed to send.\n\nError: ${result.invitation.error}\n\nYou can copy the assessment link from the candidate details.`);
        }
      } else if (!email) {
        alert(`✅ Candidate created successfully!\n\nNo email provided. Copy and send the assessment link manually from the candidate details.`);
      }
      
      setSelectedCandidate(result.candidate);
    } catch (err) {
      throw err;
    }
  }

  async function handleToggleHidden(candidate: Candidate) {
    const session = getSession();
    if (!session) {
      navigate('/admin', { replace: true });
      return;
    }

    try {
      setHidingId(candidate.id);
      const updated = await adminSetHidden(session.token, candidate.id, !candidate.hidden);
      setCandidates((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedCandidate((current) => (current?.id === updated.id ? null : current));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setHidingId(null);
    }
  }

  const hiddenCount = candidates.filter((candidate) => candidate.hidden).length;

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    const matchesView = listView === 'hidden' ? Boolean(candidate.hidden) : !candidate.hidden;

    return matchesSearch && matchesStatus && matchesView;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  // Sort candidates
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'email':
        comparison = (a.email || '').localeCompare(b.email || '');
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'created':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'completed':
        const aCompleted = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bCompleted = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        comparison = aCompleted - bCompleted;
        break;
      case 'similarity':
        const aSimilarity = a.similarity_score ?? -1;
        const bSimilarity = b.similarity_score ?? -1;
        comparison = aSimilarity - bSimilarity;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-white border-b-2 border-yala-green/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/yala-logo.svg" 
                alt="Yala" 
                className="h-10 w-auto"
              />
              <div className="border-l-2 border-yala-green/10 pl-4">
                <h1 className="text-3xl font-bold text-yala-green">Hiring</h1>
                <p className="text-sm text-yala-green/70 font-medium mt-1">BDR Personality Assessment</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 text-sm text-yala-green hover:text-yala-white hover:bg-yala-green rounded-xl transition-all font-medium"
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
            <img 
              src="/assets/yala-star.svg" 
              alt="Loading" 
              className="inline-block h-16 w-16 animate-spin mx-auto"
            />
            <p className="mt-4 text-yala-green font-medium">Loading candidates...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700">
            {error}
          </div>
        ) : (
          <>
            <OverviewCards candidates={candidates} />

            <div className="bg-white rounded-2xl shadow-lg border-2 border-yala-green/5 mt-6">
              <div className="px-6 pt-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setListView('results')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    listView === 'results'
                      ? 'bg-yala-green text-yala-lime'
                      : 'text-yala-green hover:bg-yala-lime-soft'
                  }`}
                >
                  Results
                </button>
                <button
                  type="button"
                  onClick={() => setListView('hidden')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    listView === 'hidden'
                      ? 'bg-yala-green text-yala-lime'
                      : 'text-yala-green hover:bg-yala-lime-soft'
                  }`}
                >
                  Hidden
                  <span
                    className={`inline-flex min-w-6 justify-center rounded-lg px-1.5 py-0.5 text-xs ${
                      listView === 'hidden' ? 'bg-yala-lime text-yala-green' : 'bg-yala-lime-soft text-yala-green'
                    }`}
                  >
                    {hiddenCount}
                  </span>
                </button>
              </div>

              <div className="p-6 border-b-2 border-yala-green/5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-yala-green/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yala-lime focus:border-yala-green transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-3 bg-white border-2 border-yala-green/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yala-lime focus:border-yala-green transition-all font-medium text-yala-green"
                    >
                      <option value="all">All statuses</option>
                      <option value="invited">Invited</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>

                    <BulkDownloadButton candidates={filteredCandidates} />

                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-yala-green text-yala-lime rounded-xl font-semibold hover:bg-yala-green/90 focus:outline-none focus:ring-2 focus:ring-yala-lime focus:ring-offset-2 transition-all transform hover:scale-105"
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
                onToggleHidden={handleToggleHidden}
                hidingId={hidingId}
                emptyMessage={
                  listView === 'hidden'
                    ? 'No hidden results. Hide a candidate to move them here.'
                    : candidates.length > 0 && hiddenCount === candidates.length
                      ? 'All results are hidden. Open the Hidden tab to restore them.'
                      : 'No candidates found. Create your first candidate to get started.'
                }
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
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
          hiding={hidingId === selectedCandidate.id}
          onClose={() => setSelectedCandidate(null)}
          onToggleHidden={handleToggleHidden}
        />
      )}
    </div>
  );
}
