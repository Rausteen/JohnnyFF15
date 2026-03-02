import { supabase } from '../supabase';
import type { RealtimeEvent, CellUpdate, ChatMessage } from './gridrushTypes';
import type { RealtimeChannel } from '@supabase/supabase-js';

type EventHandler = (event: RealtimeEvent) => void;

export class GridRushRealtime {
  private teamChannel: RealtimeChannel | null = null;
  private gameChannel: RealtimeChannel | null = null;
  private handlers: EventHandler[] = [];
  private teamReady = false;
  private gameReady = false;
  private disconnected = false;

  constructor(private gameId: string, private teamId: string) {}

  connect(onEvent: EventHandler): void {
    this.handlers.push(onEvent);
    this.disconnected = false;

    console.log(`[GridRush RT] Connecting — game=${this.gameId} team=${this.teamId}`);

    // Team channel: self=false (don't receive own broadcasts)
    this.teamChannel = supabase.channel(`gridrush-team-${this.teamId}`, { config: { broadcast: { self: false } } });
    this.teamChannel
      .on('broadcast', { event: 'cell_update' }, ({ payload }) => this.emit({ type: 'cell_update', data: payload as CellUpdate }))
      .on('broadcast', { event: 'word_found' }, ({ payload }) => this.emit({ type: 'word_found', data: payload as any }))
      .on('broadcast', { event: 'mystery_found' }, ({ payload }) => this.emit({ type: 'mystery_found', data: payload as any }))
      .on('broadcast', { event: 'grid_complete' }, ({ payload }) => this.emit({ type: 'grid_complete', data: payload as any }))
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => this.emit({ type: 'chat_message', data: payload as ChatMessage }))
      .subscribe((status) => {
        console.log(`[GridRush RT] Team channel: ${status}`);
        if (status === 'SUBSCRIBED') this.teamReady = true;
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !this.disconnected) {
          console.warn(`[GridRush RT] Team channel error, retrying...`);
          setTimeout(() => { if (!this.disconnected) this.teamChannel?.subscribe(); }, 2000);
        }
      });

    // Game channel: self=true (for game_started events from host)
    this.gameChannel = supabase.channel(`gridrush-game-${this.gameId}`, { config: { broadcast: { self: true } } });
    this.gameChannel
      .on('broadcast', { event: 'game_started' }, ({ payload }) => this.emit({ type: 'game_started', data: payload as any }))
      .on('broadcast', { event: 'team_finished' }, ({ payload }) => this.emit({ type: 'team_finished', data: payload as any }))
      .on('broadcast', { event: 'game_over' }, ({ payload }) => this.emit({ type: 'game_over', data: payload as any }))
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => this.emit({ type: 'player_joined', data: payload as any }))
      .subscribe((status) => {
        console.log(`[GridRush RT] Game channel: ${status}`);
        if (status === 'SUBSCRIBED') this.gameReady = true;
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !this.disconnected) {
          console.warn(`[GridRush RT] Game channel error, retrying...`);
          setTimeout(() => { if (!this.disconnected) this.gameChannel?.subscribe(); }, 2000);
        }
      });
  }

  private emit(event: RealtimeEvent) {
    for (const h of this.handlers) h(event);
  }

  private sendTeam(event: string, payload: any) {
    if (this.disconnected) return;
    if (this.teamReady && this.teamChannel) {
      this.teamChannel.send({ type: 'broadcast', event, payload });
    } else {
      let attempts = 0;
      const retry = () => {
        if (this.disconnected || attempts > 30) return;
        attempts++;
        if (this.teamReady && this.teamChannel) {
          this.teamChannel.send({ type: 'broadcast', event, payload });
        } else {
          setTimeout(retry, 100);
        }
      };
      setTimeout(retry, 100);
    }
  }

  private sendGame(event: string, payload: any) {
    if (this.disconnected) return;
    if (this.gameReady && this.gameChannel) {
      this.gameChannel.send({ type: 'broadcast', event, payload });
    } else {
      let attempts = 0;
      const retry = () => {
        if (this.disconnected || attempts > 30) return;
        attempts++;
        if (this.gameReady && this.gameChannel) {
          this.gameChannel.send({ type: 'broadcast', event, payload });
        } else {
          setTimeout(retry, 100);
        }
      };
      setTimeout(retry, 100);
    }
  }

  sendCellUpdate(u: CellUpdate) { this.sendTeam('cell_update', u); }
  sendWordFound(wordId: number, gridIndex: number, playerName: string) { this.sendTeam('word_found', { wordId, gridIndex, playerName }); }
  sendMysteryFound(gridIndex: number, playerName: string) { this.sendTeam('mystery_found', { gridIndex, playerName }); }
  sendGridComplete(gridIndex: number, nextGridIndex: number) { this.sendTeam('grid_complete', { gridIndex, nextGridIndex }); }
  sendChatMessage(msg: ChatMessage) { this.sendTeam('chat_message', msg); }

  sendGameStarted(startedAt: string) { this.sendGame('game_started', { startedAt }); }
  sendTeamFinished(teamId: string, teamName: string, timeMs: number) { this.sendGame('team_finished', { teamId, teamName, timeMs }); }
  sendGameOver(reason: 'won' | 'timeout', winnerTeamId?: string, winnerTeamName?: string) { this.sendGame('game_over', { reason, winnerTeamId, winnerTeamName }); }

  disconnect() {
    console.log(`[GridRush RT] Disconnecting — game=${this.gameId} team=${this.teamId}`);
    this.disconnected = true;
    if (this.teamChannel) { supabase.removeChannel(this.teamChannel); this.teamChannel = null; }
    if (this.gameChannel) { supabase.removeChannel(this.gameChannel); this.gameChannel = null; }
    this.handlers = [];
    this.teamReady = false;
    this.gameReady = false;
  }
}
