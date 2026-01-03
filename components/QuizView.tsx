
import React, { useState, useEffect } from 'react';
import { Book, QuizQuestion } from '../types';
import { generateQuizFromNotes } from '../services/geminiService';

interface QuizViewProps {
  book: Book;
  onClose: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ book, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initQuiz = async () => {
      try {
        const generated = await generateQuizFromNotes(book.title, book.notes);
        if (generated.length === 0) {
          setError("沒有足夠的標記筆記來生成測驗。");
        } else {
          setQuestions(generated);
        }
      } catch (e) {
        setError("無法連接 AI 服務，請稍後再試。");
      } finally {
        setLoading(false);
      }
    };
    initQuiz();
  }, [book]);

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background-dark">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-neon"></div>
          <div className="absolute inset-2 border-4 border-secondary border-b-transparent rounded-full animate-spin [animation-direction:reverse] opacity-50"></div>
        </div>
        <h2 className="text-xl font-bold font-display text-white tracking-widest uppercase">Analyzing Notes...</h2>
        <p className="text-text-sub mt-3 text-sm font-light italic">Gemini 正在為您構建知識神經網絡</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background-dark">
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">error</span>
        <h2 className="text-xl font-bold text-white">{error}</h2>
        <button onClick={onClose} className="mt-8 bg-surface-card border border-white/10 text-white px-8 py-3 rounded-xl hover:border-primary transition-all">返回書架</button>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background-dark">
        <div className="relative mb-8">
          <span className="material-symbols-outlined text-primary text-9xl filled drop-shadow-[0_0_20px_rgba(0,242,255,0.5)]">workspace_premium</span>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-secondary/20 rounded-full blur-xl animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold font-display tracking-widest text-white uppercase">Mission Complete</h2>
        <p className="text-6xl font-black text-primary my-6 drop-shadow-[0_0_15px_rgba(0,242,255,0.8)] font-display">
          {Math.round((score / questions.length) * 100)}<span className="text-2xl ml-1">%</span>
        </p>
        <p className="text-text-sub tracking-widest uppercase text-xs">Accuracy Level // {score} OF {questions.length}</p>
        <button onClick={onClose} className="mt-12 bg-primary text-black w-full py-4 rounded-2xl font-bold text-lg shadow-neon transform hover:scale-105 transition-all">返回神經中樞</button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="flex flex-col h-full bg-background-dark relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

      <header className="sticky top-0 z-40 glass-panel p-4 flex justify-between items-center">
        <button onClick={onClose} className="text-text-sub hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
        <span className="font-bold text-[10px] uppercase tracking-[0.2em] text-white/50">Knowledge Retrieval // {book.title}</span>
        <span className="text-primary font-bold text-xs font-display">{currentIndex + 1} / {questions.length}</span>
      </header>

      <div className="p-6 flex-1 flex flex-col relative z-10">
        <div className="bg-surface-card/40 border border-primary/20 p-5 rounded-2xl mb-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-neon"></div>
          <h3 className="text-lg font-bold leading-relaxed text-white tracking-wide">{currentQ.question}</h3>
        </div>

        <div className="space-y-4">
          {currentQ.options.map((option, idx) => {
            let stateStyle = 'bg-surface-card/30 border-white/5 text-text-sub hover:border-primary/40 hover:text-white';
            if (selectedOption) {
              if (option === currentQ.correctAnswer) {
                stateStyle = 'bg-primary/20 border-primary text-primary shadow-neon-sm font-bold';
              } else if (option === selectedOption) {
                stateStyle = 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
              } else {
                stateStyle = 'bg-surface-card/10 border-white/5 text-white/20 opacity-50';
              }
            }
            
            return (
              <button
                key={idx}
                disabled={!!selectedOption}
                onClick={() => handleOptionSelect(option)}
                className={`w-full p-4 rounded-xl border transition-all text-left group flex items-start gap-4 ${stateStyle}`}
              >
                <span className={`text-xs font-bold font-display px-2 py-0.5 rounded ${selectedOption && option === currentQ.correctAnswer ? 'bg-primary text-black' : 'bg-white/5 text-text-sub'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm">{option}</span>
              </button>
            );
          })}
        </div>

        {selectedOption && (
          <div className="mt-8 p-5 bg-white/5 border-l-2 border-secondary rounded-r-xl animate-fade-in backdrop-blur-sm">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">info</span>
              Explanation // Insight
            </p>
            <p className="text-sm text-text-main leading-relaxed font-light italic">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      <footer className="p-6 relative z-10">
        <button 
          onClick={nextQuestion}
          disabled={!selectedOption}
          className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all transform ${
            selectedOption 
              ? 'bg-primary text-black shadow-neon hover:scale-105 active:scale-95' 
              : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
          }`}
        >
          {currentIndex === questions.length - 1 ? 'CHECK SYSTEM RESULTS' : 'INITIATE NEXT PROMPT'}
        </button>
      </footer>
    </div>
  );
};

export default QuizView;
