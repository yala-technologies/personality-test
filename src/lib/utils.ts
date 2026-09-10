import type { TraitScores } from './types';

export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return remainingSeconds > 0 
    ? `${minutes}m ${remainingSeconds}s` 
    : `${minutes}m`;
}

export const TRAIT_LABELS: Record<keyof TraitScores, string> = {
  industriousness: 'Industriousness / Discipline',
  assertiveness: 'Assertiveness',
  emotionalStability: 'Emotional Stability',
  openness: 'Openness / Curiosity',
  interpersonalOrientation: 'Interpersonal Orientation',
  achievementDrive: 'Achievement Drive',
  persistence: 'Persistence / Rejection Recovery',
  agency: 'Agency / Initiative',
  sociability: 'Sociability / Energy',
};

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
