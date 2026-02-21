import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Quiz, QuizQuestion } from '../../types';
import { notifyNewQuiz } from '../../utils/notificationService';
import { AdminTable } from './AdminCommon';
import { Plus, Trash2, X, Wand2, Loader2 } from 'lucide-react';

export const AdminQuizManager: React.FC = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mode, setMode] = useState<'manual' | 'ai'>('manual');
    const [generating, setGenerating] = useState(false);

    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [genQuestionCount, setGenQuestionCount] = useState(5);
    const [questions, setQuestions] = useState<QuizQuestion[]>([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);

    const fetchQuizzes = async () => {
        const q = query(collection(db, 'bible_quizzes'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Quiz)));
    };

    useEffect(() => { fetchQuizzes(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this quiz?")) return;
        await deleteDoc(doc(db, 'bible_quizzes', id));
        fetchQuizzes();
    };

    const handleCreate = async () => {
        if (mode === 'ai') {
            console.log("🚀 [Frontend AI] Starting quiz generation for topic:", topic);
            setGenerating(true);
            try {
                console.log("📡 [Frontend AI] Calling API: /api/generateQuiz...");
                const response = await fetch('/api/generateQuiz', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        topic: topic || 'General Bible Knowledge',
                        difficulty,
                        questionCount: genQuestionCount,
                    }),
                });

                console.log("⏳ [Frontend AI] Waiting for server response...");

                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMsg = errorData.message || 'AI generation failed.';
                    console.error("❌ [Frontend AI] Quiz generation failed:", errorMsg);
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                console.log("✅ [Frontend AI] Quiz data received from server!");

                if (data.success && data.quiz) {
                    const quizData = data.quiz;
                    console.log("✨ [Frontend AI] Saving generated quiz to Firestore...");
                    await addDoc(collection(db, 'bible_quizzes'), {
                        topic: quizData.topic,
                        difficulty: quizData.difficulty,
                        questions: quizData.questions,
                        createdAt: new Date().toISOString()
                    });
                    console.log("🎉 [Frontend AI] Quiz saved successfully!");
                    await notifyNewQuiz(quizData.topic, difficulty);
                    setIsModalOpen(false);
                    fetchQuizzes();
                    setTopic('');
                }
            } catch (e: any) {
                console.error("💥 [Frontend AI] Error creating quiz:", e);
                alert(`AI generation failed: ${e.message || 'Unknown error'}`);
            } finally {
                console.log("🏁 [Frontend AI] Process finished.");
                setGenerating(false);
            }
        } else {
            await addDoc(collection(db, 'bible_quizzes'), { topic, difficulty, questions, createdAt: new Date().toISOString() });
            await notifyNewQuiz(topic, difficulty);
            setIsModalOpen(false); fetchQuizzes(); setTopic(''); setQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold dark:text-white font-serif">Quiz Manager</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-church-gold hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-church-gold/30 hover:shadow-church-gold/50 transition-all active:scale-95">
                    <Plus size={18} /> Create Quiz
                </button>
            </div>

            <AdminTable headers={['Topic', 'Difficulty', 'Questions', 'Date', 'Actions']}>
                {quizzes.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold dark:text-white">{q.topic}</td>
                        <td className="px-6 py-4"><span className={`uppercase text-xs font-bold px-2 py-1 rounded-full border ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200' : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{q.difficulty}</span></td>
                        <td className="px-6 py-4 font-mono">{q.questions.length}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => handleDelete(q.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                ))}
            </AdminTable>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold dark:text-white font-serif">Create New Quiz</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="text-gray-500" /></button>
                        </div>

                        <div className="flex gap-4 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                            <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-lg font-bold transition-all ${mode === 'manual' ? 'bg-white dark:bg-gray-600 shadow-md text-church-green' : 'text-gray-500'}`}>Manual</button>
                            <button onClick={() => setMode('ai')} className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${mode === 'ai' ? 'bg-white dark:bg-gray-600 shadow-md text-church-gold' : 'text-gray-500'}`}><Wand2 size={18} /> AI Generate</button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Quiz Topic</label>
                                <input placeholder="Ex: Miracles of Jesus, Book of Romans..." className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold dark:text-white" value={topic} onChange={e => setTopic(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Difficulty</label>
                                    <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold dark:text-white" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                                        <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                    </select>
                                </div>
                                {mode === 'ai' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Count</label>
                                            <span className="text-xs font-black text-church-green">{genQuestionCount} Questions</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="10"
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-church-green mt-4"
                                            value={genQuestionCount}
                                            onChange={(e) => setGenQuestionCount(parseInt(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>

                            {mode === 'ai' && (
                                <div className="p-8 text-center bg-church-gold/5 dark:bg-church-gold/10 rounded-2xl border border-church-gold/20 border-dashed">
                                    <Wand2 size={48} className={`mx-auto text-church-gold mb-4 ${generating ? 'animate-spin' : 'animate-bounce'}`} />
                                    <h4 className="font-bold text-gray-900 dark:text-white">AI Prophet Generator</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">I will curate some celestial questions about "{topic || 'The Holy Word'}" for you.</p>
                                </div>
                            )}

                            {mode === 'manual' && (
                                <div className="space-y-6">
                                    {questions.map((q, qIdx) => (
                                        <div key={qIdx} className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-church-green uppercase tracking-widest">Question {qIdx + 1}</span>
                                                {questions.length > 1 && (
                                                    <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))} className="text-red-500 hover:text-red-700 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                placeholder="Enter your question here..."
                                                className="w-full p-3 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-church-gold dark:text-white font-bold"
                                                value={q.question}
                                                onChange={e => {
                                                    const newQ = [...questions];
                                                    newQ[qIdx].question = e.target.value;
                                                    setQuestions(newQ);
                                                }}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex gap-2 items-center">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${qIdx}`}
                                                            checked={q.correctIndex === oIdx}
                                                            onChange={() => {
                                                                const newQ = [...questions];
                                                                newQ[qIdx].correctIndex = oIdx;
                                                                setQuestions(newQ);
                                                            }}
                                                            className="accent-church-gold w-4 h-4"
                                                        />
                                                        <input
                                                            placeholder={`Option ${oIdx + 1}`}
                                                            className="flex-1 p-3 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none text-sm dark:text-white"
                                                            value={opt}
                                                            onChange={e => {
                                                                const newQ = [...questions];
                                                                newQ[qIdx].options[oIdx] = e.target.value;
                                                                setQuestions(newQ);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setQuestions([...questions, { question: '', options: ['', '', '', ''], correctIndex: 0 }])}
                                        className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 font-bold text-xs uppercase tracking-widest hover:border-church-gold hover:text-church-gold transition-all"
                                    >
                                        + Add Another Question
                                    </button>
                                </div>
                            )}

                            <button onClick={handleCreate} disabled={generating || (mode === 'manual' && questions[0].question === '')} className="w-full bg-gradient-to-r from-church-green to-church-gold hover:from-emerald-700 hover:to-amber-500 text-white font-bold py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                {generating ? <Loader2 className="animate-spin" /> : (mode === 'ai' ? 'Invoke AI Generator' : 'Save Manual Quiz')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
