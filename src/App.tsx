import React, { useState, useEffect, useRef } from 'react';
import { Settings, Volume2, VolumeX, Maximize, Check, X } from 'lucide-react';
import { GameEngine } from './gameEngine';
import { audio } from './audio';
import { GameStats, Question, Theme, Avatar } from './types';
import { AdminPanel } from './components/AdminPanel';

const defaultQuestions: Question[] = [
    { id: '1', category: 'Math', text: 'What is 8 x 7?', options: ['54', '56', '64', '42'], correctIndex: 1 },
    { id: '2', category: 'Science', text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1 },
    { id: '3', category: 'Geography', text: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3 },
    { id: '4', category: 'Math', text: 'What is the square root of 144?', options: ['12', '14', '10', '16'], correctIndex: 0 },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  const [stats, setStats] = useState<GameStats>({
      xp: 0, coins: 0, streak: 0, lives: 3, totalCorrect: 0, totalAnswered: 0, categoryStats: {}
  });
  
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'wrong' | null>(null);
  
  const [theme, setTheme] = useState<Theme>('default');
  const [avatar, setAvatar] = useState<Avatar>(() => (localStorage.getItem('runner_avatar') as Avatar) || 'mario');
  const [muted, setMuted] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [timeLeft, setTimeLeft] = useState(20);

  // Initialize Canvas Game Engine
  useEffect(() => {
     if (canvasRef.current && !gameEngineRef.current) {
          gameEngineRef.current = new GameEngine(canvasRef.current);
          gameEngineRef.current.setAvatar(avatar);
          gameEngineRef.current.start();
     }
     return () => {
         if (gameEngineRef.current) {
             gameEngineRef.current.stop();
             gameEngineRef.current = null;
         }
     }
  }, []);

  // Sync state changes down to game engine
  useEffect(() => {
      if (gameEngineRef.current) gameEngineRef.current.setTheme(theme);
  }, [theme]);

  // Sync avatar to game engine
  useEffect(() => {
      if (gameEngineRef.current) gameEngineRef.current.setAvatar(avatar);
  }, [avatar]);

  // Pause gameplay when admin open or structurally paused
  useEffect(() => {
      if (gameEngineRef.current) gameEngineRef.current.setPaused(isPaused || adminOpen);
  }, [isPaused, adminOpen]);



  // Timer Logic
  useEffect(() => {
      if (isPaused || adminOpen || answerStatus || stats.lives <= 0) return;
      
      const t = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  handleTimeout();
                  return timerSeconds;
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(t);
  }, [isPaused, adminOpen, answerStatus, timerSeconds, stats.lives, currentQuestionIndex]);

  const handleTimeout = () => {
      handleAnswer(-1, true); 
  };

  const handleSkip = () => {
      setTimeLeft(timerSeconds);
      setCurrentQuestionIndex((prev) => (prev + 1) % Math.max(1, questions.length));
  };

  const handleAnswer = (idx: number, isTimeout = false) => {
      if (answerStatus || questions.length === 0) return;
      setSelectedAnswer(idx);
      audio.init();

      const q = questions[currentQuestionIndex];
      const correct = !isTimeout && idx === q.correctIndex;

      setStats(prev => {
          const newStats = { ...prev };
          newStats.totalAnswered++;
          if (!newStats.categoryStats[q.category]) {
              newStats.categoryStats[q.category] = { correct: 0, total: 0 };
          }
          newStats.categoryStats[q.category].total++;

          if (correct) {
              newStats.xp += 100;
              newStats.coins += 10;
              newStats.streak++;
              newStats.totalCorrect++;
              newStats.categoryStats[q.category].correct++;
          } else {
              newStats.streak = 0;
              newStats.lives = Math.max(0, newStats.lives - 1);
          }
          return newStats;
      });

      if (correct) {
          setAnswerStatus('correct');
          if (gameEngineRef.current) gameEngineRef.current.triggerCorrect();
      } else {
          setAnswerStatus('wrong');
          if (gameEngineRef.current) gameEngineRef.current.triggerWrong();
      }

      // Automatically proceed after feedback delay
      setTimeout(() => {
          setAnswerStatus(null);
          setSelectedAnswer(null);
          setTimeLeft(timerSeconds);
          setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
      }, 2000);
  };

  const toggleMute = () => {
      setMuted(!muted);
      audio.setMuted(!muted);
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(e => console.log(e));
      } else {
          document.exitFullscreen();
      }
  };

  const currentQ = questions[currentQuestionIndex];

  return (
      <div className="h-screen w-full flex flex-col font-sans bg-slate-900 text-white overflow-hidden relative" style={{ backgroundColor: 'var(--game-bg, #0B0B2A)' }}>
          {/* Top Bar HUD */}
          <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-start z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-start sm:items-center pointer-events-auto">
                 <div className="font-bold text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">✨ XP: {stats.xp}</div>
                 <div className="font-bold text-xl text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">🪙 Coins: {stats.coins}</div>
                 <div className="font-bold text-xl text-red-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{'❤️'.repeat(stats.lives)}{'🤍'.repeat(3 - stats.lives)}</div>
                 <div className="font-bold text-xl text-orange-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">🔥 Streak: {stats.streak}</div>
              </div>
              <div className="flex gap-3 pointer-events-auto mt-2 sm:mt-0">
                  <button onClick={toggleMute} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition border border-white/20">
                      {muted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                  </button>
                  <button onClick={toggleFullscreen} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition border border-white/20 hidden sm:block">
                      <Maximize className="w-5 h-5"/>
                  </button>
                  <button onClick={() => setAdminOpen(true)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition border border-white/20">
                      <Settings className="w-5 h-5"/>
                  </button>
              </div>
          </div>

          {/* Top 60% Canvas Gameplay Area */}
          <div className="h-[60vh] w-full relative shrink-0">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
              {/* Progress Bar overlay on bottom of canvas */}
              <div className="absolute bottom-0 w-full h-3 bg-black/50 overflow-hidden backdrop-blur-sm">
                  <div className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 transition-all duration-300 shadow-[0_0_10px_rgba(72,187,120,0.8)]" 
                       style={{ width: `${questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0}%` }}></div>
              </div>
          </div>

          {/* Bottom 40% Quiz Interface */}
          <div className="flex-1 w-full bg-slate-800 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center relative shadow-[0_-15px_30px_rgba(0,0,0,0.4)] z-20 overflow-y-auto">
              
              {stats.lives <= 0 ? (
                  <div className="text-center bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-xl">
                     <h2 className="text-5xl font-extrabold text-red-500 mb-4 drop-shadow-md">Game Over!</h2>
                     <p className="mb-8 text-2xl text-slate-300">Final Score: <span className="text-white font-bold">{stats.xp} XP</span></p>
                     <button onClick={() => {
                         setStats({ xp: 0, coins: 0, streak: 0, lives: 3, totalCorrect: 0, totalAnswered: 0, categoryStats: {} });
                         setCurrentQuestionIndex(0);
                         setTimeLeft(timerSeconds);
                         setIsPaused(false);
                     }} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-2xl shadow-lg transition transform hover:scale-105">
                         Play Again
                     </button>
                  </div>
              ) : currentQ ? (
                  <div className="w-full max-w-5xl mx-auto flex flex-col h-full justify-center space-y-4">
                       <div className="flex justify-between items-center px-2">
                           <span className="text-slate-400 font-bold tracking-wider uppercase text-sm">
                               Question {currentQuestionIndex + 1} of {questions.length} <span className="mx-2">•</span> <span className="text-indigo-400">{currentQ.category}</span>
                           </span>
                           <div className={`font-mono font-bold text-2xl flex items-center gap-2 ${timeLeft <= 5 ? 'text-red-400 animate-pulse drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]' : 'text-slate-300'}`}>
                               ⏱ 00:{timeLeft.toString().padStart(2, '0')}
                           </div>
                       </div>
                       
                       <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6 text-center text-white drop-shadow-lg leading-tight px-4">
                           {currentQ.text}
                       </h2>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                           {currentQ.options.map((opt, i) => {
                               const isSelected = selectedAnswer === i;
                               const isCorrect = i === currentQ.correctIndex;
                               
                               let btnClass = "bg-slate-700/80 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-slate-100";
                               let icon = null;
                               
                               if (answerStatus) {
                                   if (isCorrect) {
                                       btnClass = "bg-green-600 border-green-400 shadow-[0_0_15px_rgba(56,161,105,0.6)] text-white scale-[1.02] z-10";
                                       icon = <Check className="w-8 h-8 ml-auto text-green-200" />;
                                   } else if (isSelected) {
                                       btnClass = "bg-red-600/90 border-red-500 shadow-inner text-white scale-[0.98]";
                                       icon = <X className="w-8 h-8 ml-auto text-red-200" />;
                                   } else {
                                       btnClass = "bg-slate-800/50 border-slate-700/50 text-slate-500 opacity-60";
                                   }
                               }

                               return (
                                   <button 
                                       key={i}
                                       disabled={!!answerStatus}
                                       onClick={() => handleAnswer(i)}
                                       className={`flex items-center text-left px-6 py-5 rounded-2xl text-xl sm:text-2xl font-bold transition-all duration-200 transform ${btnClass}`}
                                   >
                                       <span className="bg-black/30 w-10 h-10 flex items-center justify-center rounded-full mr-5 text-lg font-black shrink-0 border border-white/10">
                                           {['A', 'B', 'C', 'D'][i]}
                                       </span>
                                       <span className="flex-1 leading-snug break-words">{opt}</span>
                                       {icon}
                                   </button>
                               )
                           })}
                       </div>
                  </div>
              ) : (
                  <div className="text-2xl font-bold text-slate-400 animate-pulse">No questions available. Open the dashboard to add some!</div>
              )}
          </div>

          {adminOpen && (
              <AdminPanel 
                  stats={stats}
                  questions={questions}
                  setQuestions={setQuestions}
                  onClose={() => setAdminOpen(false)}
                  setTheme={setTheme}
                  timerSeconds={timerSeconds}
                  setTimerSeconds={(s) => { setTimerSeconds(Math.max(5, s)); setTimeLeft(Math.max(5, s)); }}
                  isPaused={isPaused}
                  setIsPaused={setIsPaused}
                  onSkip={handleSkip}
                  avatar={avatar}
                  setAvatar={setAvatar}
              />
          )}

      </div>
  );
}
