import { useState } from 'react';
import { X, Copy, Check, Star, AlertCircle, Download, ChevronDown } from 'lucide-react';
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
  const [showFormatMenu, setShowFormatMenu] = useState(false);

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

  function generateCSV(): string {
    const rows: string[][] = [];
    
    // Header
    rows.push(['Field', 'Value']);
    
    // Candidate info
    rows.push(['Name', capitalizeName(candidate.name)]);
    rows.push(['Email', candidate.email || 'Not provided']);
    rows.push(['Status', candidate.status]);
    rows.push(['Created', formatDate(candidate.created_at)]);
    rows.push(['Started', formatDate(candidate.started_at)]);
    rows.push(['Completed', formatDate(candidate.completed_at)]);
    if (candidate.assessment_duration_seconds) {
      rows.push(['Duration', formatDuration(candidate.assessment_duration_seconds)]);
    }
    rows.push(['Assessment Version', candidate.assessment_version || 'V1']);
    rows.push(['Is Benchmark', candidate.is_benchmark ? 'Yes' : 'No']);
    rows.push(['']);
    
    // Trait scores
    if (candidate.scores) {
      rows.push(['Trait Scores', '']);
      Object.entries(candidate.scores).forEach(([trait, score]) => {
        const label = TRAIT_LABELS[trait as keyof typeof TRAIT_LABELS];
        rows.push([label, score.toFixed(1)]);
      });
      rows.push(['']);
    }
    
    // Benchmark comparison
    if (candidate.similarity_score !== null && !candidate.is_benchmark) {
      rows.push(['Benchmark Similarity', candidate.similarity_score.toFixed(1) + '%']);
      rows.push(['']);
    }
    
    // Quality signals
    if (candidate.quality_signals) {
      rows.push(['Response Quality', '']);
      rows.push(['Status', candidate.quality_signals.status]);
      rows.push(['Straight-line Rate', (candidate.quality_signals.straightLineRate * 100).toFixed(1) + '%']);
      rows.push(['Consistency Score', candidate.quality_signals.consistencyScore.toFixed(2)]);
      if (candidate.quality_signals.durationSeconds) {
        rows.push(['Duration', formatDuration(candidate.quality_signals.durationSeconds)]);
      }
      if (candidate.quality_signals.flags.length > 0) {
        rows.push(['Flags', candidate.quality_signals.flags.join('; ')]);
      }
    }
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  function generateJSON(): string {
    const data = {
      name: capitalizeName(candidate.name),
      email: candidate.email || null,
      status: candidate.status,
      isBenchmark: candidate.is_benchmark,
      dates: {
        created: candidate.created_at,
        started: candidate.started_at,
        completed: candidate.completed_at,
      },
      duration: candidate.assessment_duration_seconds ? formatDuration(candidate.assessment_duration_seconds) : null,
      assessmentVersion: candidate.assessment_version || 'V1',
      traitScores: candidate.scores ? Object.entries(candidate.scores).reduce((acc, [trait, score]) => {
        acc[TRAIT_LABELS[trait as keyof typeof TRAIT_LABELS]] = Number(score.toFixed(1));
        return acc;
      }, {} as Record<string, number>) : null,
      benchmarkSimilarity: candidate.is_benchmark ? null : candidate.similarity_score,
      qualitySignals: candidate.quality_signals ? {
        status: candidate.quality_signals.status,
        straightLineRate: Number((candidate.quality_signals.straightLineRate * 100).toFixed(1)),
        consistencyScore: Number(candidate.quality_signals.consistencyScore.toFixed(2)),
        duration: candidate.quality_signals.durationSeconds ? formatDuration(candidate.quality_signals.durationSeconds) : null,
        flags: candidate.quality_signals.flags,
      } : null,
      generatedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  function generatePDF(): string {
    // Generate HTML for PDF
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${capitalizeName(candidate.name)} - Assessment Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
    h1 { color: #053321; border-bottom: 3px solid #a1e55e; padding-bottom: 10px; }
    h2 { color: #053321; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: bold; }
    .benchmark-badge { background: #a1e55e; color: #053321; padding: 5px 10px; border-radius: 5px; font-weight: bold; display: inline-block; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 12px; color: #666; }
    .trait-score { display: flex; align-items: center; margin: 10px 0; }
    .trait-label { flex: 0 0 300px; }
    .trait-value { font-weight: bold; color: #053321; }
  </style>
</head>
<body>
  <h1>${capitalizeName(candidate.name)}</h1>
  ${candidate.is_benchmark ? '<p><span class="benchmark-badge">⭐ Benchmark Candidate</span></p>' : ''}
  
  <h2>Candidate Information</h2>
  <table>
    <tr><th>Email</th><td>${candidate.email || 'Not provided'}</td></tr>
    <tr><th>Status</th><td>${candidate.status}</td></tr>
    <tr><th>Created</th><td>${formatDate(candidate.created_at)}</td></tr>
    <tr><th>Started</th><td>${formatDate(candidate.started_at)}</td></tr>
    <tr><th>Completed</th><td>${formatDate(candidate.completed_at)}</td></tr>
    ${candidate.assessment_duration_seconds ? `<tr><th>Duration</th><td>${formatDuration(candidate.assessment_duration_seconds)}</td></tr>` : ''}
    <tr><th>Assessment Version</th><td>${candidate.assessment_version || 'V1'}</td></tr>
  </table>
`;

    if (candidate.scores) {
      html += '<h2>Trait Scores</h2><table>';
      Object.entries(candidate.scores).forEach(([trait, score]) => {
        const label = TRAIT_LABELS[trait as keyof typeof TRAIT_LABELS];
        html += `<tr><td>${label}</td><td class="trait-value">${score.toFixed(1)}</td></tr>`;
      });
      html += '</table>';
    }

    if (candidate.similarity_score !== null && !candidate.is_benchmark) {
      html += `<h2>Benchmark Comparison</h2><p><strong>Overall Similarity:</strong> ${candidate.similarity_score.toFixed(1)}%</p>`;
    }

    if (candidate.quality_signals) {
      html += '<h2>Response Quality</h2><table>';
      html += `<tr><th>Status</th><td>${candidate.quality_signals.status}</td></tr>`;
      html += `<tr><th>Straight-line Rate</th><td>${(candidate.quality_signals.straightLineRate * 100).toFixed(1)}%</td></tr>`;
      html += `<tr><th>Consistency Score</th><td>${candidate.quality_signals.consistencyScore.toFixed(2)}</td></tr>`;
      if (candidate.quality_signals.durationSeconds) {
        html += `<tr><th>Duration</th><td>${formatDuration(candidate.quality_signals.durationSeconds)}</td></tr>`;
      }
      if (candidate.quality_signals.flags.length > 0) {
        html += `<tr><th>Flags</th><td>${candidate.quality_signals.flags.join(', ')}</td></tr>`;
      }
      html += '</table>';
    }

    html += `
  <div class="footer">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Source:</strong> Yala Big 5 Personality Assessment Portal</p>
  </div>
</body>
</html>`;

    return html;
  }

  function downloadFile(format: 'markdown' | 'csv' | 'json' | 'pdf') {
    const fileName = candidate.name.replace(/\s+/g, '_');
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'markdown':
        content = generateMarkdown();
        mimeType = 'text/markdown';
        extension = 'md';
        break;
      case 'csv':
        content = generateCSV();
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        content = generateJSON();
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'pdf':
        content = generatePDF();
        mimeType = 'text/html';
        extension = 'html'; // HTML that can be printed to PDF
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_assessment.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowFormatMenu(false);
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
            <div className="relative">
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-yala-green hover:bg-yala-lime-soft rounded-xl transition-all font-medium"
              >
                <Download className="w-4 h-4" />
                Download
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showFormatMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border-2 border-yala-green/10 py-2 z-10">
                  <button
                    onClick={() => downloadFile('markdown')}
                    className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => downloadFile('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
                  >
                    CSV (.csv)
                  </button>
                  <button
                    onClick={() => downloadFile('json')}
                    className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
                  >
                    JSON (.json)
                  </button>
                  <button
                    onClick={() => downloadFile('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
                  >
                    PDF/HTML (.html)
                  </button>
                </div>
              )}
            </div>
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
