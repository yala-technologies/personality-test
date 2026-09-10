import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { candidateGet, candidateSave } from '../lib/api';
import { QUESTIONS, LIKERT_SCALE } from '../lib/questions';
import type { CandidateAssessment } from '../lib/types';

const QUESTIONS_PER_PAGE = 4;

export function Assessment() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
      }
      
      if (data.status === 'invited') {
        // Start the assessment
        autosave(data.responses || {}, false, new Date());
      }
      
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }

  const autosave = useCallback(
    async (currentResponses: Record<number, number>, isComplete: boolean, savedAt: Date) => {
      if (!token || saving) return;

      try {
        setSaving(true);
        await candidateSave(token, currentResponses, isComplete);
        setLastSaved(savedAt);
      } catch (err) {
        console.error('Autosave failed:', err);
      } finally {
        setSaving(false);
      }
    },
    [token, saving]
  );

  useEffect(() => {
    if (!candidate || Object.keys(responses).length === 0) return;

    const timer = setTimeout(() => {
      autosave(responses, false, new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [responses, candidate, autosave]);

  function handleAnswer(questionId: number, value: number) {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  async function handleSubmit() {
    if (!token || !candidate) return;

    const totalAnswered = Object.keys(responses).length;
    if (totalAnswered < 72) {
      alert(`Please answer all questions. ${totalAnswered}/72 answered.`);
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit? You will not be able to change your answers after submission.'
    );
    
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await candidateSave(token, responses, true);
      navigate(`/assessment/${token}/complete`, { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <p className="text-red-600">{error || 'Assessment not found'}</p>
        </div>
      </div>
    );
  }

  const orderedQuestions = candidate.question_order
    ? candidate.question_order.map((id) => QUESTIONS.find((q) => q.id === id)!)
    : QUESTIONS;

  const totalPages = Math.ceil(orderedQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = orderedQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const currentPageAnswered = pageQuestions.every((q) => responses[q.id] !== undefined);
  const totalAnswered = Object.keys(responses).length;
  const allAnswered = totalAnswered === 72;

  const firstName = candidate.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Hi {firstName}
            </h1>
            <h2 className="text-xl text-gray-700 mb-4">Personality Assessment</h2>
            <p className="text-gray-600 text-sm mb-2">
              Below are statements about how you typically think, work and respond to different
              situations. There are no right or wrong answers. Answer based on what is generally
              true of you rather than what you think an employer would prefer.
            </p>
            <p className="text-gray-500 text-sm">
              Estimated completion time: <span className="font-medium">10–15 minutes</span>
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>
                {totalAnswered} of 72 answered
              </span>
              {lastSaved && (
                <span className="text-xs text-gray-500">
                  {saving ? 'Saving...' : 'Saved'}
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(totalAnswered / 72) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {pageQuestions.map((question, index) => {
              const questionNumber = currentPage * QUESTIONS_PER_PAGE + index + 1;
              const answered = responses[question.id] !== undefined;

              return (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                      {questionNumber}
                    </span>
                    <p className="text-gray-900 pt-1">{question.text}</p>
                    {answered && (
                      <Check className="flex-shrink-0 w-5 h-5 text-primary-600 mt-1" />
                    )}
                  </div>
                  <div className="ml-11 space-y-2">
                    {LIKERT_SCALE.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.value}
                          checked={responses[question.id] === option.value}
                          onChange={() => handleAnswer(question.id, option.value)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {option.value} — {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>

            {currentPage < totalPages - 1 ? (
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!currentPageAnswered}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
