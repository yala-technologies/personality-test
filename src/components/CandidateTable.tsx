import { ChevronRight } from 'lucide-react';
import type { Candidate } from '../lib/types';
import { formatDate, capitalizeName } from '../lib/utils';

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
            <th className="h-11 px-6 py-3"></th>
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
              <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
