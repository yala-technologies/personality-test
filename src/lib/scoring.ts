import type { TraitScores, QualitySignals, QualityStatus } from './types';

/**
 * Trait mapping: question IDs and whether they are reverse-scored
 */
const TRAIT_QUESTIONS: Record<keyof TraitScores, Array<{ id: number; reverse: boolean }>> = {
  industriousness: [
    { id: 1, reverse: false },
    { id: 9, reverse: true },
    { id: 17, reverse: false },
    { id: 25, reverse: false },
    { id: 33, reverse: false },
    { id: 41, reverse: true },
    { id: 49, reverse: false },
    { id: 57, reverse: false },
    { id: 65, reverse: false },
  ],
  assertiveness: [
    { id: 10, reverse: false },
    { id: 18, reverse: false },
    { id: 26, reverse: true },
    { id: 34, reverse: false },
    { id: 42, reverse: false },
    { id: 45, reverse: false },
    { id: 66, reverse: false },
  ],
  emotionalStability: [
    { id: 3, reverse: false },
    { id: 11, reverse: true },
    { id: 19, reverse: false },
    { id: 27, reverse: false },
    { id: 35, reverse: true },
    { id: 43, reverse: false },
    { id: 51, reverse: true },
    { id: 59, reverse: false },
    { id: 67, reverse: true },
  ],
  openness: [
    { id: 4, reverse: false },
    { id: 12, reverse: false },
    { id: 20, reverse: true },
    { id: 28, reverse: false },
    { id: 36, reverse: false },
    { id: 44, reverse: false },
    { id: 52, reverse: false },
    { id: 60, reverse: false },
    { id: 68, reverse: false },
  ],
  interpersonalOrientation: [
    { id: 5, reverse: false },
    { id: 13, reverse: true },
    { id: 21, reverse: false },
    { id: 29, reverse: false },
    { id: 37, reverse: false },
    { id: 45, reverse: true }, // Question 45 contributes oppositely
    { id: 53, reverse: false },
    { id: 61, reverse: false },
    { id: 69, reverse: false },
  ],
  achievementDrive: [
    { id: 6, reverse: false },
    { id: 14, reverse: false },
    { id: 22, reverse: true },
    { id: 30, reverse: false },
    { id: 38, reverse: false },
    { id: 46, reverse: true },
    { id: 54, reverse: false },
    { id: 62, reverse: true },
    { id: 70, reverse: false },
  ],
  persistence: [
    { id: 7, reverse: false },
    { id: 15, reverse: true },
    { id: 23, reverse: false },
    { id: 31, reverse: true },
    { id: 39, reverse: false },
    { id: 47, reverse: false },
    { id: 55, reverse: false },
    { id: 63, reverse: false },
    { id: 71, reverse: false },
  ],
  agency: [
    { id: 8, reverse: false },
    { id: 16, reverse: true },
    { id: 24, reverse: false },
    { id: 32, reverse: false },
    { id: 40, reverse: false },
    { id: 48, reverse: true },
    { id: 56, reverse: false },
    { id: 64, reverse: false },
    { id: 72, reverse: false },
  ],
  sociability: [
    { id: 2, reverse: false },
    { id: 50, reverse: false },
    { id: 58, reverse: true },
  ],
};

/**
 * Reverse-score a response (1-5 scale)
 */
export function reverseScore(value: number): number {
  return 6 - value;
}

/**
 * Calculate a trait score from responses
 */
