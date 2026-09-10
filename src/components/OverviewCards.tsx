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
      color: 'text-yala-green',
      bg: 'bg-yala-lime-soft',
    },
    {
      label: 'Invited',
      value: invited,
      icon: Clock,
      color: 'text-yala-green',
      bg: 'bg-yala-sand',
    },
    {
      label: 'In progress',
      value: inProgress,
      icon: Clock,
      color: 'text-yala-green',
      bg: 'bg-yala-mint',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle,
      color: 'text-yala-green',
      bg: 'bg-yala-lime',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-2xl shadow-lg border-2 border-yala-green/5 p-5 hover:shadow-xl transition-all transform hover:scale-105"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bg} rounded-xl p-3`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-yala-green">{card.value}</p>
                <p className="text-sm text-yala-green/60 font-medium">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-white rounded-2xl shadow-lg border-2 border-yala-green/5 p-5 hover:shadow-xl transition-all transform hover:scale-105">
        <div className="flex items-center gap-3">
          <div className="bg-yala-lime rounded-xl p-3">
            <Star className="w-6 h-6 text-yala-green" fill="currentColor" />
          </div>
          <div>
            <p className="text-sm font-bold text-yala-green">
              {benchmark ? benchmark.name : 'None'}
            </p>
            <p className="text-sm text-yala-green/60 font-medium">Current benchmark</p>
          </div>
        </div>
      </div>
    </div>
  );
}
