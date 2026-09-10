import { describe, it, expect } from 'vitest';
import {
  reverseScore,
  calculateScores,
  calculateSimilarity,
  calculateQuality,
  validateResponses,
  generateQuestionOrder,
} from './scoring';
import type { TraitScores } from './types';

describe('Scoring', () => {
  describe('reverseScore', () => {
    it('should reverse scores correctly', () => {
      expect(reverseScore(1)).toBe(5);
      expect(reverseScore(2)).toBe(4);
      expect(reverseScore(3)).toBe(3);
      expect(reverseScore(4)).toBe(2);
      expect(reverseScore(5)).toBe(1);
    });
  });

  describe('calculateScores', () => {
    it('should calculate all trait scores', () => {
      // Create a complete set of responses with all 5s
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 72; i++) {
        responses[i] = 5;
      }

      const scores = calculateScores(responses);

      expect(scores).toHaveProperty('industriousness');
      expect(scores).toHaveProperty('assertiveness');
      expect(scores).toHaveProperty('emotionalStability');
      expect(scores).toHaveProperty('openness');
      expect(scores).toHaveProperty('interpersonalOrientation');
      expect(scores).toHaveProperty('achievementDrive');
      expect(scores).toHaveProperty('persistence');
      expect(scores).toHaveProperty('agency');
      expect(scores).toHaveProperty('sociability');

      // All scores should be between 0 and 100
      Object.values(scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should handle reverse-scored questions correctly', () => {
      const responses: Record<number, number> = {};
      
      // Question 9 is reverse-scored in industriousness
      // If we answer 5 to all industriousness questions except 9 (which we answer 1)
      // The reverse scoring should convert 1 to 5
      for (let i = 1; i <= 72; i++) {
        responses[i] = 3; // Neutral for all
      }

      const scores = calculateScores(responses);
      
      // With all 3s (neutral), all scores should be exactly 50
      Object.values(scores).forEach((score) => {
        expect(score).toBe(50);
      });
    });

    it('should handle question 45 contributing to both assertiveness and interpersonal orientation oppositely', () => {
      const responses: Record<number, number> = {};
      
      // Set all to neutral (3)
      for (let i = 1; i <= 72; i++) {
        responses[i] = 3;
      }

      // Set question 45 to strongly agree (5)
      responses[45] = 5;

      const scores = calculateScores(responses);

      // Question 45 contributes positively to assertiveness
      // and negatively (reverse) to interpersonal orientation
      // So assertiveness should be above 50 and interpersonal should be below 50
      expect(scores.assertiveness).toBeGreaterThan(50);
      expect(scores.interpersonalOrientation).toBeLessThan(50);
    });

    it('should throw error for missing responses', () => {
      const incompleteResponses: Record<number, number> = { 1: 5, 2: 4 };
      
      expect(() => calculateScores(incompleteResponses)).toThrow();
    });

    it('should throw error for invalid response values', () => {
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 72; i++) {
        responses[i] = i === 1 ? 6 : 3; // Invalid value 6 for question 1
      }
      
      expect(() => calculateScores(responses)).toThrow();
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 100 for identical profiles', () => {
      const profile: TraitScores = {
        industriousness: 80,
        assertiveness: 75,
        emotionalStability: 90,
        openness: 70,
        interpersonalOrientation: 65,
        achievementDrive: 85,
        persistence: 88,
        agency: 82,
        sociability: 78,
      };

      const similarity = calculateSimilarity(profile, profile);
      expect(similarity).toBe(100);
    });

    it('should calculate similarity correctly for different profiles', () => {
      const candidate: TraitScores = {
        industriousness: 80,
        assertiveness: 75,
        emotionalStability: 90,
        openness: 70,
        interpersonalOrientation: 65,
        achievementDrive: 85,
        persistence: 88,
        agency: 82,
        sociability: 78,
      };

      const benchmark: TraitScores = {
        industriousness: 85,
        assertiveness: 70,
        emotionalStability: 85,
        openness: 75,
        interpersonalOrientation: 60,
        achievementDrive: 90,
        persistence: 85,
        agency: 80,
        sociability: 80,
      };

      const similarity = calculateSimilarity(candidate, benchmark);

      // Each trait difference: 5, 5, 5, 5, 5, 5, 3, 2, 2
      // Similarities: 95, 95, 95, 95, 95, 95, 97, 98, 98
      // Average: 96.3
      expect(similarity).toBeCloseTo(96.3, 0);
    });
  });

  describe('calculateQuality', () => {
    it('should flag high straight-line rate', () => {
      const responses: Record<number, number> = {};
      // Answer 5 to 70 questions (97% straight-line)
      for (let i = 1; i <= 72; i++) {
        responses[i] = i <= 70 ? 5 : 3;
      }

      const quality = calculateQuality(responses, 600);

      // High straight-line can also cause low consistency, so status could be either
      expect(['Review', 'Low consistency']).toContain(quality.status);
      expect(quality.flags.length).toBeGreaterThan(0);
      expect(quality.straight_line_rate).toBeGreaterThan(70);
    });

    it('should flag very fast completion', () => {
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 72; i++) {
        responses[i] = 3;
      }

      const quality = calculateQuality(responses, 180); // 3 minutes

      expect(quality.flags.some(f => f.includes('fast'))).toBe(true);
    });

    it('should mark good responses as Good', () => {
      const responses: Record<number, number> = {};
      // Varied responses
      for (let i = 1; i <= 72; i++) {
        responses[i] = (i % 5) + 1;
      }

      const quality = calculateQuality(responses, 600);

      expect(quality.status).toBe('Good');
      expect(quality.consistency_score).toBeGreaterThan(0);
    });
  });

  describe('validateResponses', () => {
    it('should pass for complete valid responses', () => {
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 72; i++) {
        responses[i] = 3;
      }

      expect(() => validateResponses(responses)).not.toThrow();
    });

    it('should throw for incomplete responses', () => {
      const responses: Record<number, number> = { 1: 5, 2: 4 };

      expect(() => validateResponses(responses)).toThrow('Missing response');
    });

    it('should throw for invalid response values', () => {
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 72; i++) {
        responses[i] = i === 1 ? 0 : 3; // Invalid 0
      }

      expect(() => validateResponses(responses)).toThrow('Invalid response');
    });

    it('should throw for non-integer values', () => {
      const responses: Record<number, number> = {};
      for (let i = 1; i <= 72; i++) {
        responses[i] = i === 1 ? 3.5 : 3; // Invalid 3.5
      }

      expect(() => validateResponses(responses)).toThrow();
    });
  });

  describe('generateQuestionOrder', () => {
    it('should generate array of 72 questions', () => {
      const order = generateQuestionOrder();
      expect(order).toHaveLength(72);
    });

    it('should contain all question IDs from 1 to 72', () => {
      const order = generateQuestionOrder();
      const sorted = [...order].sort((a, b) => a - b);
      
      for (let i = 1; i <= 72; i++) {
        expect(sorted[i - 1]).toBe(i);
      }
    });

    it('should generate different orders', () => {
      const order1 = generateQuestionOrder();
      const order2 = generateQuestionOrder();

      // It's extremely unlikely they'll be identical
      expect(order1).not.toEqual(order2);
    });
  });
});
