import { supabase } from '../supabase';
import type { RealtimeEvent, CellUpdate, ChatMessage } from './gridrushTypes';
import type { RealtimeChannel } from '@supabase/supabase-js';

type EventHandler = (event: RealtimeEvent) => void;

export class GridRushRealtime {
  private teamChannel: RealtimeChannel | null = null;
  private gameChannel: RealtimeChannel | null = null;
  private handlers: EventHandler[] = [];

  constructor(private gameId: string, private teamId: string) {}

  connect(onEvent: EventHandler): void {
    this.handlers.push(onEvent);

    this.teamChannel = supabase.channel(`gridrush-team-${this.teamId}`, { config: { broadcast: { self: false } } });
    this.teamChannel
      .on('broadcast', { event: 'cell_update' }, ({ payload }) => this.emit({ type: 'cell_update', data: payload as CellUpdate }))
      .on('broadcast', { event: 'word_found' }, ({ payload }) => this.emit({ type: 'word_found', data: payload as any }))
      .on('broadcast', { event: 'mystery_found' }, ({ payload }) => this.emit({ type: 'mystery_found', data: payload as any }))
      .on('broadcast', { event: 'grid_complete' }, ({ payload }) => this.emit({ type: 'grid_complete', data: payload as any }))
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => this.emit({ type: 'chat_message', data: payload as ChatMessage }))
      .subscribe();

    this.gameChannel = supabase.channel(`gridrush-game-${this.gameId}`, { config: { broadcast: { self: true } } });
    this.gameChannel
      .on('broadcast', { event: 'game_started' }, ({ payload }) => this.emit({ type: 'game_started', data: payload as any }))
      .on('broadcast', { event: 'team_finished' }, ({ payload }) => this.emit({ type: 'team_finished', data: payload as any }))
      .on('broadcast', { event: 'game_over' }, ({ payload }) => this.emit({ type: 'game_over', data: payload as any }))
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => this.emit({ type: 'player_joined', data: payload as any }))
      .subscribe();
  }

  private emit(event: RealtimeEvent) { for (const h of this.handlers) h(event); }

  sendCellUpdate(u: CellUpdate) { this.teamChannel?.send({ type: 'broadcast', event: 'cell_update', payload: u }); }
  sendWordFound(wordId: number, gridIndex: number, playerName: string) { this.teamChannel?.send({ type: 'broadcast', event: 'word_found', payload: { wordId, gridIndex, playerName } }); }
  sendMysteryFound(gridIndex: number, playerName: string) { this.teamChannel?.send({ type: 'broadcast', event: 'mystery_found', payload: { gridIndex, playerName } }); }
  sendGridComplete(gridIndex: number, nextGridIndex: number) { this.teamChannel?.send({ type: 'broadcast', event: 'grid_complete', payload: { gridIndex, nextGridIndex } }); }
  sendChatMessage(msg: ChatMessage) { this.teamChannel?.send({ type: 'broadcast', event: 'chat_message', payload: msg }); }

  sendGameStarted(startedAt: string) { this.gameChannel?.send({ type: 'broadcast', event: 'game_started', payload: { startedAt } }); }
  sendTeamFinished(teamId: string, teamName: string, timeMs: number) { this.gameChannel?.send({ type: 'broadcast', event: 'team_finished', payload: { teamId, teamName, timeMs } }); }
  sendGameOver(reason: 'won' | 'timeout', winnerTeamId?: string, winnerTeamName?: string) { this.gameChannel?.send({ type: 'broadcast', event: 'game_over', payload: { reason, winnerTeamId, winnerTeamName } }); }

  disconnect() {
    if (this.teamChannel) { supabase.removeChannel(this.teamChannel); this.teamChannel = null; }
    if (this.gameChannel) { supabase.removeChannel(this.gameChannel); this.gameChannel = null; }
    this.handlers = [];
  }
}
