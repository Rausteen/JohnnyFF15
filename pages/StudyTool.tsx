import React, { useState, useEffect, useCallback } from 'react';

const letters = ['A', 'B', 'C', 'D'];

const questions = [
  {n:1, q:"The most specific marker of myocardial necrosis is:", o:["Total CK","CK-MB","Troponin","LDH"], a:2},
  {n:2, q:"In atrial fibrillation, the main clinical risk is:", o:["Mitral regurgitation","Stroke and systemic embolism","Ventricular tachycardia","Myocardial rupture"], a:1},
  {n:3, q:"The arrhythmia with multiple ectopic foci in the atrium, arrhythmic on ECG without P waves:", o:["Supraventricular tachycardia","Atrial fibrillation","AV block","Sinus bradycardia"], a:1},
  {n:4, q:"The central pathophysiological mechanism of type 2 diabetes is:", o:["Autoimmune destruction of beta cells","Insulin resistance","Absolute insulin deficiency","Pancreatic hypersecretion"], a:1},
  {n:5, q:"Glycated hemoglobin (HbA1c) reflects glycemic control for approximately:", o:["1 week","7-15 days","2-3 months","1-2 years"], a:2},
  {n:6, q:"In hemolytic anemia, the following is typically observed:", o:["Decreased LDH","Decreased indirect bilirubin","Increased reticulocytes","Decreased haptoglobin"], a:2},
  {n:7, q:"Primary mechanism of action of rivaroxaban, apixaban, and edoxaban?", o:["Inhibition of antithrombin","Direct inhibition of free and prothrombinase-bound factor Xa","Inhibition of factor VII activation","Inhibition of fibrinogen"], a:1},
  {n:8, q:"Which anticoagulant requires routine INR monitoring?", o:["Apixaban","Dabigatran","Acenocoumarol (Sintrom)","Enoxaparin"], a:2},
  {n:9, q:"Primary mechanism of action of aspirin as an antiplatelet agent?", o:["Reversible inhibition of P2Y12 receptor","Irreversible inhibition of platelet COX-1","Inhibition of GPIIb/IIIa receptor","Stimulation of prostacyclin"], a:1},
  {n:10, q:"Which of the following drugs is an antifibrinolytic?", o:["Alteplase","Tranexamic acid","Urokinase","Tenecteplase"], a:1},
  {n:11, q:"Which factor is directly involved in the extrinsic pathway of coagulation?", o:["Factor VIII","Factor IX","Factor VII","Factor XII"], a:2},
  {n:12, q:"Hemophilia A is caused by a deficiency of:", o:["Factor IX","Factor VIII","Factor VII","Factor V"], a:1},
  {n:13, q:"Which coagulation cascade does the PTT measure?", o:["Extrinsic pathway","Intrinsic pathway","Factor VII","Factor V"], a:1},
  {n:14, q:"Which is NOT a coagulation factor because it is secreted by the endothelium?", o:["Factor VII","Von Willebrand factor","Factor V","Factor X"], a:1},
  {n:15, q:"An arterial aneurysm is defined as:", o:["Permanent narrowing of an artery","Inflammation of the vascular wall","Localized and permanent dilation of an artery","Complete occlusion of the vessel"], a:2},
  {n:16, q:"Which arrhythmia is life-threatening and requires immediate defibrillation?", o:["Sinus tachycardia","Atrial fibrillation","Ventricular fibrillation","First-degree AV block"], a:2},
  {n:17, q:"European guidelines cut-off to diagnose hypertension:", o:["140/90 mmHg","130/85 mmHg","120/80 mmHg","150/95 mmHg"], a:0},
  {n:18, q:"Patient with BP 182/112 mmHg at dental appointment. Most appropriate action?", o:["Perform the dental procedure quickly","Administer local anesthesia and continue","Postpone elective treatment and refer for medical evaluation","Prescribe antibiotics"], a:2},
  {n:19, q:"Which is a microvascular complication of diabetes mellitus?", o:["Myocardial infarction","Peripheral arterial disease","Stroke","Diabetic retinopathy"], a:3},
  {n:20, q:"Which medication reduces volume overload in heart failure?", o:["Beta-blockers","Anticoagulants","Diuretics","Antibiotics"], a:2},
  {n:21, q:"Difficulty breathing when lying flat in dental chair is called:", o:["Dysphagia","Cyanosis","Orthopnea","Tachypnea"], a:2},
  {n:22, q:"Bacteremia that can trigger endocarditis can occur during:", o:["Only cardiac surgeries","Only severe infections","Invasive dental procedures","Exclusively prolonged hospitalization"], a:2},
  {n:23, q:"Which patient is at highest risk for infective endocarditis?", o:["Patient with hypertension","Patient with mild anemia","Patient with a prosthetic heart valve","Patient with hypothyroidism"], a:2},
  {n:24, q:"The INR is measured:", o:["Taking into account the prothrombin time","Taking into account the partial thromboplastin time","Taking into account the intrinsic pathway","None of the above are correct"], a:0},
  {n:25, q:"For Von Willebrand disease treatment, indicate the INCORRECT option:", o:["Always prescribe NSAIDs","Have antifibrinolytics in the office","Have desmopressin nasal spray in the office","All the above options are incorrect"], a:0},
  {n:26, q:"Which anticoagulant presents greatest risks of hemorrhage, thrombocytopenia, and osteoporosis?", o:["Aspirin","Clopidogrel","Unfractionated heparin","Fractionated LMWH"], a:2},
  {n:27, q:"All are antidotes for oral anticoagulant complications, EXCEPT:", o:["Protamine sulfate","Vitamin K","Fresh frozen plasma","Local tranexamic acid"], a:0},
  {n:28, q:"Which statement about ABO blood group system is correct?", o:["AB can donate to anyone","O have both A and B antigens","O can donate to all blood types","Type A don't have antibodies"], a:2},
  {n:29, q:"All are antiplatelet agents EXCEPT:", o:["Abciximab","Prasugrel","Aspirin","Dabigatran"], a:3},
  {n:30, q:"All are clinical symptoms/signs of diabetes EXCEPT:", o:["Polyphagia","Polyuria","Polydipsia","Loss of appetite"], a:3},
  {n:31, q:"Patient symptomatic climbing shortest stairs, asymptomatic at rest. NYHA class:", o:["Class I","Class II","Class III","Class IV"], a:2},
  {n:32, q:"75yo with severe headaches, blurred vision, BP 190/120. Diagnosis and action?", o:["Hypertensive emergency; call 112, lower BP immediately in ER","Hypertensive urgency; lower BP gradually with nifedipine","Hypertensive emergency; lower BP gradually","None of the above"], a:0},
  {n:33, q:"BP 160/100 mmHg. Indicate the INCORRECT option:", o:["Start antihypertensive medication right away","Refer to health center for screening","Most frequent cause is essential hypertension","HTN = cardiac output \u00d7 peripheral resistance"], a:0},
  {n:34, q:"Adaptive mechanism in heart failure to increase preload results in:", o:["Hypertrophy","Dilation","Increase in heart rate","None of the above"], a:0},
  {n:35, q:"Which does NOT correspond to acute MI presentation?", o:["Oppressive chest pain","Less than 20 minutes in duration","May present with malaise, nausea, vomiting","Does not improve with sublingual nitroglycerin"], a:1},
  {n:36, q:"Regarding hyperosmolar coma, indicate the INCORRECT option:", o:["Characteristic of type 1 diabetes","More frequent in older people","Treatment is hydration","Can cause coma"], a:0},
  {n:37, q:"The main cause of death in patients with diabetes is:", o:["Renal failure","Cardiovascular disease","Ketoacidosis","Infection"], a:1},
  {n:38, q:"Acute coronary syndrome refers to:", o:["Stable angina","Unstable angina","Acute myocardial infarction","Unstable angina and acute MI"], a:3},
  {n:39, q:"Pain in both lower limbs when walking, resolves when stopping:", o:["Arterial gangrene","Intermittent claudication","Cellulitis of the lower limb","Chronic venous ischemia"], a:1},
  {n:40, q:"Which does NOT correspond to retrograde right heart failure?", o:["Hypovolemia","Edema in lower limbs","Jugular vein distension","Hepatomegaly"], a:0}
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Mode = 'quiz' | 'flash' | 'grid' | 'review';

const StudyTool: React.FC = () => {
  const [mode, setMode] = useState<Mode>('quiz');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [order, setOrder] = useState<number[]>(questions.map((_, i) => i));
  const [shuffled, setShuffled] = useState(false);
  const [flashRevealed, setFlashRevealed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showAutoAdvance, setShowAutoAdvance] = useState(false);

  const correct = Object.keys(answers).filter(k => answers[Number(k)] === questions[order[Number(k)]].a).length;
  const wrong = Object.keys(answers).length - correct;
  const total = order.length;
  const allDone = Object.keys(answers).length === total;

  const handleAnswer = useCallback((choice: number) => {
    if (currentIdx in answers) return;
    const newAnswers = { ...answers, [currentIdx]: choice };
    setAnswers(newAnswers);
    const q = questions[order[currentIdx]];
    if (choice === q.a) {
      const ns = streak + 1;
      setStreak(ns);
      if (ns > bestStreak) setBestStreak(ns);
    } else {
      setStreak(0);
    }
    setShowAutoAdvance(true);
    setTimeout(() => {
      if (currentIdx < order.length - 1) {
        setCurrentIdx(prev => prev + 1);
      }
      setShowAutoAdvance(false);
    }, 900);
  }, [currentIdx, answers, order, streak, bestStreak]);

  const next = useCallback(() => {
    if (currentIdx < order.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setFlashRevealed(false);
    }
  }, [currentIdx, order.length]);

  const prev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setFlashRevealed(false);
    }
  }, [currentIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (mode === 'flash') setFlashRevealed(r => !r);
        else next();
      }
      if (e.key === 'ArrowLeft') prev();
      if (mode === 'quiz' && !(currentIdx in answers)) {
        if (e.key === '1' || e.key === 'a') handleAnswer(0);
        if (e.key === '2' || e.key === 'b') handleAnswer(1);
        if (e.key === '3' || e.key === 'c') handleAnswer(2);
        if (e.key === '4' || e.key === 'd') handleAnswer(3);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, currentIdx, answers, handleAnswer, next, prev]);

  const reset = () => {
    setAnswers({});
    setCurrentIdx(0);
    setStreak(0);
    setFlashRevealed(false);
  };

  const toggleShuffle = () => {
    if (!shuffled) {
      setOrder(shuffleArray(questions.map((_, i) => i)));
      setShuffled(true);
    } else {
      setOrder(questions.map((_, i) => i));
      setShuffled(false);
    }
    reset();
  };

  const reviewWrongs = () => {
    const wrongKeys = Object.keys(answers).filter(k => answers[Number(k)] !== questions[order[Number(k)]].a).map(Number);
    const newAnswers = { ...answers };
    wrongKeys.forEach(k => delete newAnswers[k]);
    setAnswers(newAnswers);
    if (wrongKeys.length > 0) setCurrentIdx(wrongKeys[0]);
    setMode('quiz');
  };

  const q = questions[order[currentIdx]];
  const answered = currentIdx in answers;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongList = Object.keys(answers)
    .filter(k => answers[Number(k)] !== questions[order[Number(k)]].a)
    .map(k => ({ idx: Number(k), qi: order[Number(k)], yours: answers[Number(k)] }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-4">
        <h1 className="text-lg font-bold text-white">ASMP II - Study</h1>
        <div className="text-sm text-zinc-500">
          <span className="text-green-500">{correct}</span> / <span className="text-red-500">{wrong}</span> / {total}
        </div>
      </div>

      {/* Mode buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['quiz', 'flash', 'grid', 'review'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setFlashRevealed(false); }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              mode === m
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-600'
            }`}
          >
            {m === 'quiz' ? 'Quiz' : m === 'flash' ? 'Flashcards' : m === 'grid' ? 'Grille' : 'Erreurs'}
          </button>
        ))}
        <button
          onClick={toggleShuffle}
          className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-600"
        >
          {shuffled ? 'Ordre' : 'Al\u00e9atoire'}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 text-sm rounded-md border border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-600"
        >
          Reset
        </button>
      </div>

      {/* QUIZ MODE */}
      {mode === 'quiz' && !allDone && (
        <>
          {/* Progress bar */}
          <div className="h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${(Object.keys(answers).length / total) * 100}%` }}
            />
          </div>

          {streak > 1 && (
            <div className="text-xs text-amber-500 text-right mb-1">Series: {streak}</div>
          )}

          <div className="text-xs text-zinc-600 mb-1">Question {q.n} ({currentIdx + 1}/{total})</div>
          <div className="text-base text-white mb-5 leading-relaxed">{q.q}</div>

          <div className="flex flex-col gap-2.5">
            {q.o.map((opt, i) => {
              let cls = 'p-3 rounded-lg border text-sm cursor-pointer transition-all ';
              if (answered) {
                if (i === q.a) cls += 'border-green-500 bg-green-500/10 text-green-400';
                else if (answers[currentIdx] === i) cls += 'border-red-500 bg-red-500/10 text-red-400';
                else cls += 'border-zinc-800 bg-zinc-900 text-zinc-500';
              } else {
                cls += 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800';
              }
              return (
                <div key={i} className={cls} onClick={() => handleAnswer(i)}>
                  <span className="font-bold mr-2">{letters[i]}</span>{opt}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={prev}
              disabled={currentIdx === 0}
              className="px-5 py-2 rounded-md text-sm bg-zinc-800 text-zinc-400 disabled:opacity-30"
            >
              Pr\u00e9c
            </button>
            <button
              onClick={next}
              disabled={currentIdx >= order.length - 1}
              className="px-5 py-2 rounded-md text-sm bg-violet-600 text-white disabled:opacity-30"
            >
              Suiv
            </button>
          </div>
        </>
      )}

      {/* QUIZ DONE */}
      {mode === 'quiz' && allDone && (
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-3">Termin\u00e9!</h2>
          <div className={`text-6xl font-bold my-5 ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {pct}%
          </div>
          <p className="text-zinc-500">{correct} bonnes / {wrong} mauvaises sur {total}</p>
          <p className="text-zinc-600 text-sm mt-1">Meilleure s\u00e9rie: {bestStreak}</p>
          <button onClick={reset} className="mt-6 px-6 py-2 bg-violet-600 text-white rounded-md">
            Recommencer
          </button>
        </div>
      )}

      {/* FLASHCARD MODE */}
      {mode === 'flash' && (
        <>
          <div className="h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${((currentIdx + 1) / total) * 100}%` }} />
          </div>
          <div className="text-xs text-zinc-600 mb-2">Question {q.n} ({currentIdx + 1}/{total})</div>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 min-h-[200px] flex flex-col items-center justify-center cursor-pointer text-center hover:border-zinc-500 transition-colors"
            onClick={() => setFlashRevealed(!flashRevealed)}
          >
            {!flashRevealed ? (
              <>
                <div className="text-base text-white leading-relaxed">{q.q}</div>
                <div className="text-xs text-zinc-600 mt-4">Cliquer pour voir la r\u00e9ponse</div>
              </>
            ) : (
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {letters[q.a]}) {q.o[q.a]}
                </div>
                <div className="text-sm text-zinc-500 mt-3">Question {q.n}</div>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={prev} disabled={currentIdx === 0} className="px-5 py-2 rounded-md text-sm bg-zinc-800 text-zinc-400 disabled:opacity-30">Pr\u00e9c</button>
            <button onClick={next} disabled={currentIdx >= order.length - 1} className="px-5 py-2 rounded-md text-sm bg-violet-600 text-white disabled:opacity-30">Suiv</button>
          </div>
        </>
      )}

      {/* GRID MODE */}
      {mode === 'grid' && (
        <>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Grille des r\u00e9ponses</h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 mb-6">
            {questions.map(qItem => (
              <div key={qItem.n} className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                <div className="text-[10px] text-zinc-600">Q{qItem.n}</div>
                <div className="text-violet-400 font-bold text-lg">{letters[qItem.a]}</div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h4 className="text-violet-400 font-semibold text-sm mb-2">Patterns</h4>
            <pre className="text-xs text-zinc-400 leading-relaxed font-mono">
{`Q1-10:  C B B B C C B C B B
Q11-20: C B B B C C A C D C
Q21-30: C C C A A C A C D D
Q31-40: C A A A B A B D B A`}
            </pre>
            <h4 className="text-violet-400 font-semibold text-sm mt-4 mb-2">Mn\u00e9motechnique</h4>
            <div className="text-xs text-zinc-400 leading-relaxed">
              <div><b>Q1-10:</b> CB\u00b2 CBC BCB B</div>
              <div><b>Q11-20:</b> CB\u00b2 BCC ACD C</div>
              <div><b>Q21-30:</b> CCC AA CAC DD</div>
              <div><b>Q31-40:</b> CAAA BA BDB A</div>
            </div>
          </div>
        </>
      )}

      {/* REVIEW MODE */}
      {mode === 'review' && (
        <>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Erreurs ({wrongList.length})</h3>
          {wrongList.length === 0 && (
            <p className="text-green-500 text-sm">Aucune erreur pour le moment!</p>
          )}
          <div className="space-y-2">
            {wrongList.map(w => {
              const wq = questions[w.qi];
              return (
                <div key={w.idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <div className="text-sm text-zinc-300 mb-1"><b>Q{wq.n}:</b> {wq.q}</div>
                  <div className="text-xs text-red-400">Ta r\u00e9ponse: {letters[w.yours]}) {wq.o[w.yours]}</div>
                  <div className="text-xs text-green-400">Bonne r\u00e9ponse: {letters[wq.a]}) {wq.o[wq.a]}</div>
                </div>
              );
            })}
          </div>
          {wrongList.length > 0 && (
            <button onClick={reviewWrongs} className="mt-4 px-5 py-2 bg-violet-600 text-white text-sm rounded-md">
              Retravailler les erreurs
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default StudyTool;
