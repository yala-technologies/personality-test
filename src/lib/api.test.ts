import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminLogin,
  adminListCandidates,
  adminCreateCandidate,
  adminSetBenchmark,
  candidateGet,
  candidateSave,
} from './api';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('adminLogin', () => {
    it('should send correct request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: 'test-session-token',
          expiresAt: '2026-09-11T00:00:00.000Z',
        }),
      });

      await adminLogin('Yala123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/personality-api',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'admin.login',
            password: 'Yala123',
          }),
        }
      );
    });

    it('should translate backend response to frontend session format', async () => {
      const expiresAt = '2026-09-11T00:00:00.000Z';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session: 'test-session-token',
          expiresAt,
        }),
      });

      const result = await adminLogin('Yala123');

      expect(result).toEqual({
        token: 'test-session-token',
        expires_at: new Date(expiresAt).getTime(),
      });
    });

    it('should throw error on invalid password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid password' }),
      });

      await expect(adminLogin('wrong')).rejects.toThrow('Invalid password');
    });
  });

  describe('adminListCandidates', () => {
    it('should send correct request with bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [] }),
      });

      await adminListCandidates('test-session-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/personality-api',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-session-token',
          },
          body: JSON.stringify({
            action: 'admin.list',
          }),
        }
      );
    });

    it('should return candidates array', async () => {
      const candidates = [
        { id: '1', name: 'Test', status: 'completed' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates }),
      });

      const result = await adminListCandidates('test-session-token');

      expect(result).toEqual(candidates);
    });

    it('should throw error on unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(adminListCandidates('invalid-token')).rejects.toThrow('Unauthorized');
    });
  });

  describe('adminCreateCandidate', () => {
    it('should send correct request with name and email', async () => {
      const candidate = {
        id: '1',
        name: 'Test Candidate',
        email: 'test@example.com',
        status: 'invited',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidate }),
      });

      await adminCreateCandidate('test-session-token', 'Test Candidate', 'test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/personality-api',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-session-token',
          },
          body: JSON.stringify({
            action: 'admin.create',
            name: 'Test Candidate',
            email: 'test@example.com',
          }),
        }
      );
    });

    it('should send request without email when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidate: { id: '1', name: 'Test' } }),
      });

      await adminCreateCandidate('test-session-token', 'Test Candidate');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual({
        action: 'admin.create',
        name: 'Test Candidate',
        email: undefined,
      });
    });
  });

  describe('adminSetBenchmark', () => {
    it('should send correct request with candidate ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await adminSetBenchmark('test-session-token', 'candidate-id-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/personality-api',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-session-token',
          },
          body: JSON.stringify({
            action: 'admin.benchmark',
            id: 'candidate-id-123',
          }),
        }
      );
    });
  });

  describe('candidateGet', () => {
    it('should send correct request with candidate token', async () => {
      const candidate = {
        id: '1',
        name: 'Test',
        status: 'invited',
        responses: null,
        question_order: [1, 2, 3],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidate }),
      });

      await candidateGet('candidate-token-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/personality-api',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'candidate.get',
            token: 'candidate-token-123',
          }),
        }
      );
    });

    it('should return candidate assessment data', async () => {
      const candidate = {
        id: '1',
        name: 'Test',
        status: 'invited',
        responses: null,
        question_order: [1, 2, 3],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidate }),
      });

      const result = await candidateGet('candidate-token-123');

      expect(result).toEqual(candidate);
    });
  });

  describe('candidateSave', () => {
    it('should send correct request with responses and completed=false', async () => {
      const responses = { 1: 3, 2: 4, 3: 5 };
      const candidate = {
        id: '1',
        name: 'Test',
        status: 'in_progress',
        responses,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidate }),
      });

      await candidateSave('candidate-token-123', responses, false);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/personality-api',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'candidate.save',
            token: 'candidate-token-123',
            responses,
            completed: false,
          }),
        }
      );
    });

    it('should send completed=true for final submission', async () => {
      const responses = Object.fromEntries(Array.from({ length: 72 }, (_, i) => [i + 1, 3]));
      const candidate = {
        id: '1',
        name: 'Test',
        status: 'completed',
        responses,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidate }),
      });

      await candidateSave('candidate-token-123', responses, true);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.completed).toBe(true);
      expect(callBody.action).toBe('candidate.save');
    });

    it('should throw error when assessment already completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Assessment already completed' }),
      });

      await expect(
        candidateSave('candidate-token-123', { 1: 3 }, false)
      ).rejects.toThrow('Assessment already completed');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adminLogin('test')).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(adminLogin('test')).rejects.toThrow();
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(adminLogin('test')).rejects.toThrow('Internal server error');
    });
  });
});
