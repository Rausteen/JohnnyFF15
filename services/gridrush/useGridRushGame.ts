import { useState, useCallback, useRef, useEffect } from 'react';
import type { CrosswordGridData, GridSet, CellValues, WordDirection, GameStatus, RealtimeEvent, ChatMessage } from './gridrushTypes';
import { isWordComplete, normalize } from './crosswordEngine';
import { GridRushRealtime } from './gridrushRealtime';
import { updateTeamProgress, finishTeam, finishGame, sendChatMessage as sendChatDB } from './gridrushService';

interface Props {
  gridSet: GridSet; gameId: string; teamId: string; teamName: string; playerId: string;
  playerName: string; isHost: boolean; timerDuration: number; startedAt: string | null;
}

interface State {
  currentGridIndex: number; cellValues: CellValues[]; wordsFound: number[][];
  selectedCell: { row: number; col: number } | null; selectedDirection: WordDirection;
  selectedWordId: number | null; mysteryInput: string; gameStatus: GameStatus;
  timeRemaining: number; chatMessages: ChatMessage[]; notifications: string[];
  finishedTeams: Array<{ teamId: string; teamName: string; timeMs: number }>;
}

export function useGridRushGame({ gridSet, gameId, teamId, teamName, playerId, playerName, isHost, timerDuration, startedAt }: Props) {
  const [state, setState] = useState<State>({
    currentGridIndex: 0, cellValues: [{}, {}, {}], wordsFound: [[], [], []],
    selectedCell: null, selectedDirection: 'across', selectedWordId: null,
    mysteryInput: '', gameStatus: startedAt ? 'playing' : 'lobby',
    timeRemaining: timerDuration, chatMessages: [], notifications: [],
    finishedTeams: [],
  });

  const rtRef = useRef<GridRushRealtime | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(startedAt ? new Date(startedAt).getTime() : null);
  const [rtStatus, setRtStatus] = useState({ teamReady: false, gameReady: false });

  const currentGrid: CrosswordGridData = gridSet.grids[state.currentGridIndex];

  // Queue for async side-effects triggered from inside setState
  const pendingEffectsRef = useRef<Array<() => void>>([]);
  const flushEffects = useCallback(() => {
    const effects = pendingEffectsRef.current.splice(0);
    for (const fn of effects) fn();
  }, []);

  const updateTimer = useCallback(() => {
    if (!startTimeRef.current) return;
    const remaining = Math.max(0, timerDuration - (Date.now() - startTimeRef.current) / 1000);
    setState(prev => {
      if (remaining <= 0 && prev.gameStatus === 'playing') return { ...prev, timeRemaining: 0, gameStatus: 'finished' };
      return { ...prev, timeRemaining: Math.ceil(remaining) };
    });
    if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
  }, [timerDuration]);

  const startTimer = useCallback((startAt: string) => {
    startTimeRef.current = new Date(startAt).getTime();
    setState(prev => ({ ...prev, gameStatus: 'playing' }));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(updateTimer, 250);
    updateTimer();
  }, [updateTimer]);

  const handleGridComplete = useCallback(async (gi: number, updatedWF: number[][]) => {
    const next = gi + 1;
    if (next >= 3) {
      const timeMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      setState(prev => ({ ...prev, wordsFound: updatedWF, gameStatus: 'finished' }));
      await finishTeam(teamId);
      rtRef.current?.sendTeamFinished(teamId, teamName, timeMs);
      if (isHost) { await finishGame(gameId, teamId); rtRef.current?.sendGameOver('won', teamId); }
    } else {
      setState(prev => ({ ...prev, wordsFound: updatedWF, currentGridIndex: next, mysteryInput: '', selectedCell: null, selectedWordId: null }));
      rtRef.current?.sendGridComplete(gi, next);
      await updateTeamProgress(teamId, next, updatedWF);
    }
  }, [teamId, teamName, gameId, isHost]);

  // Ref wrappers so closures inside handleEvent always have the latest versions
  const handleGridCompleteRef = useRef(handleGridComplete);
  handleGridCompleteRef.current = handleGridComplete;

  // Use a ref for the event handler so the realtime connection is created ONCE
  // and never tears down/reconnects (which would cause missed events)
  const handleEventRef = useRef<(event: RealtimeEvent) => void>(() => {});
  handleEventRef.current = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'cell_update':
        setState(prev => {
          const cv = [...prev.cellValues];
          cv[event.data.gridIndex] = { ...cv[event.data.gridIndex], [`${event.data.row},${event.data.col}`]: event.data.value };
          // Also check word completion with updated values from teammate
          const grid = gridSet.grids[event.data.gridIndex];
          const updatedCV = cv[event.data.gridIndex];
          let newWF = [...prev.wordsFound[event.data.gridIndex]];
          let foundAny = false;
          for (const w of grid.words) {
            if (newWF.includes(w.id)) continue;
            if (isWordComplete(w, updatedCV)) {
              newWF.push(w.id);
              foundAny = true;
              const wordId = w.id;
              const gi = event.data.gridIndex;
              const whoFound = event.data.playerName;
              pendingEffectsRef.current.push(() => rtRef.current?.sendWordFound(wordId, gi, whoFound));
            }
          }
          if (!foundAny) return { ...prev, cellValues: cv };
          const updatedWF = [...prev.wordsFound];
          updatedWF[event.data.gridIndex] = newWF;
          // Grid validated when 9/10 words found (all but one)
          if (newWF.length >= grid.words.length - 1) {
            const gi = event.data.gridIndex;
            pendingEffectsRef.current.push(() => handleGridCompleteRef.current(gi, updatedWF));
          } else {
            const gi = event.data.gridIndex;
            pendingEffectsRef.current.push(() => updateTeamProgress(teamId, gi, updatedWF));
          }
          return { ...prev, cellValues: cv, wordsFound: updatedWF };
        });
        setTimeout(flushEffects, 0);
        break;
      case 'word_found':
        setState(prev => { const wf = [...prev.wordsFound]; if (!wf[event.data.gridIndex].includes(event.data.wordId)) wf[event.data.gridIndex] = [...wf[event.data.gridIndex], event.data.wordId]; return { ...prev, wordsFound: wf, notifications: [...prev.notifications, `${event.data.playerName} a trouvé un mot !`] }; });
        break;
      case 'mystery_found':
        setState(prev => ({ ...prev, notifications: [...prev.notifications, `${event.data.playerName} a trouvé le Mot Mystère !`] }));
        break;
      case 'grid_complete':
        setState(prev => ({ ...prev, currentGridIndex: event.data.nextGridIndex, mysteryInput: '', notifications: [...prev.notifications, `Grille ${event.data.gridIndex + 1} terminée !`] }));
        break;
      case 'game_started':
        // Teams were randomly reassigned at game start — reload to get new team
        window.location.reload();
        break;
      case 'team_finished':
        setState(prev => ({ ...prev, finishedTeams: [...prev.finishedTeams, event.data], notifications: [...prev.notifications, `L'équipe ${event.data.teamName} a terminé !`] }));
        break;
      case 'game_over': setState(prev => ({ ...prev, gameStatus: 'finished' })); break;
      case 'chat_message': setState(prev => ({ ...prev, chatMessages: [...prev.chatMessages, event.data] })); break;
    }
  };

  // Connect realtime ONCE — the handler ref ensures we always dispatch to the latest closure
  useEffect(() => {
    const rt = new GridRushRealtime(gameId, teamId);
    rt.onStatusChange((teamReady, gameReady) => setRtStatus({ teamReady, gameReady }));
    rt.connect((event) => handleEventRef.current(event));
    rtRef.current = rt;
    if (startedAt) startTimer(startedAt);
    return () => { rt.disconnect(); if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, teamId]);

  const setCellValue = useCallback((row: number, col: number, value: string) => {
    const v = value.toUpperCase();
    setState(prev => {
      const gi = prev.currentGridIndex;
      const cv = [...prev.cellValues];
      cv[gi] = { ...cv[gi], [`${row},${col}`]: v };

      // Check word completion with the NEW cell values
      const grid = gridSet.grids[gi];
      const updatedCV = cv[gi];
      let newWF = [...prev.wordsFound[gi]];
      let foundAny = false;
      for (const w of grid.words) {
        if (newWF.includes(w.id)) continue;
        if (isWordComplete(w, updatedCV)) {
          newWF.push(w.id);
          foundAny = true;
          const wordId = w.id;
          pendingEffectsRef.current.push(() => rtRef.current?.sendWordFound(wordId, gi, playerName));
        }
      }

      if (!foundAny) return { ...prev, cellValues: cv };

      const updatedWF = [...prev.wordsFound];
      updatedWF[gi] = newWF;

      // Grid validated when 9/10 words found (all but one)
      if (newWF.length >= grid.words.length - 1) {
        pendingEffectsRef.current.push(() => handleGridCompleteRef.current(gi, updatedWF));
        return { ...prev, cellValues: cv, wordsFound: updatedWF };
      }

      pendingEffectsRef.current.push(() => updateTeamProgress(teamId, gi, updatedWF));
      return { ...prev, cellValues: cv, wordsFound: updatedWF };
    });

    rtRef.current?.sendCellUpdate({ row, col, value: v, playerName, gridIndex: state.currentGridIndex });

    setTimeout(flushEffects, 0);
  }, [gridSet, playerName, teamId, state.currentGridIndex, flushEffects]);

  const checkWordCompletion = useCallback(() => {
    setState(prev => {
      const gi = prev.currentGridIndex;
      const grid = gridSet.grids[gi];
      const cv = prev.cellValues[gi];
      let newWF = [...prev.wordsFound[gi]];
      let found = false;
      for (const w of grid.words) {
        if (newWF.includes(w.id)) continue;
        if (isWordComplete(w, cv)) {
          newWF.push(w.id);
          found = true;
          pendingEffectsRef.current.push(() => rtRef.current?.sendWordFound(w.id, gi, playerName));
        }
      }
      if (!found) return prev;
      const updated = [...prev.wordsFound]; updated[gi] = newWF;
      // Grid validated when 9/10 words found (all but one)
      if (newWF.length >= grid.words.length - 1) {
        pendingEffectsRef.current.push(() => handleGridCompleteRef.current(gi, updated));
        return { ...prev, wordsFound: updated };
      }
      pendingEffectsRef.current.push(() => updateTeamProgress(teamId, gi, updated));
      return { ...prev, wordsFound: updated };
    });
    setTimeout(flushEffects, 0);
  }, [gridSet, playerName, teamId, flushEffects]);

  const submitMysteryWord = useCallback((input: string) => {
    const gi = state.currentGridIndex;
    const grid = gridSet.grids[gi];
    if (normalize(input) === grid.mysteryWord) {
      rtRef.current?.sendMysteryFound(gi, playerName);
      const updated = [...state.wordsFound]; updated[gi] = grid.words.map(w => w.id);
      handleGridCompleteRef.current(gi, updated);
      return true;
    }
    return false;
  }, [state.currentGridIndex, state.wordsFound, gridSet, playerName]);

  const selectCell = useCallback((row: number, col: number, dir?: WordDirection) => {
    setState(prev => ({ ...prev, selectedCell: { row, col }, selectedDirection: dir ?? prev.selectedDirection }));
  }, []);

  const sendChat = useCallback(async (message: string) => {
    if (!message.trim()) return;
    const msg: ChatMessage = { id: crypto.randomUUID?.() || Date.now().toString(), teamId, playerName, message: message.trim(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, chatMessages: [...prev.chatMessages, msg] }));
    rtRef.current?.sendChatMessage(msg);
    await sendChatDB(gameId, teamId, playerName, message.trim());
  }, [gameId, teamId, playerName]);

  return {
    currentGrid, currentGridIndex: state.currentGridIndex,
    cellValues: state.cellValues[state.currentGridIndex] || {},
    allCellValues: state.cellValues,
    wordsFound: state.wordsFound[state.currentGridIndex] || [],
    allWordsFound: state.wordsFound,
    selectedCell: state.selectedCell, selectedDirection: state.selectedDirection,
    selectedWordId: state.selectedWordId, mysteryInput: state.mysteryInput,
    gameStatus: state.gameStatus, timeRemaining: state.timeRemaining,
    chatMessages: state.chatMessages, notifications: state.notifications,
    finishedTeams: state.finishedTeams,
    wordsFoundCount: state.wordsFound[state.currentGridIndex]?.length || 0,
    showMysteryHint5: (state.wordsFound[state.currentGridIndex]?.length || 0) >= 5,
    showMysteryHint8: (state.wordsFound[state.currentGridIndex]?.length || 0) >= 8,
    totalGrids: 3,
    setCellValue, checkWordCompletion, submitMysteryWord, selectCell,
    setSelectedDirection: useCallback((d: WordDirection) => setState(prev => ({ ...prev, selectedDirection: d })), []),
    setSelectedWordId: useCallback((id: number | null) => setState(prev => ({ ...prev, selectedWordId: id })), []),
    setMysteryInput: useCallback((v: string) => setState(prev => ({ ...prev, mysteryInput: v })), []),
    sendChat, clearNotification: useCallback((i: number) => setState(prev => ({ ...prev, notifications: prev.notifications.filter((_, idx) => idx !== i) })), []),
    startTimer,
    broadcastGameStarted: useCallback((startedAt: string) => { rtRef.current?.sendGameStarted(startedAt); }, []),
    realtimeStatus: rtStatus,
  };
}
