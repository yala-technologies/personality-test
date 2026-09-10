import { ChevronRight } from 'lucide-react';
import type { Candidate } from '../lib/types';
import { formatDate } from '../lib/utils';

interface Props {
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
}

export function CandidateTable({ candidates, onSelectCandidate }: Props) {
  if (candidates.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No candidates found. Create your first candidate to get started.
      </div>
    );
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Candidate
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden md:table-cell">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">
              Completed
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden xl:table-cell">
              Similarity
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {candidates.map((candidate) => (
            <tr
              key={candidate.id}
              onClick={() => onSelectCandidate(candidate)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {candidate.name}
                    </div>
                    {candidate.is_benchmark && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 mt-1">
                        Benchmark
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                {candidate.email || '—'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {getStatusBadge(candidate.status)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                {formatDate(candidate.created_at)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                {formatDate(candidate.completed_at)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 hidden xl:table-cell">
                {candidate.is_benchmark ? (
                  <span className="text-gray-400">—</span>
                ) : candidate.similarity_score !== null ? (
                  <span className="font-medium">{candidate.similarity_score.toFixed(1)}%</span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
