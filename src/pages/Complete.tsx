import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { candidateResults } from '../lib/api';
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
      const data = await candidateResults(token);
      console.log('Results data:', data);
      setScores(data.scores);
      
      if (!data.scores) {
        console.warn('No scores found in results');
      }
    } catch (err) {
      console.error('Failed to load scores:', err);
      alert('Failed to load scores. Please contact the admin.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (showScores && !scores && !loading) {
      loadScores();
    }
  }, [showScores]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-yala-green/5 p-12 max-w-md w-full text-center animate-fade-in">
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
        
        <div className="bg-yala-lime-soft rounded-2xl p-4 mb-6">
          <button
            onClick={() => setShowScores(!showScores)}
            disabled={loading}
            className="text-yala-green font-medium hover:text-yala-green/80 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading ? 'Loading...' : showScores ? 'Hide your scores' : 'See your scores'}
            {!loading && (showScores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
          </button>
        </div>

        {showScores && (
          <div className="mt-6 text-left animate-fade-in">
            {scores ? (
              <>
                <h2 className="text-xl font-bold text-yala-green mb-4 text-center">Your Trait Scores</h2>
                <div className="space-y-3">
                  {Object.entries(scores).map(([trait, score]) => (
                    <div key={trait} className="bg-neutral-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-yala-green text-sm">
                          {TRAIT_LABELS[trait as keyof TraitScores]}
                        </span>
                        <span className="text-xl font-bold text-yala-green">
                          {score.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2.5">
                        <div
                          className="bg-yala-lime rounded-full h-2.5 transition-all"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 bg-yala-lime-soft rounded-2xl p-3">
                  <p className="text-xs text-yala-green">
                    These scores represent your personality traits on a scale of 0-100.
                  </p>
                </div>
              </>
            ) : !loading ? (
              <div className="text-center py-6">
                <p className="text-yala-green/60 mb-2">Your scores are still being calculated.</p>
                <p className="text-sm text-yala-green/50">Please check back with your admin for your results.</p>
              </div>
            ) : null}
          </div>
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
