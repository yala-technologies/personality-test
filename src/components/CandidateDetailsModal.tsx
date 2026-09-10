import { useState } from 'react';
import { X, Copy, Check, Star, AlertCircle, Download } from 'lucide-react';
import type { Candidate } from '../lib/types';
import { formatDate, formatDateTime, formatDuration, copyToClipboard, capitalizeName, TRAIT_LABELS } from '../lib/utils';
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

  function generateMarkdown(): string {
    const md: string[] = [];
    
    md.push(`# ${capitalizeName(candidate.name)}`);
    md.push('');
    md.push('## Candidate Information');
    md.push('');
    md.push(`- **Email:** ${candidate.email || 'Not provided'}`);
    md.push(`- **Status:** ${candidate.status}`);
    md.push(`- **Created:** ${formatDate(candidate.created_at)}`);
    md.push(`- **Started:** ${formatDate(candidate.started_at)}`);
    md.push(`- **Completed:** ${formatDate(candidate.completed_at)}`);
    if (candidate.assessment_duration_seconds) {
      md.push(`- **Duration:** ${formatDuration(candidate.assessment_duration_seconds)}`);
    }
    md.push(`- **Assessment Version:** ${candidate.assessment_version || 'V1'}`);
    md.push('');

    if (candidate.is_benchmark) {
      md.push('> **⭐ This candidate is the active benchmark**');
      md.push('');
    }

    if (candidate.scores) {
      md.push('## Trait Scores');
      md.push('');
      Object.entries(candidate.scores).forEach(([trait, score]) => {
        const label = TRAIT_LABELS[trait as keyof typeof TRAIT_LABELS];
        md.push(`- **${label}:** ${score.toFixed(1)}`);
      });
      md.push('');
    }

    if (candidate.similarity_score !== null && !candidate.is_benchmark) {
      md.push('## Benchmark Comparison');
      md.push('');
      md.push(`**Overall Similarity:** ${candidate.similarity_score.toFixed(1)}%`);
      md.push('');
    }

    if (candidate.quality_signals) {
      md.push('## Response Quality');
      md.push('');
      md.push(`- **Status:** ${candidate.quality_signals.status}`);
      md.push(`- **Straight-line Rate:** ${(candidate.quality_signals.straightLineRate * 100).toFixed(1)}%`);
      md.push(`- **Consistency Score:** ${candidate.quality_signals.consistencyScore.toFixed(2)}`);
      if (candidate.quality_signals.durationSeconds) {
        md.push(`- **Duration:** ${formatDuration(candidate.quality_signals.durationSeconds)}`);
      }
      if (candidate.quality_signals.flags.length > 0) {
        md.push('');
        md.push('**Flags:**');
        candidate.quality_signals.flags.forEach(flag => {
          md.push(`- ${flag}`);
        });
      }
      md.push('');
    }

    md.push('---');
    md.push('');
    md.push(`*Generated: ${new Date().toLocaleString()}*`);
    md.push(`*Source: Yala Big 5 Personality Assessment Portal*`);

    return md.join('\n');
  }

  function downloadMarkdown() {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidate.name.replace(/\s+/g, '_')}_assessment.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
      `Set ${capitalizeName(candidate.name)} as the benchmark? This will recalculate similarities for all completed candidates.`
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
            <h2 className="text-xl font-semibold text-gray-900">{capitalizeName(candidate.name)}</h2>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(candidate.status)}
              {candidate.is_benchmark && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yala-lime-soft text-yala-green">
                  Benchmark
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadMarkdown}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-yala-green hover:bg-yala-lime-soft rounded-xl transition-all font-medium"
              title="Download as Markdown"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                  className="flex items-center gap-2 px-4 py-2 bg-yala-green text-yala-lime rounded-xl hover:bg-yala-green/90 focus:outline-none focus:ring-2 focus:ring-yala-lime transition-colors font-medium"
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
                    className="flex items-center gap-2 px-4 py-2 bg-yala-green text-yala-lime rounded-xl hover:bg-yala-green/90 focus:outline-none focus:ring-2 focus:ring-yala-lime disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
