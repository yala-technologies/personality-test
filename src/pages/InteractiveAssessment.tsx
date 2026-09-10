import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import { candidateGet, candidateSave } from '../lib/api';
import { QUESTIONS } from '../lib/questions';
import type { CandidateAssessment } from '../lib/types';
import { capitalizeName } from '../lib/utils';

/**
 * Queue-based autosave to prevent race conditions
 * Ensures latest state is always saved and saves never finish out of order
 */
class SaveQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  enqueue(_responses: Record<number, number>, _isComplete: boolean, saveFn: () => Promise<void>) {
    this.queue.push(saveFn);
    this.process();
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Only execute the latest save
      const saveFn = this.queue[this.queue.length - 1];
      this.queue = [];

      try {
        await saveFn();
      } catch (err) {
        console.error('Save failed:', err);
      }

      // If new responses were enqueued while saving, continue
      if (this.queue.length === 0) break;
    }

    this.isProcessing = false;
  }

  async flush() {
    while (this.isProcessing || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  isActive() {
    return this.isProcessing || this.queue.length > 0;
  }
}

export function InteractiveAssessment() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const saveQueueRef = useRef(new SaveQueue());

  useEffect(() => {
    if (!token) {
      setError('Invalid assessment link');
      setLoading(false);
      return;
    }

    loadCandidate();
  }, [token]);

  async function loadCandidate() {
    if (!token) return;

    try {
      setLoading(true);
      const data = await candidateGet(token);
      
      if (data.status === 'completed') {
        navigate(`/assessment/${token}/complete`, { replace: true });
        return;
      }

      setCandidate(data);
      
      if (data.responses) {
        setResponses(data.responses);
        const orderedQuestions = data.question_order || Array.from({ length: 72 }, (_, i) => i + 1);
        const firstUnanswered = orderedQuestions.findIndex(qId => !data.responses![qId]);
        setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      }
      
      if (data.status === 'invited') {
        autosave(data.responses || {}, false);
      }
      
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  const autosave = useCallback(
    (currentResponses: Record<number, number>, isComplete: boolean) => {
      if (!token) return;

      setSaving(true);
      
      saveQueueRef.current.enqueue(currentResponses, isComplete, async () => {
        await candidateSave(token, currentResponses, isComplete);
        setSaving(false);
      });
    },
    [token]
  );

  async function handleAnswer(value: number) {
    if (!candidate || submitting) return;

    const orderedQuestions = candidate.question_order || Array.from({ length: 72 }, (_, i) => i + 1);
    const currentQuestionId = orderedQuestions[currentQuestionIndex];

    const newResponses = {
      ...responses,
      [currentQuestionId]: value,
    };

    // Update local state immediately
    setResponses(newResponses);
    setShowTransition(true);

    // Enqueue save (non-blocking)
    autosave(newResponses, false);

    // Progress UI after brief transition
    setTimeout(() => {
      if (currentQuestionIndex < orderedQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setShowTransition(false);
      } else {
        handleSubmit(newResponses);
      }
    }, 400);
  }

  async function handleSubmit(finalResponses?: Record<number, number>) {
    if (!token || !candidate || submitting) return;

    const responsesToSubmit = finalResponses || responses;
    const totalAnswered = Object.keys(responsesToSubmit).length;
    
    if (totalAnswered < 72) return;

    try {
      setSubmitting(true);
      
      // Flush any pending autosaves before final submission
      await saveQueueRef.current.flush();
      
      // Submit with completed flag
      await candidateSave(token, responsesToSubmit, true);
      
      navigate(`/assessment/${token}/complete`, { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit assessment');
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        handleAnswer(num);
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [candidate, currentQuestionIndex, responses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <img 
            src="/assets/yala-star.svg" 
            alt="Loading" 
            className="inline-block h-16 w-16 animate-spin"
          />
          <p className="mt-4 text-yala-green font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-yala-green/10 p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">{error || 'Assessment not found'}</p>
        </div>
      </div>
    );
  }

  const orderedQuestions = candidate.question_order
    ? candidate.question_order.map((id) => QUESTIONS.find((q) => q.id === id)!)
    : QUESTIONS;

  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const currentQuestionId = currentQuestion.id;
  const selectedValue = responses[currentQuestionId];
  const totalAnswered = Object.keys(responses).length;
  const progressPercent = (totalAnswered / 72) * 100;
  const firstName = capitalizeName(candidate.name.split(' ')[0]);

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 h-1 bg-yala-green/10 z-50">
        <div
          className="h-full bg-yala-lime transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 md:py-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-4 md:mb-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-yala-green/60">
              <span>{totalAnswered + 1} of 72</span>
              {saving && (
                <span className="inline-flex items-center gap-1.5 text-xs text-yala-green/40">
                  <div className="w-1.5 h-1.5 bg-yala-lime rounded-full animate-pulse" />
                  Saving...
                </span>
              )}
            </div>
          </div>

          {currentQuestionIndex === 0 && totalAnswered === 0 && (
            <div className="text-center mb-6 md:mb-8 animate-slide-up">
              <div className="flex items-center justify-center mb-3">
                <img 
                  src="/assets/yala-star.svg" 
                  alt="Yala" 
                  className="h-10 md:h-12 w-auto"
                />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-yala-green mb-2">
                Hi {firstName} 👋
              </h1>
              <p className="text-base text-yala-green/80 mb-1">
                Welcome to the BDR Personality Assessment
              </p>
              <p className="text-sm text-yala-green/60 max-w-xl mx-auto">
                Answer based on what is generally true of you rather than what you think an employer would prefer. 
                There are no right or wrong answers. This will take about 10–15 minutes.
              </p>
            </div>
          )}

          <div
            className={`bg-white rounded-2xl shadow-xl border-2 border-yala-green/5 p-6 md:p-8 mb-4 md:mb-6 transition-all duration-300 ${
              showTransition ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}
          >
            <p className="text-xl md:text-2xl font-semibold text-yala-black leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>

          <div className="space-y-2 md:space-y-3 mb-6">
            {[1, 2, 3, 4, 5].map((value) => {
              const labels = [
                'Strongly disagree',
                'Disagree',
                'Neither agree nor disagree',
                'Agree',
                'Strongly agree',
              ];
              const isSelected = selectedValue === value;

              return (
                <button
                  key={value}
                  onClick={() => handleAnswer(value)}
                  disabled={submitting}
                  className={`w-full group relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-yala-lime border-yala-green shadow-lg scale-[1.02]'
                      : 'bg-white border-yala-green/10 hover:border-yala-lime hover:shadow-md hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-lg md:text-xl font-bold transition-all ${
                        isSelected
                          ? 'bg-yala-green text-yala-lime'
                          : 'bg-yala-cream text-yala-green group-hover:bg-yala-lime-soft'
                      }`}
                    >
                      {value}
                    </div>
                    <span
                      className={`text-left text-sm md:text-base font-medium transition-colors ${
                        isSelected ? 'text-yala-green' : 'text-yala-black group-hover:text-yala-green'
                      }`}
                    >
                      {labels[value - 1]}
                    </span>
                    {isSelected && (
                      <div className="ml-auto">
                        <Check className="w-5 h-5 text-yala-green" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-3 text-yala-green font-medium rounded-xl hover:bg-yala-lime-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="text-sm text-yala-green/60 font-medium">
              Press 1–5 or click to answer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
