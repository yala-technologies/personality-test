import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import type { Candidate, TraitScores } from '../lib/types';
import { TRAIT_LABELS } from '../lib/utils';

interface Props {
  candidate: Candidate;
  benchmark?: Candidate;
}

export function TraitVisualization({ candidate, benchmark }: Props) {
  if (!candidate.scores) return null;

  const traits = Object.keys(candidate.scores) as Array<keyof TraitScores>;

  // Prepare data for radar chart
  const chartData = traits.map((trait) => ({
    trait: TRAIT_LABELS[trait],
    candidate: candidate.scores![trait],
    benchmark: benchmark?.scores?.[trait] || 0,
  }));

  // Prepare data for comparison table
  const comparisonData = traits.map((trait) => {
    const candidateScore = candidate.scores![trait];
    const benchmarkScore = benchmark?.scores?.[trait];
    const difference = benchmarkScore !== undefined ? candidateScore - benchmarkScore : null;

    return {
      trait: TRAIT_LABELS[trait],
      candidateScore,
      benchmarkScore,
      difference,
    };
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Trait scores</h3>

      {/* Radar Chart */}
      {benchmark && (
        <div className="bg-gray-50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis 
                dataKey="trait" 
                tick={{ fill: '#4B5563', fontSize: 12 }}
                style={{ fontSize: '12px' }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Candidate"
                dataKey="candidate"
                stroke="#16a34a"
                fill="#16a34a"
                fillOpacity={0.3}
              />
              <Radar
                name="Benchmark"
                dataKey="benchmark"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Trait</th>
              {benchmark && (
                <th className="px-4 py-3 text-center font-medium text-gray-600">Benchmark</th>
              )}
              <th className="px-4 py-3 text-center font-medium text-gray-600">Candidate</th>
              {benchmark && (
                <th className="px-4 py-3 text-center font-medium text-gray-600">Difference</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comparisonData.map((row) => (
              <tr key={row.trait}>
                <td className="px-4 py-3 text-gray-900">{row.trait}</td>
                {benchmark && (
                  <td className="px-4 py-3 text-center text-gray-700 font-medium">
                    {row.benchmarkScore?.toFixed(1) || '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-center text-gray-900 font-medium">
                  {row.candidateScore.toFixed(1)}
                </td>
                {benchmark && (
                  <td className="px-4 py-3 text-center">
                    {row.difference !== null ? (
                      <span
                        className={
                          row.difference > 0
                            ? 'text-green-600 font-medium'
                            : row.difference < 0
                            ? 'text-red-600 font-medium'
                            : 'text-gray-600'
                        }
                      >
                        {row.difference > 0 && '+'}
                        {row.difference.toFixed(1)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
