import React, { useState, useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestoreQuery } from '../hooks';
import { Quiz, QuizQuestion } from '../types';
import { Brain, Trophy, ChevronLeft, Clock, Zap } from 'lucide-react';
import { LoadingSpinner, SkeletonCard } from '../components/UIComponents';

const QuizScreen: React.FC = () => {
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

  // Quiz Results Screen
  if (activeQuiz && quizFinished) {
    const percentage = Math.round((score / activeQuiz.questions.length) * 100);
    let resultMessage = '';
    let resultColor = '';

    if (percentage === 100) {
      resultMessage = '🎉 Perfect Score! You are a Bible Master!';
      resultColor = 'from-yellow-400 to-yellow-600';
    } else if (percentage >= 80) {
      resultMessage = '🌟 Excellent! You know your scriptures well!';
      resultColor = 'from-church-green to-emerald-600';
    } else if (percentage >= 60) {
      resultMessage = '👍 Good Job! Keep studying!';
      resultColor = 'from-church-gold to-amber-600';
    } else {
      resultMessage = '📚 Keep learning! Try again!';
      resultColor = 'from-orange-400 to-orange-600';
    }

    return (
      <div className="animate-fade-in-up max-w-2xl mx-auto py-10">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-xl border border-gray-100 dark:border-gray-700 text-center space-y-8">
          <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${resultColor} flex items-center justify-center shadow-2xl`}>
            <Trophy className="w-12 h-12 text-white animate-bounce" />
          </div>

          <div>
            <h2 className="text-4xl font-serif font-bold dark:text-white mb-4">Quiz Completed!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">{resultMessage}</p>
          </div>

          <div className="bg-gradient-to-r from-church-green/10 to-church-gold/10 dark:from-church-green/20 dark:to-church-gold/20 rounded-2xl p-8 border border-church-green/20 dark:border-church-gold/20">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-bold uppercase tracking-widest mb-4">Your Score</p>
            <div className="flex items-baseline justify-center gap-2 mb-6">
              <span className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-church-green to-church-gold">
                {score}
              </span>
              <span className="text-3xl text-gray-400">/ {activeQuiz.questions.length}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${resultColor} transition-all duration-1000 ease-out`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="mt-4 text-xl font-bold text-gray-800 dark:text-white">{percentage}%</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={resetQuiz}
              className="w-full bg-gradient-to-r from-church-green to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 text-lg"
            >
              Try Another Quiz
            </button>
            <button
              onClick={resetQuiz}
              className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-8 py-4 rounded-2xl font-bold transition-all"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz In Progress Screen
  if (activeQuiz && question) {
    const progress = ((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100;

    return (
      <div className="animate-fade-in-up max-w-4xl mx-auto py-10">
        <button
          onClick={resetQuiz}
          className="mb-6 flex items-center text-gray-500 hover:text-church-green dark:hover:text-church-gold transition-colors font-bold gap-2"
        >
          <ChevronLeft size={20} /> Exit Quiz
        </button>

        {/* Progress Bar */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</p>
              <p className="text-2xl font-bold dark:text-white mt-1">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-church-green dark:text-church-gold uppercase">Current Score</p>
              <p className="text-3xl font-bold text-church-green dark:text-church-gold">{score}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-church-green to-church-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-right">{Math.round(progress)}% Complete</p>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 space-y-8">
          {/* Question Header */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${activeQuiz.difficulty === 'easy'
                  ? 'bg-green-500'
                  : activeQuiz.difficulty === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}>
                {currentQuestionIdx + 1}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{activeQuiz.topic}</p>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 capitalize">{activeQuiz.difficulty} Difficulty</p>
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold dark:text-white leading-relaxed">
              {question.question}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {question.options.map((option: string, idx: number) => {
              const isCorrect = idx === question.correctIndex;
              const isSelected = idx === selectedAnswer;
              const showResult = answered && (isCorrect || isSelected);

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={answered}
                  className={`w-full text-left p-6 rounded-2xl border-2 transition-all font-bold text-lg flex items-center gap-4 ${!answered
                      ? 'border-gray-200 dark:border-gray-700 hover:border-church-green hover:bg-church-muted dark:hover:bg-church-green/20 cursor-pointer'
                      : showResult
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'border-gray-200 dark:border-gray-700 opacity-50'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-bold ${!answered
                      ? 'border-gray-300 dark:border-gray-600'
                      : showResult
                        ? isCorrect
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-red-500 bg-red-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    {answered ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + idx)) : String.fromCharCode(65 + idx)}
                  </div>
                  <span className="flex-1">{option}</span>
                  {answered && showResult && (
                    <span className="text-2xl">{isCorrect ? '👍' : '❌'}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info Box */}
          {answered && (
            <div className={`p-4 rounded-xl border-l-4 ${selectedAnswer === question.correctIndex
                ? 'bg-green-50 dark:bg-green-900/20 border-l-green-500 text-green-700 dark:text-green-400'
                : 'bg-amber-50 dark:bg-amber-900/20 border-l-amber-500 text-amber-700 dark:text-amber-400'
              }`}>
              {selectedAnswer === question.correctIndex ? (
                <p className="font-bold">✓ Correct Answer!</p>
              ) : (
                <p className="font-bold">The correct answer is: <span className="underline">{question.options[question.correctIndex]}</span></p>
              )}
            </div>
          )}

          {/* Next Button */}
          {answered && (
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-church-green to-church-gold hover:from-emerald-700 hover:to-emerald-800 text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
            >
              {currentQuestionIdx === activeQuiz.questions.length - 1 ? (
                <>
                  <Zap size={20} /> Finish Quiz
                </>
              ) : (
                <>
                  Next Question <ChevronLeft size={20} className="rotate-180" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz Selection Screen
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-church-green to-church-gold rounded-3xl p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse-slow"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <Brain size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold">Bible Quiz</h2>
              <p className="text-green-50 text-sm font-bold uppercase tracking-wider mt-1">Test your scriptures knowledge</p>
            </div>
          </div>
          <p className="text-lg opacity-90 max-w-2xl leading-relaxed">
            Challenge yourself with our collection of Bible quizzes. From easy to expert level, test how well you know the scriptures.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Quizzes</p>
          <p className="text-4xl font-bold dark:text-white">{quizzes.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Questions</p>
          <p className="text-4xl font-bold dark:text-white">
            {quizzes.reduce((acc: number, q: Quiz) => acc + q.questions.length, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Difficulty Levels</p>
          <p className="text-4xl font-bold dark:text-white">3</p>
        </div>
      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} height="h-64" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="col-span-full text-center p-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
          <Brain size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg font-bold">No quizzes available yet.</p>
          <p className="text-gray-400 text-sm mt-2">Check back later for new quizzes!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz: Quiz) => (
            <div
              key={quiz.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-32 h-32 bg-church-green/10 rounded-full blur-2xl -ml-8 -mt-8 group-hover:bg-church-green/20 transition-all"></div>

              <div className="relative z-10">
                {/* Difficulty Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${quiz.difficulty === 'easy'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : quiz.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    <Zap size={14} />
                    {quiz.difficulty}
                  </div>
                  <Clock size={18} className="text-gray-400" />
                </div>

                {/* Quiz Info */}
                <h3 className="text-xl font-bold font-serif dark:text-white mb-3 group-hover:text-church-green transition-colors line-clamp-2">
                  {quiz.topic}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {quiz.questions.length} Questions
                </p>

                {/* Start Button */}
                <button
                  onClick={() => startQuiz(quiz)}
                  className="w-full bg-gradient-to-r from-church-green to-church-gold hover:from-emerald-700 hover:to-amber-500 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap size={18} /> Start Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizScreen;