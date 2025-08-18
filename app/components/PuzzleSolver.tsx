"use client";
import { useState, useEffect } from 'react';
import { apiClient, Puzzle } from '@/lib/api-client';

interface PuzzleSolverProps {
  raceId: string;
  onPuzzleSolved: (correct: boolean, speedBoost: number) => void;
}

export default function PuzzleSolver({ raceId, onPuzzleSolved }: PuzzleSolverProps) {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Bulmaca yükle
  const loadPuzzle = async () => {
    try {
      const puzzle = await apiClient.getCurrentPuzzle(raceId);
      setCurrentPuzzle(puzzle);
      setTimeLeft(puzzle.timeLimit);
      setUserAnswer('');
      setFeedback(null);
    } catch (err) {
      setFeedback({ message: 'Failed to load puzzle', type: 'error' });
    }
  };

  // Bulmaca çöz
  const submitAnswer = async () => {
    if (!currentPuzzle || !userAnswer.trim()) return;

    try {
      setIsSubmitting(true);
      const answer = parseInt(userAnswer);
      
      const result = await apiClient.solvePuzzle(raceId, answer);
      
      if (result.correct) {
        setFeedback({ 
          message: `✅ Correct! +${result.speedBoost.toFixed(1)} speed bonus`, 
          type: 'success' 
        });
      } else {
        setFeedback({ 
          message: `❌ Wrong! Correct answer: ${currentPuzzle.answer}`, 
          type: 'error' 
        });
      }

      onPuzzleSolved(result.correct, result.speedBoost);
      
      // 2 saniye sonra yeni bulmaca yükle
      setTimeout(() => {
        loadPuzzle();
      }, 2000);

    } catch (err) {
      setFeedback({ message: 'Failed to submit answer', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enter tuşu ile gönder
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      submitAnswer();
    }
  };

  // Zamanlayıcı
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Süre doldu, yanlış sayılır
          setFeedback({ message: '⏰ Time is up!', type: 'error' });
          onPuzzleSolved(false, 0);
          setTimeout(() => loadPuzzle(), 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onPuzzleSolved]);

  // İlk bulmaca yükle
  useEffect(() => {
    loadPuzzle();
  }, [raceId]);

  if (!currentPuzzle) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-white">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Loading Puzzle...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-white">
      {/* Bulmaca Başlığı */}
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">Puzzle #{currentPuzzle.id ? currentPuzzle.id.slice(0, 8) : 'Loading...'}</h3>
        <div className="flex justify-between items-center">
          <span className={`px-2 py-1 rounded text-xs ${
            currentPuzzle.difficulty === 'easy' ? 'bg-green-500/20 text-green-200' :
            currentPuzzle.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-200' :
            'bg-red-500/20 text-red-200'
          }`}>
            {currentPuzzle.difficulty === 'easy' ? '🟢 Easy' :
             currentPuzzle.difficulty === 'medium' ? '🟡 Medium' :
             '🔴 Hard'}
          </span>
          <span className="text-sm text-gray-300">
            {currentPuzzle.operation === 'addition' ? '➕ Addition' :
             currentPuzzle.operation === 'subtraction' ? '➖ Subtraction' :
             currentPuzzle.operation === 'multiplication' ? '✖️ Multiplication' :
             '❓ Unknown'}
          </span>
        </div>
      </div>

      {/* Zamanlayıcı */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm">Time Left:</span>
          <span className={`text-lg font-bold ${
            timeLeft <= 10 ? 'text-red-400' : 
            timeLeft <= 20 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {timeLeft}s
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
          <div 
            className={`h-2 rounded-full transition-all duration-1000 ${
              timeLeft <= 10 ? 'bg-red-500' : 
              timeLeft <= 20 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${(timeLeft / (currentPuzzle.timeLimit || 30)) * 100}%` }}
          />
        </div>
      </div>

      {/* Bulmaca Sorusu */}
      <div className="mb-4">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
          <p className="text-center text-xl font-bold mb-2">Question:</p>
          <p className="text-center text-2xl font-mono">{currentPuzzle.question || 'Loading puzzle...'}</p>
        </div>
      </div>

      {/* Cevap Girişi */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Your Answer:</label>
        <input
          type="number"
          value={userAnswer || ''}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSubmitting}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      placeholder="Enter your answer..."
        />
      </div>

      {/* Gönder Butonu */}
      <button
        onClick={submitAnswer}
        disabled={isSubmitting || !userAnswer.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isSubmitting ? '⏳ Submitting...' : '🎯 Submit Answer'}
      </button>

      {/* Geri Bildirim */}
      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${
          feedback.type === 'success' ? 'bg-green-500/20 border-green-500' :
          feedback.type === 'error' ? 'bg-red-500/20 border-red-500' :
          'bg-blue-500/20 border-blue-500'
        }`}>
          <p className={`text-sm ${
            feedback.type === 'success' ? 'text-green-200' :
            feedback.type === 'error' ? 'text-red-200' :
            'text-blue-200'
          }`}>
            {feedback.message}
          </p>
        </div>
      )}
    </div>
  );
}