function calculateTraitScore(
  responses: Record<number, number>,
  questions: Array<{ id: number; reverse: boolean }>
): number {
  let sum = 0;
  
  for (const { id, reverse } of questions) {
    const response = responses[id];
    if (response === undefined) {
      throw new Error(`Missing response for question ${id}`);
    }
    if (response < 1 || response > 5) {
      throw new Error(`Invalid response value ${response} for question ${id}`);
    }
    
    sum += reverse ? reverseScore(response) : response;
  }
  
  const mean = sum / questions.length;
  // Convert 1-5 scale to 0-100
  const score = ((mean - 1) / 4) * 100;
  
  return Math.round(score * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate all trait scores from responses
 */
export function calculateScores(responses: Record<number, number>): TraitScores {
  const scores: TraitScores = {
    industriousness: 0,
    assertiveness: 0,
    emotionalStability: 0,
    openness: 0,
    interpersonalOrientation: 0,
    achievementDrive: 0,
    persistence: 0,
    agency: 0,
    sociability: 0,
  };

  for (const [trait, questions] of Object.entries(TRAIT_QUESTIONS)) {
    scores[trait as keyof TraitScores] = calculateTraitScore(responses, questions);
  }

  return scores;
}

/**
 * Calculate similarity between two trait profiles
 */
export function calculateSimilarity(
  candidateScores: TraitScores,
  benchmarkScores: TraitScores
): number {
  const traits = Object.keys(candidateScores) as Array<keyof TraitScores>;
  
  let totalSimilarity = 0;
  for (const trait of traits) {
    const traitSimilarity = 100 - Math.abs(candidateScores[trait] - benchmarkScores[trait]);
    totalSimilarity += traitSimilarity;
  }
  
  const overallSimilarity = totalSimilarity / traits.length;
  return Math.round(overallSimilarity * 10) / 10; // Round to 1 decimal place
}

/**
 * Opposing question pairs for consistency checking
 */
const OPPOSING_PAIRS: Array<[number, number]> = [
  [1, 9],
  [7, 31],
  [8, 48],
  [17, 41],
  [19, 67],
  [23, 15],
  [32, 16],
  [38, 62],
  [43, 35],
  [47, 31],
  [49, 9],
  [52, 20],
  [54, 22],
  [63, 15],
  [64, 48],
  [70, 22],
  [71, 15],
  [72, 16],
];

/**
 * Calculate response quality signals
 */
export function calculateQuality(
  responses: Record<number, number>,
  durationSeconds: number | null
): QualitySignals {
  const flags: string[] = [];
  
  // Calculate straight-line response rate
  const responseCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const value of Object.values(responses)) {
    if (value >= 1 && value <= 5) {
      responseCounts[value as 1 | 2 | 3 | 4 | 5]++;
    }
  }
  
  const maxCount = Math.max(...Object.values(responseCounts));
  const straightLineRate = (maxCount / 72) * 100;
  
  if (straightLineRate >= 70) {
    flags.push(`High straight-line rate (${Math.round(straightLineRate)}%)`);
  }
  
  // Check completion time
  if (durationSeconds !== null && durationSeconds < 240) { // Less than 4 minutes
    flags.push(`Very fast completion (${Math.round(durationSeconds / 60)} minutes)`);
  }
  
  // Calculate consistency score
  let consistentPairs = 0;
  let totalPairs = 0;
  
  for (const [q1, q2] of OPPOSING_PAIRS) {
    if (responses[q1] !== undefined && responses[q2] !== undefined) {
      totalPairs++;
      
      // For opposing pairs, we expect inverse answers
      // We check if the sum is close to 6 (1+5, 2+4, 3+3)
      const sum = responses[q1] + responses[q2];
      
      // Allow some tolerance: if sum is 5, 6, or 7, consider it consistent
      if (sum >= 5 && sum <= 7) {
        consistentPairs++;
      }
    }
  }
  
  const consistencyScore = totalPairs > 0 
    ? Math.round((consistentPairs / totalPairs) * 100) 
    : 100;
  
  if (consistencyScore < 50) {
    flags.push(`Low consistency score (${consistencyScore}%)`);
  }
  
  // Determine overall status
  let status: QualityStatus = 'Good';
  if (consistencyScore < 50) {
    status = 'Low consistency';
  } else if (flags.length > 0) {
    status = 'Review';
  }
  
  return {
    status,
    flags,
    straight_line_rate: Math.round(straightLineRate * 10) / 10,
    consistency_score: consistencyScore,
  };
}

/**
 * Validate that all 72 questions have valid responses
 */
export function validateResponses(responses: Record<number, number>): void {
  const questionIds = Array.from({ length: 72 }, (_, i) => i + 1);
  
  for (const id of questionIds) {
    if (responses[id] === undefined) {
      throw new Error(`Missing response for question ${id}`);
    }
    
    const value = responses[id];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error(`Invalid response value for question ${id}: ${value}`);
    }
  }
}

/**
 * Generate a randomized question order
 */
export function generateQuestionOrder(): number[] {
  const order = Array.from({ length: 72 }, (_, i) => i + 1);
  
  // Fisher-Yates shuffle
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  
  return order;
}
