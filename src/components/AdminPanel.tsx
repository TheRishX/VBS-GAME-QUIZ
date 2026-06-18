import React, { useState } from 'react';
import { GameStats, Question, Theme, Avatar } from '../types';

interface AdminPanelProps {
    stats: GameStats;
    questions: Question[];
    setQuestions: (q: Question[]) => void;
    onClose: () => void;
    setTheme: (t: Theme) => void;
    timerSeconds: number;
    setTimerSeconds: (s: number) => void;
    isPaused: boolean;
    setIsPaused: (p: boolean) => void;
    onSkip: () => void;
    avatar: Avatar;
    setAvatar: (a: Avatar) => void;
}

export function AdminPanel({
    stats, questions, setQuestions, onClose, setTheme, timerSeconds, setTimerSeconds, isPaused, setIsPaused, onSkip, avatar, setAvatar
}: AdminPanelProps) {
    const [ytUrl, setYtUrl] = useState('');
    const [bulkImportOpen, setBulkImportOpen] = useState(false);
    const [bulkMarkdown, setBulkMarkdown] = useState('');
    const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleBulkImport = (replace: boolean) => {
        if (!bulkMarkdown.trim()) {
            setImportMsg({ type: 'error', text: 'Please paste some markdown text first!' });
            return;
        }

        try {
            const lines = bulkMarkdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const parsed: Question[] = [];
            
            let currentQ: {
                text: string;
                options: string[];
                correctIndex: number;
                category: string;
            } | null = null;
            
            const saveCurrent = () => {
                if (currentQ && currentQ.text && currentQ.options.length > 0) {
                    const opts = [...currentQ.options];
                    while (opts.length < 4) {
                        opts.push(`Option ${opts.length + 1}`);
                    }
                    parsed.push({
                        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
                        category: currentQ.category || 'Imported',
                        text: currentQ.text,
                        options: opts.slice(0, 4),
                        correctIndex: Math.max(0, Math.min(currentQ.correctIndex, opts.length - 1))
                    });
                }
                currentQ = null;
            };
            
            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                
                // 1. Check if Category marker
                if (lowerLine.startsWith('category:')) {
                    const cat = line.substring(9).trim();
                    if (currentQ) {
                        currentQ.category = cat;
                    }
                    continue;
                }
                
                // 2. Check if Answer indicator
                if (lowerLine.startsWith('correct:') || lowerLine.startsWith('answer:') || lowerLine.startsWith('correct answer:') || lowerLine.startsWith('ans:')) {
                    if (currentQ) {
                        const ansStr = line.substring(line.indexOf(':') + 1).trim().toUpperCase();
                        let ansIdx = 0;
                        if (ansStr === 'A' || ansStr === '1') ansIdx = 0;
                        else if (ansStr === 'B' || ansStr === '2') ansIdx = 1;
                        else if (ansStr === 'C' || ansStr === '3') ansIdx = 2;
                        else if (ansStr === 'D' || ansStr === '4') ansIdx = 3;
                        else {
                            const parsedNum = parseInt(ansStr, 10);
                            if (!isNaN(parsedNum)) {
                                ansIdx = parsedNum - 1;
                            }
                        }
                        currentQ.correctIndex = ansIdx;
                    }
                    continue;
                }
                
                // 3. Option matching
                const optionMatch = line.match(/^[-*+]\s+\[[ xX]\]\s*(.*)/) || // - [ ] Option
                                    line.match(/^[-*+]\s+([a-dA-D1-4])[\).]\s+(.*)/) || // - A) Option
                                    line.match(/^([a-dA-D1-4])[\).]\s+(.*)/); // A. Option
                
                if (optionMatch) {
                    if (currentQ) {
                        const optText = (optionMatch[2] || optionMatch[1] || '').trim();
                        currentQ.options.push(optText);
                    }
                    continue;
                }
                
                // Bullet format list matching without specific suffix letter
                if (line.match(/^[-*+]\s+(.*)/)) {
                    if (currentQ) {
                        const optText = line.replace(/^[-*+]\s+/, '').trim();
                        currentQ.options.push(optText);
                    }
                    continue;
                }
                
                // 4. Question Text identifier
                const looksLikeDivider = line.startsWith('#') || line.match(/^\d+[\).]\s+/);
                const hasOptions = currentQ && currentQ.options.length > 0;
                
                if (looksLikeDivider || !currentQ || hasOptions) {
                    saveCurrent();
                    
                    const cleanTxt = line.replace(/^#+\s/g, '')
                                         .replace(/^\d+[\).]\s/g, '')
                                         .replace(/^\*\*|\*\*$/g, '')
                                         .trim();
                                         
                    currentQ = {
                        text: cleanTxt,
                        options: [],
                        correctIndex: 0,
                        category: 'Imported'
                    };
                } else {
                    if (currentQ) {
                        const cleanTxt = line.replace(/^\*\*|\*\*$/g, '').trim();
                        currentQ.text += ' ' + cleanTxt;
                    }
                }
            }
            
            saveCurrent();

            if (parsed.length === 0) {
                setImportMsg({ type: 'error', text: 'Could not parse any valid MCQs. Try the sample format!' });
                return;
            }

            if (replace) {
                setQuestions(parsed);
                setImportMsg({ type: 'success', text: `Success! Replaced all with ${parsed.length} imported questions.` });
            } else {
                setQuestions([...questions, ...parsed]);
                setImportMsg({ type: 'success', text: `Success! Added ${parsed.length} imported questions to the pool.` });
            }
            setBulkMarkdown('');
            setTimeout(() => {
                setImportMsg(null);
            }, 3500);
        } catch (err) {
            setImportMsg({ type: 'error', text: 'Error parsing markdown: please check your structure.' });
        }
    };
    
    const handleAddQuestion = () => {
         const newQ: Question = {
             id: Date.now().toString(),
             category: 'General',
             text: 'New Question?',
             options: ['A', 'B', 'C', 'D'],
             correctIndex: 0
         };
         setQuestions([...questions, newQ]);
    };

    const handleApplyTheme = () => {
         const lower = ytUrl.toLowerCase();
         let newTheme: Theme = 'default';
         let mainBg = '#87CEEB';

         if (lower.includes('space') || lower.includes('star') || lower.includes('galaxy')) {
             newTheme = 'space';
             mainBg = '#0B0B2A';
         } else if (lower.includes('jungle') || lower.includes('forest') || lower.includes('nature')) {
             newTheme = 'jungle';
             mainBg = '#1e401e';
         }

         setTheme(newTheme);
         document.documentElement.style.setProperty('--game-bg', mainBg);
    };

    const handleAvatarSelect = (selected: Avatar) => {
         setAvatar(selected);
         localStorage.setItem('runner_avatar', selected);
    };

    return (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
           <div className="bg-white text-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black font-semibold text-2xl transition">✕</button>
              <h2 className="text-3xl font-black mb-6 text-indigo-950 flex items-center gap-2">🛠 Parent & Teacher Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                      {/* Character Avatar Selection Grid */}
                      <section className="mb-8 bg-slate-50 p-5 rounded-xl border border-slate-200">
                          <h3 className="text-xl font-bold mb-3 text-slate-800 flex items-center gap-1">🎮 Choose Runner Character</h3>
                          <p className="text-sm text-slate-500 mb-4">Choose the animated running character shown on the 5D realistic game canvas.</p>
                          <div className="grid grid-cols-2 gap-3">
                              {[
                                  { id: 'mario', name: '🔴 Red Mario (Default)', desc: 'Iconic cap & mustache overalls' },
                                  { id: 'robot', name: '🤖 Mecha Cyber Robot', desc: 'Glowing reactor core, red visor' },
                                  { id: 'ninja', name: '🥷 Stealth Shadow Ninja', desc: 'Charcoal suit & floating red headband' },
                                  { id: 'animal', name: '🦕 Little Cute Dino', desc: 'Retro scales, spikes & big eyes' }
                              ].map(char => (
                                  <button
                                      key={char.id}
                                      onClick={() => handleAvatarSelect(char.id as Avatar)}
                                      className={`p-3 text-left rounded-xl border-2 transition-all duration-200 ${
                                          avatar === char.id
                                              ? 'border-indigo-600 bg-indigo-50/70 shadow-md scale-[1.02]'
                                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                                      }`}
                                  >
                                      <div className="font-bold text-slate-800 text-sm">{char.name}</div>
                                      <div className="text-xs text-slate-400 mt-1">{char.desc}</div>
                                  </button>
                              ))}
                          </div>
                      </section>

                      <section className="mb-0">
                          <h3 className="text-xl font-bold border-b pb-2 mb-4 text-slate-800">Analytics Overview</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total XP</div>
                                  <div className="text-3xl font-black text-blue-900">{stats.xp}</div>
                              </div>
                              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                  <div className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Coins Gathered</div>
                                  <div className="text-3xl font-black text-yellow-900">{stats.coins}</div>
                              </div>
                              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wider">Overall Accuracy</div>
                                  <div className="text-3xl font-black text-green-900">
                                      {stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0}%
                                  </div>
                              </div>
                              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                  <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Questions Done</div>
                                  <div className="text-3xl font-black text-purple-900">{stats.totalAnswered}</div>
                              </div>
                          </div>
                      </section>
                  </div>

                  <div>
                      <section className="mb-8">
                          <h3 className="text-xl font-bold border-b pb-2 mb-4 text-slate-800">Classroom Controls</h3>
                          <div className="flex gap-2 mb-4 flex-wrap">
                              <button onClick={() => setIsPaused(!isPaused)} className={`px-4 py-2 font-bold rounded text-white transition ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                  {isPaused ? '▶ Resume Gameplay' : '⏸ Pause Gameplay'}
                              </button>
                              <button onClick={onSkip} className="px-4 py-2 font-bold bg-orange-600 text-white rounded hover:bg-orange-700 transition">
                                  ⏭ Skip Question
                              </button>
                          </div>
                          <div className="flex items-center gap-3">
                              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Time Limit Per Turn:</label>
                              <input type="number" value={timerSeconds} onChange={e => setTimerSeconds(Number(e.target.value))} className="border border-slate-300 p-2 rounded w-32 focus:ring-2 focus:ring-indigo-500 outline-none" min="5" max="120" />
                          </div>
                      </section>

                      <section className="mb-8">
                          <h3 className="text-xl font-bold border-b pb-2 mb-4 text-slate-800">Dynamic Theme Generator</h3>
                          <p className="text-xs text-gray-500 mb-2">Paste a YouTube URL to adapt visual styles (detects "space", "jungle" to update canvas styles).</p>
                          <div className="flex gap-2">
                              <input type="text" placeholder="https://youtube.com/watch?v=..." value={ytUrl} onChange={e => setYtUrl(e.target.value)} className="border border-slate-300 p-2 rounded flex-1 focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder:text-gray-400" />
                              <button onClick={handleApplyTheme} className="px-4 py-2 font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm">Parse URL</button>
                          </div>
                      </section>

                      <section className="mb-8 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                          <div className="flex justify-between items-center mb-2">
                              <h3 className="text-xl font-bold text-indigo-950 flex items-center gap-1">📦 Bulk Quiz Markdown Importer</h3>
                              <button 
                                  onClick={() => {
                                      setBulkMarkdown(
`### 1. Which mountain is the tallest in the world?
- A) Mount K2
- B) Mount Everest
- C) Mount Kilimanjaro
- D) Mount Fuji
Correct: B

