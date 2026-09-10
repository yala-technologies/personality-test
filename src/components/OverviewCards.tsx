import { Users, Clock, CheckCircle, Star } from 'lucide-react';
import type { Candidate } from '../lib/types';

interface Props {
  candidates: Candidate[];
}

export function OverviewCards({ candidates }: Props) {
  const totalCandidates = candidates.length;
  const invited = candidates.filter((c) => c.status === 'invited').length;
  const inProgress = candidates.filter((c) => c.status === 'in_progress').length;
  const completed = candidates.filter((c) => c.status === 'completed').length;
  const benchmark = candidates.find((c) => c.is_benchmark);

  const cards = [
    {
      label: 'Total candidates',
      value: totalCandidates,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Invited',
      value: invited,
      icon: Clock,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
    },
    {
      label: 'In progress',
      value: inProgress,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bg} rounded-lg p-2`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-600">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 rounded-lg p-2">
            <Star className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {benchmark ? benchmark.name : 'None'}
            </p>
            <p className="text-sm text-gray-600">Current benchmark</p>
          </div>
        </div>
      </div>
    </div>
  );
}
