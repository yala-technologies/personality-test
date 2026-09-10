import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { candidateGet } from '../lib/api';
import type { TraitScores } from '../lib/types';
import { TRAIT_LABELS } from '../lib/utils';

export function Complete() {
  const { token } = useParams<{ token: string }>();
  const [showScores, setShowScores] = useState(false);
  const [scores, setScores] = useState<TraitScores | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadScores() {
    if (!token || scores) return;
    
    setLoading(true);
    try {
      const data = await candidateGet(token);
      // Scores come from the backend after completion
      setScores((data as any).scores || null);
    } catch (err) {
      console.error('Failed to load scores:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (showScores && !scores) {
      loadScores();
    }
  }, [showScores]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-yala-green/5 p-8 md:p-12 max-w-2xl w-full text-center animate-fade-in">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 bg-yala-lime rounded-3xl flex items-center justify-center transform rotate-3 animate-pulse">
            <Check className="w-12 h-12 text-yala-green" strokeWidth={3} />
          </div>
          <img 
            src="/assets/yala-star.svg" 
            alt="" 
            className="absolute -top-2 -right-2 w-8 h-8 animate-bounce"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-yala-green mb-4">
          All Done! 🎉
        </h1>
        
        <p className="text-lg text-yala-green/80 mb-6 leading-relaxed">
          Thank you for completing the personality assessment. Your responses have been submitted
          successfully.
        </p>

        <button
          onClick={() => setShowScores(!showScores)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-yala-green text-yala-lime rounded-xl font-semibold hover:bg-yala-green/90 focus:outline-none focus:ring-2 focus:ring-yala-lime focus:ring-offset-2 disabled:opacity-50 transition-all transform hover:scale-[1.02] mb-6"
        >
          {loading ? 'Loading...' : showScores ? 'Hide Scores' : 'See Your Scores'}
          {!loading && (showScores ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />)}
        </button>

        {showScores && scores && (
          <div className="mt-8 text-left animate-fade-in">
            <h2 className="text-2xl font-bold text-yala-green mb-6 text-center">Your Trait Scores</h2>
            <div className="space-y-4">
              {Object.entries(scores).map(([trait, score]) => (
                <div key={trait} className="bg-neutral-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-yala-green">
                      {TRAIT_LABELS[trait as keyof TraitScores]}
                    </span>
                    <span className="text-2xl font-bold text-yala-green">
                      {score.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-white rounded-full h-3">
                    <div
                      className="bg-yala-lime rounded-full h-3 transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-yala-lime-soft rounded-2xl p-4">
              <p className="text-sm text-yala-green font-medium">
                These scores represent your personality traits on a scale of 0-100.
              </p>
            </div>
          </div>
        )}

        {showScores && !scores && !loading && (
          <p className="mt-6 text-yala-green/60">
            Your scores are being processed. Please check back with the admin.
          </p>
        )}

        {!showScores && (
          <div className="flex items-center justify-center gap-2 text-xs text-yala-green/50">
            <img 
              src="/assets/yala-logo.svg" 
              alt="Yala" 
              className="h-4 w-auto opacity-50"
            />
            <span>We'll be in touch soon!</span>
          </div>
        )}
      </div>
    </div>
  );
}