### 2. What is the symbol for Gold on the periodic table?
- A) Ag
- B) Au
- C) Pb
- D) Fe
Correct: B`
                                      );
                                  }}
                                  className="text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-2.5 py-1 rounded transition"
                              >
                                  📋 Load Sample Format
                              </button>
                          </div>
                          
                          <p className="text-xs text-indigo-800/80 mb-3 leading-relaxed">
                              Paste multiple choice questions in <strong>Markdown format</strong> below. You can include question headings, bullet points <code>- A)</code>, <code>- B)</code>, etc., and mark the correct answer with <code>Correct: B</code> or <code>Answer: 2</code>.
                          </p>

                          <textarea
                              rows={5}
                              value={bulkMarkdown}
                              onChange={(e) => setBulkMarkdown(e.target.value)}
                              placeholder={`### 1. What is 5 + 5?
- A) 8
- B) 10
- C) 12
- D) 15
Correct: B

### 2. What color is grass?
...`}
                              className="w-full p-3 text-sm font-mono border border-indigo-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                          />

                          {importMsg && (
                              <div className={`mt-3 p-3 rounded-lg text-xs font-semibold ${
                                  importMsg.type === 'success' 
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                  {importMsg.text}
                              </div>
                          )}

                          <div className="flex gap-2.5 mt-3 justify-end">
                              <button
                                  onClick={() => handleBulkImport(false)}
                                  className="px-3.5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow hover:shadow-md cursor-pointer flex items-center gap-1.5"
                              >
                                  📥 Import & Append
                              </button>
                              <button
                                  onClick={() => {
                                      if (confirm("Are you sure you want to replace all current questions in the pool?")) {
                                          handleBulkImport(true);
                                      }
                                  }}
                                  className="px-3.5 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition flex items-center gap-1.5"
                              >
                                  Refill / Replace All
                              </button>
                          </div>
                      </section>

                      <div className="flex justify-between items-center border-b pb-2 mb-4">
                          <h2 className="text-xl font-bold text-slate-800">Question Bank ({questions.length})</h2>
                          <button onClick={handleAddQuestion} className="px-3 py-1 bg-green-600 text-white font-bold rounded text-sm hover:bg-green-700 transition">+ Add New</button>
                      </div>
                      
                      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 pb-10">
                           {questions.map((q, idx) => (
                               <div key={q.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                                   <div className="flex justify-between items-start mb-4">
                                       <div className="w-full mr-4">
                                           <label className="text-xs font-bold text-gray-500 uppercase">Question Text</label>
                                            <input className="font-bold text-base w-full bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:outline-none py-1" value={q.text} onChange={(e) => {
                                                const n = [...questions]; n[idx].text = e.target.value; setQuestions(n);
                                            }} />
                                       </div>
                                       <button onClick={() => {
                                           const n = [...questions]; n.splice(idx, 1); setQuestions(n);
                                       }} className="text-red-500 hover:bg-red-50 text-sm font-semibold px-2 py-1 rounded">Delete</button>
                                   </div>
                                   <div className="mb-3">
                                       <label className="text-xs font-bold text-gray-500 uppercase mr-2">Category:</label>
                                       <input className="bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={q.category} onChange={(e) => {
                                            const n = [...questions]; n[idx].category = e.target.value; setQuestions(n);
                                       }} />
                                   </div>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                       {q.options.map((opt, oIdx) => (
                                           <div key={oIdx} className={`flex items-center gap-2 p-2 rounded border ${q.correctIndex === oIdx ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                               <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === oIdx} onChange={() => {
                                                   const n = [...questions]; n[idx].correctIndex = oIdx; setQuestions(n);
                                               }} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                                               <input value={opt} onChange={(e) => {
                                                   const n = [...questions]; n[idx].options[oIdx] = e.target.value; setQuestions(n);
                                               }} className="bg-transparent w-full focus:outline-none" />
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           ))}
                      </div>
                  </div>
              </div>
           </div>
        </div>
    );
}

