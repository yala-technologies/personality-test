import { useState } from 'react';
import { X, Copy, Check, Star, AlertCircle } from 'lucide-react';
import type { Candidate } from '../lib/types';
import { formatDate, formatDateTime, formatDuration, copyToClipboard } from '../lib/utils';
import { adminSetBenchmark } from '../lib/api';
import { getSession } from '../lib/auth';
import { TraitVisualization } from './TraitVisualization';

interface Props {
  candidate: Candidate;
  onClose: () => void;
  onUpdate?: (candidate: Candidate) => void;
}

export function CandidateDetailsModal({ candidate, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [settingBenchmark, setSettingBenchmark] = useState(false);

  const assessmentUrl = `${window.location.origin}/assessment/${candidate.access_token}`;

  async function handleCopy() {
    try {
      await copyToClipboard(assessmentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  }

  async function handleSetBenchmark() {
    const session = getSession();
    if (!session) return;

    const confirmed = window.confirm(
      `Set ${candidate.name} as the benchmark? This will recalculate similarities for all completed candidates.`
    );

    if (!confirmed) return;

    try {
      setSettingBenchmark(true);
      await adminSetBenchmark(session.token, candidate.id);
      
      // Reload to get updated data
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set benchmark');
      setSettingBenchmark(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      invited: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
    };

    const labels = {
      invited: 'Invited',
      in_progress: 'In progress',
      completed: 'Completed',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{candidate.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(candidate.status)}
              {candidate.is_benchmark && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                  Benchmark
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Email:</span>
              <p className="font-medium text-gray-900">{candidate.email || '—'}</p>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <p className="font-medium text-gray-900">{formatDate(candidate.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-600">Started:</span>
              <p className="font-medium text-gray-900">{formatDateTime(candidate.started_at)}</p>
            </div>
            <div>
              <span className="text-gray-600">Completed:</span>
              <p className="font-medium text-gray-900">{formatDateTime(candidate.completed_at)}</p>
            </div>
          </div>

          {/* Assessment Link */}
          {candidate.status !== 'completed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assessmentUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Scores and Visualization */}
          {candidate.status === 'completed' && candidate.scores && (
            <>
              {candidate.similarity_score !== null && !candidate.is_benchmark && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Star className="w-5 h-5" />
                    <span className="font-medium">
                      {candidate.similarity_score.toFixed(1)}% similarity to benchmark
                    </span>
                  </div>
                </div>
              )}

              <TraitVisualization candidate={candidate} />

              {/* Quality Signals */}
              {candidate.quality_signals && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Response quality</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <p className="font-medium text-gray-900">
                        {candidate.quality_signals.status}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Duration:</span>
                      <p className="font-medium text-gray-900">
                        {formatDuration(candidate.assessment_duration_seconds)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Consistency:</span>
                      <p className="font-medium text-gray-900">
                        {candidate.quality_signals.consistencyScore}%
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Straight-line rate:</span>
                      <p className="font-medium text-gray-900">
                        {candidate.quality_signals.straightLineRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {candidate.quality_signals.flags.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800 mb-1">Review flags:</p>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {candidate.quality_signals.flags.map((flag, i) => (
                              <li key={i}>• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Set as Benchmark */}
              {!candidate.is_benchmark && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={handleSetBenchmark}
                    disabled={settingBenchmark}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    {settingBenchmark ? 'Setting...' : 'Set as benchmark'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    This will recalculate similarities for all completed candidates.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
