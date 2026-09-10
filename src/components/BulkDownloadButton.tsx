import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import type { Candidate } from '../lib/types';
import { formatDate, capitalizeName } from '../lib/utils';

interface Props {
  candidates: Candidate[];
}

export function BulkDownloadButton({ candidates }: Props) {
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  function generateCSV(): string {
    const rows: string[][] = [];
    
    // Header row
    const headers = [
      'Name',
      'Email',
      'Status',
      'Created',
      'Completed',
      'Is Benchmark',
      'Similarity Score',
      'Industriousness',
      'Assertiveness',
      'Emotional Stability',
      'Openness',
      'Interpersonal Orientation',
      'Achievement Drive',
      'Persistence',
      'Agency',
      'Sociability',
      'Quality Status',
      'Straight-line Rate',
      'Consistency Score',
    ];
    rows.push(headers);

    // Data rows
    candidates.forEach((candidate) => {
      const row = [
        capitalizeName(candidate.name),
        candidate.email || '',
        candidate.status,
        formatDate(candidate.created_at),
        formatDate(candidate.completed_at),
        candidate.is_benchmark ? 'Yes' : 'No',
        candidate.is_benchmark ? '' : (candidate.similarity_score?.toFixed(1) || ''),
        candidate.scores?.industriousness?.toFixed(1) || '',
        candidate.scores?.assertiveness?.toFixed(1) || '',
        candidate.scores?.emotionalStability?.toFixed(1) || '',
        candidate.scores?.openness?.toFixed(1) || '',
        candidate.scores?.interpersonalOrientation?.toFixed(1) || '',
        candidate.scores?.achievementDrive?.toFixed(1) || '',
        candidate.scores?.persistence?.toFixed(1) || '',
        candidate.scores?.agency?.toFixed(1) || '',
        candidate.scores?.sociability?.toFixed(1) || '',
        candidate.quality_signals?.status || '',
        candidate.quality_signals ? (candidate.quality_signals.straightLineRate * 100).toFixed(1) + '%' : '',
        candidate.quality_signals?.consistencyScore?.toFixed(2) || '',
      ];
      rows.push(row);
    });

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  function generateMarkdownTable(): string {
    const md: string[] = [];
    
    md.push('# Yala Big 5 - All Candidates');
    md.push('');
    md.push('## Summary');
    md.push('');
    md.push(`- **Total Candidates:** ${candidates.length}`);
    md.push(`- **Completed:** ${candidates.filter(c => c.status === 'completed').length}`);
    md.push(`- **In Progress:** ${candidates.filter(c => c.status === 'in_progress').length}`);
    md.push(`- **Invited:** ${candidates.filter(c => c.status === 'invited').length}`);
    md.push(`- **Generated:** ${new Date().toLocaleString()}`);
    md.push('');
    md.push('## Candidates');
    md.push('');
    
    // Table header
    md.push('| Name | Email | Status | Completed | Similarity | Ind. | Ass. | Emo. | Ope. | Int. | Ach. | Per. | Age. | Soc. |');
    md.push('|------|-------|--------|-----------|------------|------|------|------|------|------|------|------|------|------|');
    
    // Table rows
    candidates.forEach((candidate) => {
      const row = [
        capitalizeName(candidate.name),
        candidate.email || '—',
        candidate.status,
        formatDate(candidate.completed_at),
        candidate.is_benchmark ? '⭐' : (candidate.similarity_score?.toFixed(1) + '%' || '—'),
        candidate.scores?.industriousness?.toFixed(0) || '—',
        candidate.scores?.assertiveness?.toFixed(0) || '—',
        candidate.scores?.emotionalStability?.toFixed(0) || '—',
        candidate.scores?.openness?.toFixed(0) || '—',
        candidate.scores?.interpersonalOrientation?.toFixed(0) || '—',
        candidate.scores?.achievementDrive?.toFixed(0) || '—',
        candidate.scores?.persistence?.toFixed(0) || '—',
        candidate.scores?.agency?.toFixed(0) || '—',
        candidate.scores?.sociability?.toFixed(0) || '—',
      ];
      md.push('| ' + row.join(' | ') + ' |');
    });
    
    md.push('');
    md.push('---');
    md.push('');
    md.push('*Source: Yala Big 5 Personality Assessment Portal*');
    
    return md.join('\n');
  }

  function generateJSON(): string {
    const data = {
      summary: {
        total: candidates.length,
        completed: candidates.filter(c => c.status === 'completed').length,
        inProgress: candidates.filter(c => c.status === 'in_progress').length,
        invited: candidates.filter(c => c.status === 'invited').length,
        generatedAt: new Date().toISOString(),
      },
      candidates: candidates.map(candidate => ({
        name: capitalizeName(candidate.name),
        email: candidate.email || null,
        status: candidate.status,
        isBenchmark: candidate.is_benchmark,
        createdAt: candidate.created_at,
        completedAt: candidate.completed_at,
        similarityScore: candidate.is_benchmark ? null : candidate.similarity_score,
        traitScores: candidate.scores ? {
          industriousness: Number(candidate.scores.industriousness.toFixed(1)),
          assertiveness: Number(candidate.scores.assertiveness.toFixed(1)),
          emotionalStability: Number(candidate.scores.emotionalStability.toFixed(1)),
          openness: Number(candidate.scores.openness.toFixed(1)),
          interpersonalOrientation: Number(candidate.scores.interpersonalOrientation.toFixed(1)),
          achievementDrive: Number(candidate.scores.achievementDrive.toFixed(1)),
          persistence: Number(candidate.scores.persistence.toFixed(1)),
          agency: Number(candidate.scores.agency.toFixed(1)),
          sociability: Number(candidate.scores.sociability.toFixed(1)),
        } : null,
        qualitySignals: candidate.quality_signals ? {
          status: candidate.quality_signals.status,
          straightLineRate: Number((candidate.quality_signals.straightLineRate * 100).toFixed(1)),
          consistencyScore: Number(candidate.quality_signals.consistencyScore.toFixed(2)),
          flags: candidate.quality_signals.flags,
        } : null,
      })),
    };
    
    return JSON.stringify(data, null, 2);
  }

  function generateHTML(): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Yala Big 5 - All Candidates</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #053321; border-bottom: 3px solid #a1e55e; padding-bottom: 10px; }
    h2 { color: #053321; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; position: sticky; top: 0; }
    tr:nth-child(even) { background: #f9f9f9; }
    .benchmark { background: #a1e55e; color: #053321; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Yala Big 5 - All Candidates</h1>
  <h2>Summary</h2>
  <p><strong>Total Candidates:</strong> ${candidates.length}</p>
  <p><strong>Completed:</strong> ${candidates.filter(c => c.status === 'completed').length}</p>
  <p><strong>In Progress:</strong> ${candidates.filter(c => c.status === 'in_progress').length}</p>
  <p><strong>Invited:</strong> ${candidates.filter(c => c.status === 'invited').length}</p>
  <h2>Candidates</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Status</th>
        <th>Completed</th>
        <th>Similarity</th>
        <th>Ind.</th>
        <th>Ass.</th>
        <th>Emo.</th>
        <th>Ope.</th>
        <th>Int.</th>
        <th>Ach.</th>
        <th>Per.</th>
        <th>Age.</th>
        <th>Soc.</th>
        <th>Quality</th>
      </tr>
    </thead>
    <tbody>`;

    candidates.forEach((candidate) => {
      html += '<tr>';
      html += `<td>${capitalizeName(candidate.name)}${candidate.is_benchmark ? ' <span class="benchmark">⭐</span>' : ''}</td>`;
      html += `<td>${candidate.email || '—'}</td>`;
      html += `<td>${candidate.status}</td>`;
      html += `<td>${formatDate(candidate.completed_at)}</td>`;
      html += `<td>${candidate.is_benchmark ? '—' : (candidate.similarity_score?.toFixed(1) + '%' || '—')}</td>`;
      html += `<td>${candidate.scores?.industriousness?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.assertiveness?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.emotionalStability?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.openness?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.interpersonalOrientation?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.achievementDrive?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.persistence?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.agency?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.scores?.sociability?.toFixed(0) || '—'}</td>`;
      html += `<td>${candidate.quality_signals?.status || '—'}</td>`;
      html += '</tr>';
    });

    html += `</tbody></table>
  <div class="footer">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Source:</strong> Yala Big 5 Personality Assessment Portal</p>
  </div>
</body>
</html>`;

    return html;
  }

  function downloadFile(format: 'csv' | 'markdown' | 'json' | 'pdf') {
    let content: string;
    let mimeType: string;
    let extension: string;
    let filename: string;

    switch (format) {
      case 'csv':
        content = generateCSV();
        mimeType = 'text/csv';
        extension = 'csv';
        filename = 'candidates';
        break;
      case 'markdown':
        content = generateMarkdownTable();
        mimeType = 'text/markdown';
        extension = 'md';
        filename = 'candidates';
        break;
      case 'json':
        content = generateJSON();
        mimeType = 'application/json';
        extension = 'json';
        filename = 'candidates';
        break;
      case 'pdf':
        content = generateHTML();
        mimeType = 'text/html';
        extension = 'html';
        filename = 'candidates';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowFormatMenu(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowFormatMenu(!showFormatMenu)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-yala-green hover:bg-yala-lime-soft rounded-xl transition-all font-medium border-2 border-yala-green/20"
      >
        <Download className="w-4 h-4" />
        Download All
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {showFormatMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border-2 border-yala-green/10 py-2 z-10">
          <button
            onClick={() => downloadFile('csv')}
            className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
          >
            CSV Spreadsheet
          </button>
          <button
            onClick={() => downloadFile('markdown')}
            className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
          >
            Markdown Table
          </button>
          <button
            onClick={() => downloadFile('json')}
            className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
          >
            JSON Data
          </button>
          <button
            onClick={() => downloadFile('pdf')}
            className="w-full text-left px-4 py-2 text-sm text-yala-black hover:bg-yala-lime-soft transition-colors"
          >
            PDF/HTML Table
          </button>
        </div>
      )}
    </div>
  );
}
