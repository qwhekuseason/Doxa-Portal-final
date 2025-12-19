import React, { useState, useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Quiz, QuizQuestion, UserProfile } from '../types';
import { Brain, Trophy, ChevronLeft, Clock, Zap, Star, Flame, Target, ArrowRight, Share2, RefreshCcw, X } from 'lucide-react';
import { LoadingSpinner, SkeletonCard, SectionHeader, StatCard } from '../components/UIComponents';

const QuizScreen: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const quizQ = useMemo(() => query(collection(db, 'bible_quizzes'), orderBy('createdAt', 'desc')), []);
  const { data: quizzes, loading } = useFirestoreQuery<Quiz>(quizQ);

  const handleAnswer = (optionIdx: number) => {
    if (answered || !activeQuiz) return;

    setSelectedAnswer(optionIdx);
    setAnswered(true);

    if (optionIdx === activeQuiz.questions[currentQuestionIdx].correctIndex) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (!activeQuiz) return;

    if (currentQuestionIdx < activeQuiz.questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setAnswered(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetQuiz = () => {
    setActiveQuiz(null);
    setQuizFinished(false);
    setScore(0);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAnswered(false);
  };

  let question: QuizQuestion | undefined;
  if (activeQuiz && !quizFinished) {
    question = activeQuiz.questions[currentQuestionIdx];
  }

  // --- 1. Quiz Results Screen ---
  if (activeQuiz && quizFinished) {
    const percentage = Math.round((score / activeQuiz.questions.length) * 100);
    let resultMessage = '';
    let resultColor = '';
    let resultIcon = <Trophy size={48} />;

    if (percentage === 100) {
      resultMessage = 'Perfect Score! You are a Bible Master!';
      resultColor = 'from-church-gold to-yellow-600';
    } else if (percentage >= 80) {
      resultMessage = 'Excellent! You know your scriptures well!';
      resultColor = 'from-church-green to-emerald-600';
    } else if (percentage >= 60) {
      resultMessage = 'Good Job! Keep studying and growing!';
      resultColor = 'from-blue-500 to-indigo-600';
      resultIcon = <Star size={48} />;
    } else {
      resultMessage = 'Keep learning! Try again to master this topic!';
      resultColor = 'from-orange-400 to-rose-600';
      resultIcon = <Brain size={48} />;
    }

    return (
      <div className="animate-fade-in max-w-2xl mx-auto py-12">
        <div className="glass-card rounded-[3rem] p-12 shadow-premium text-center border-white/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-church-gold/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

          <div className={`w-32 h-32 mx-auto rounded-[2.5rem] bg-gradient-to-br ${resultColor} flex items-center justify-center shadow-2xl shadow-black/20 mb-10 transform scale-110`}>
            <div className="text-white animate-float">{resultIcon}</div>
          </div>

          <div className="space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Victory!</h2>
            <p className="text-gray-400 font-bold text-lg uppercase tracking-widest">{resultMessage}</p>
          </div>

          {/* Score Indicator */}
          <div className="relative inline-block mb-12">
            <div className="w-48 h-48 rounded-full border-[12px] border-gray-100 dark:border-white/5 flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-church-green tracking-tighter">{score}</span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Out of {activeQuiz.questions.length}</span>
            </div>
            <svg className="absolute inset-0 w-48 h-48 -rotate-90">
              <circle
                cx="96" cy="96" r="84"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-church-green shadow-glow"
                strokeDasharray={`${(percentage / 100) * 527.7} 527.7`}
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Percentage</p>
              <p className="text-2xl font-black text-church-green">{percentage}%</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">XP Gained</p>
              <p className="text-2xl font-black text-church-gold">+{percentage * 10}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={resetQuiz}
              className="w-full bg-church-green text-white px-8 py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-church-green/30 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <RefreshCcw size={20} /> Retake Another
            </button>
            <button
              onClick={() => { }}
              className="w-full glass-card border-none px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-gray-500 hover:text-church-green transition-all flex items-center justify-center gap-3"
            >
              <Share2 size={20} /> Share Achievement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. Quiz In Progress Screen ---
  if (activeQuiz && question) {
    const progress = ((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100;

    return (
      <div className="animate-fade-in max-w-4xl mx-auto py-10 relative">
        <div className="flex items-center justify-between mb-12 px-2">
          <button
            onClick={resetQuiz}
            className="flex items-center gap-3 p-3 glass-card border-none rounded-2xl text-gray-500 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <X size={18} /> Abort Mission
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Spirit Score</p>
              <p className="text-2xl font-black text-church-green tracking-tighter leading-none">{score * 100}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-church-green/10 flex items-center justify-center text-church-green shadow-inner">
              <Target size={24} />
            </div>
          </div>
        </div>

        {/* Progress Header */}
        <div className="mb-12 space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Quest Progress</h3>
            <span className="text-xl font-black text-church-gold tracking-tighter">{currentQuestionIdx + 1} / {activeQuiz.questions.length}</span>
          </div>
          <div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-1 shadow-inner border border-gray-100 dark:border-white/5">
            <div
              className="h-full bg-gradient-to-r from-church-green to-church-gold rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="glass-card rounded-[3rem] p-10 md:p-14 shadow-premium border-white/20 relative group overflow-hidden animate-fade-in-up">
          <div className="absolute top-0 right-0 w-64 h-64 bg-church-green/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

          {/* Question Category */}
          <div className="flex items-center gap-3 mb-10">
            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${activeQuiz.difficulty === 'easy' ? 'bg-green-500 text-white' :
              activeQuiz.difficulty === 'medium' ? 'bg-church-gold text-white' : 'bg-red-500 text-white'
              }`}>
              {activeQuiz.difficulty} Mode
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">• {activeQuiz.topic}</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-[1.1] mb-12 tracking-tighter">
            {question.question}
          </h2>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {question.options.map((option: string, idx: number) => {
              const isCorrect = idx === question.correctIndex;
              const isSelected = idx === selectedAnswer;
              const showResult = answered && (isCorrect || isSelected);

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={answered}
                  className={`group relative text-left p-6 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-5 overflow-hidden ${!answered
                    ? 'bg-transparent border-gray-100 dark:border-white/10 hover:border-church-green hover:shadow-xl hover:-translate-y-1'
                    : isCorrect
                      ? 'border-church-green bg-church-green/10 text-church-green dark:text-church-green'
                      : isSelected
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'border-transparent opacity-40 grayscale'
                    }`}
                >
                  {!answered && <div className="absolute inset-0 bg-church-green/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-lg ${!answered
                    ? 'glass-card border-none text-gray-400'
                    : isCorrect ? 'bg-church-green text-white' : 'bg-red-500 text-white'
                    }`}>
                    {answered ? (isCorrect ? '✓' : '✗') : String.fromCharCode(65 + idx)}
                  </div>
                  <span className="flex-1 font-bold text-lg tracking-tight">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback Area */}
          <div className={`h-28 flex items-center transition-all duration-500 ${answered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className={`w-full p-6 rounded-[2rem] flex items-center justify-between ${selectedAnswer === question.correctIndex ? 'bg-church-green/5 text-church-green' : 'bg-red-50/50 dark:bg-red-900/10 text-red-500'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${selectedAnswer === question.correctIndex ? 'bg-church-green text-white' : 'bg-red-500 text-white'}`}>
                  {selectedAnswer === question.correctIndex ? <Flame /> : <Brain />}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Result Feedback</p>
                  <p className="font-black tracking-tight">{selectedAnswer === question.correctIndex ? 'Radiant! Your spirit is sharp.' : `Almost! The truth is: ${question.options[question.correctIndex]}`}</p>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                {currentQuestionIdx === activeQuiz.questions.length - 1 ? 'Finalize' : 'Continue'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. Quiz Selection Screen ---
  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <SectionHeader
        title="Temple of Wisdom"
        subtitle="Embark on quests to deepen your understanding of the Divine Word. Earn XP and master the scriptures."
      />

      {/* Profile Header Widget */}
      <section className="relative rounded-[2.5rem] overflow-hidden shadow-premium group bg-gradient-to-br from-indigo-900 to-slate-900">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 p-6 flex items-center justify-center text-church-gold shadow-2xl">
            <Trophy size={64} className="animate-float" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <span className="px-3 py-1 bg-church-gold/20 text-church-gold text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-church-gold/20">Elite Scholar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-church-green animate-pulse"></span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase mb-4 leading-none">Your Progress</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-white">{quizzes.length}</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Quests<br />Available</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-church-green">{((user?.stats?.quizPoints || 0) / 1000).toFixed(1)}k</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total<br />Experience</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-church-gold">{user?.stats?.quizzesTaken || 0}</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Quizzes<br />Completed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? [1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} height="h-80" />
        )) : quizzes.length === 0 ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center glass-card rounded-[3rem] border-none">
            <Brain size={64} className="text-gray-200 mb-6" />
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">No Quests Found</h3>
            <p className="text-gray-400 font-medium">Check back soon for new divine challenges!</p>
          </div>
        ) : quizzes.map((quiz: Quiz, idx: number) => (
          <div
            key={quiz.id}
            className="group glass-card border-white/40 dark:border-white/5 rounded-[2.5rem] p-8 hover:shadow-premium hover:-translate-y-2 transition-all duration-700 relative overflow-hidden flex flex-col h-full animate-fade-in-up"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-150 ${quiz.difficulty === 'easy' ? 'bg-green-500' :
              quiz.difficulty === 'medium' ? 'bg-church-gold' : 'bg-red-500'
              }`}></div>

            <div className="flex items-center justify-between mb-8">
              <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${quiz.difficulty === 'easy' ? 'bg-green-500 text-white' :
                quiz.difficulty === 'medium' ? 'bg-church-gold text-white' : 'bg-red-500 text-white'
                }`}>
                {quiz.difficulty} Level
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{quiz.questions.length * 2} MIN</span>
              </div>
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 group-hover:text-church-green transition-colors tracking-tighter leading-tight line-clamp-2">
              {quiz.topic}
            </h3>

            <div className="flex items-center gap-6 mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-church-green">
                  <Target size={16} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{quiz.questions.length} Questions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-church-gold">
                  <Star size={16} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">+{quiz.questions.length * 10} XP</span>
              </div>
            </div>

            <button
              onClick={() => startQuiz(quiz)}
              className="mt-auto w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 group-hover:bg-church-green group-hover:text-white group-hover:border-church-green py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-sm group-hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              Begin Quest <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizScreen;