import { useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';
import type { Candidate } from '../lib/types';
import { formatDate, capitalizeName, formatDuration, TRAIT_LABELS } from '../lib/utils';

interface Props {
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
}

export function CandidateTable({ candidates, onSelectCandidate }: Props) {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No candidates found. Create your first candidate to get started.
      </div>
    );
  }

  function generateMarkdown(candidate: Candidate): string {
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

  function generateCSV(candidate: Candidate): string {
    const rows: string[][] = [['Field', 'Value']];
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
    if (candidate.scores) {
      rows.push(['Trait Scores', '']);
      Object.entries(candidate.scores).forEach(([trait, score]) => {
        const label = TRAIT_LABELS[trait as keyof typeof TRAIT_LABELS];
        rows.push([label, score.toFixed(1)]);
      });
      rows.push(['']);
    }
    if (candidate.similarity_score !== null && !candidate.is_benchmark) {
      rows.push(['Benchmark Similarity', candidate.similarity_score.toFixed(1) + '%']);
      rows.push(['']);
    }
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

  function generateJSON(candidate: Candidate): string {
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

  function generateHTML(candidate: Candidate): string {
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
  </table>`;
    if (candidate.scores) {
      html += '<h2>Trait Scores</h2><table>';
      Object.entries(candidate.scores).forEach(([trait, score]) => {
        const label = TRAIT_LABELS[trait as keyof typeof TRAIT_LABELS];
        html += `<tr><td>${label}</td><td style="font-weight:bold;color:#053321">${score.toFixed(1)}</td></tr>`;
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
    html += `<div class="footer"><p><strong>Generated:</strong> ${new Date().toLocaleString()}</p><p><strong>Source:</strong> Yala Big 5 Personality Assessment Portal</p></div></body></html>`;
    return html;
  }

  function downloadFile(candidate: Candidate, format: 'markdown' | 'csv' | 'json' | 'pdf') {
    const fileName = candidate.name.replace(/\s+/g, '_');
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'markdown':
        content = generateMarkdown(candidate);
        mimeType = 'text/markdown';
        extension = 'md';
        break;
      case 'csv':
        content = generateCSV(candidate);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        content = generateJSON(candidate);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'pdf':
        content = generateHTML(candidate);
        mimeType = 'text/html';
        extension = 'html';
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
    setDownloadMenuOpen(null);
  }

  function getStatusBadge(status: string) {
    const styles = {
      invited: 'bg-yala-sand text-yala-green',
      in_progress: 'bg-yala-mint text-yala-green',
      completed: 'bg-yala-lime text-yala-green',
    };

    const labels = {
      invited: 'Invited',
      in_progress: 'In progress',
      completed: 'Completed',
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold ${
          styles[status as keyof typeof styles] || 'bg-yala-sand text-yala-green'
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] border border-[#d4d4d4]">
      <table className="w-full border-collapse">
        <thead className="bg-[#f2f4f5]">
          <tr>
            <th className="h-11 px-6 py-3 text-left font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider">
              Candidate
            </th>
            <th className="h-11 px-6 py-3 text-left font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider hidden md:table-cell">
              Email
            </th>
            <th className="h-11 px-6 py-3 text-left font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider">
              Status
            </th>
            <th className="h-11 px-6 py-3 text-left font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider hidden lg:table-cell">
              Created
            </th>
            <th className="h-11 px-6 py-3 text-left font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider hidden lg:table-cell">
              Completed
            </th>
            <th className="h-11 px-6 py-3 text-left font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider hidden xl:table-cell">
              Similarity
            </th>
            <th className="h-11 px-6 py-3 text-center font-medium text-[12px] leading-[18px] text-[#525252] uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {candidates.map((candidate) => (
            <tr
              key={candidate.id}
              onClick={() => onSelectCandidate(candidate)}
              className="border-b border-[#eaecf0] bg-white hover:bg-yala-hover cursor-pointer transition-colors"
            >
              <td className="px-6 py-5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-[14px] font-semibold text-neutral-900">
                      {capitalizeName(candidate.name)}
                    </div>
                    {candidate.is_benchmark && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-yala-lime text-yala-green mt-1">
                        ⭐ Benchmark
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-[14px] text-neutral-900 hidden md:table-cell">
                {candidate.email || '—'}
              </td>
              <td className="px-6 py-5 whitespace-nowrap">
                {getStatusBadge(candidate.status)}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-[14px] text-neutral-900 hidden lg:table-cell">
                {formatDate(candidate.created_at)}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-[14px] text-neutral-900 hidden lg:table-cell">
                {formatDate(candidate.completed_at)}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-[14px] text-neutral-900 hidden xl:table-cell">
                {candidate.is_benchmark ? (
                  <span className="text-gray-400">—</span>
                ) : candidate.similarity_score !== null ? (
                  <span className="font-medium">{candidate.similarity_score.toFixed(1)}%</span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-6 py-5 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDownloadMenuOpen(downloadMenuOpen === candidate.id ? null : candidate.id);
                      }}
                      className="p-2 text-yala-green hover:bg-yala-lime-soft rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    
                    {downloadMenuOpen === candidate.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border-2 border-yala-green/10 py-2 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(candidate, 'markdown');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-yala-black hover:bg-yala-lime-soft transition-colors"
                        >
                          Markdown
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(candidate, 'csv');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-yala-black hover:bg-yala-lime-soft transition-colors"
                        >
                          CSV
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(candidate, 'json');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-yala-black hover:bg-yala-lime-soft transition-colors"
                        >
                          JSON
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(candidate, 'pdf');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-yala-black hover:bg-yala-lime-soft transition-colors"
                        >
                          PDF/HTML
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectCandidate(candidate)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
