import { supabase } from '../supabase';
import type { RealtimeEvent, CellUpdate, ChatMessage } from './gridrushTypes';
import type { RealtimeChannel } from '@supabase/supabase-js';

type EventHandler = (event: RealtimeEvent) => void;
type StatusHandler = (teamReady: boolean, gameReady: boolean) => void;

const log = (...args: any[]) => console.log('[GridRush RT]', ...args);
const warn = (...args: any[]) => console.warn('[GridRush RT]', ...args);

export class GridRushRealtime {
  private teamChannel: RealtimeChannel | null = null;
  private gameChannel: RealtimeChannel | null = null;
  private handlers: EventHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private _teamReady = false;
  private _gameReady = false;
  private disconnected = false;

  constructor(private gameId: string, private teamId: string) {
    log(`Created instance — gameId=${gameId}, teamId=${teamId}`);
  }

  get teamReady() { return this._teamReady; }
  get gameReady() { return this._gameReady; }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.push(handler);
  }

  private notifyStatus() {
    for (const h of this.statusHandlers) h(this._teamReady, this._gameReady);
  }

  connect(onEvent: EventHandler): void {
    this.handlers.push(onEvent);
    this.disconnected = false;
    log(`Connecting... teamChannel=gridrush-team-${this.teamId}, gameChannel=gridrush-game-${this.gameId}`);

    // Team channel: self=false (don't receive own broadcasts)
    this.teamChannel = supabase.channel(`gridrush-team-${this.teamId}`, { config: { broadcast: { self: false } } });
    this.teamChannel
      .on('broadcast', { event: 'cell_update' }, ({ payload }) => { log('← cell_update received', payload); this.emit({ type: 'cell_update', data: payload as CellUpdate }); })
      .on('broadcast', { event: 'word_found' }, ({ payload }) => { log('← word_found received', payload); this.emit({ type: 'word_found', data: payload as any }); })
      .on('broadcast', { event: 'mystery_found' }, ({ payload }) => { log('← mystery_found received'); this.emit({ type: 'mystery_found', data: payload as any }); })
      .on('broadcast', { event: 'grid_complete' }, ({ payload }) => { log('← grid_complete received'); this.emit({ type: 'grid_complete', data: payload as any }); })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => { log('← chat_message received', payload); this.emit({ type: 'chat_message', data: payload as ChatMessage }); })
      .subscribe((status, err) => {
        log(`Team channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') { this._teamReady = true; this.notifyStatus(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          warn(`Team channel failed: ${status}`, err);
          this._teamReady = false;
          this.notifyStatus();
          if (!this.disconnected) {
            setTimeout(() => {
              if (!this.disconnected && this.teamChannel) {
                log('Retrying team channel subscription...');
                this.teamChannel.subscribe();
              }
            }, 2000);
          }
        }
      });

    // Game channel: self=true (for game_started events from host)
    this.gameChannel = supabase.channel(`gridrush-game-${this.gameId}`, { config: { broadcast: { self: true } } });
    this.gameChannel
      .on('broadcast', { event: 'game_started' }, ({ payload }) => { log('← game_started received'); this.emit({ type: 'game_started', data: payload as any }); })
      .on('broadcast', { event: 'team_finished' }, ({ payload }) => { log('← team_finished received'); this.emit({ type: 'team_finished', data: payload as any }); })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => { log('← game_over received'); this.emit({ type: 'game_over', data: payload as any }); })
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => { log('← player_joined received'); this.emit({ type: 'player_joined', data: payload as any }); })
      .subscribe((status, err) => {
        log(`Game channel status: ${status}`, err || '');
        if (status === 'SUBSCRIBED') { this._gameReady = true; this.notifyStatus(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          warn(`Game channel failed: ${status}`, err);
          this._gameReady = false;
          this.notifyStatus();
          if (!this.disconnected) {
            setTimeout(() => {
              if (!this.disconnected && this.gameChannel) {
                log('Retrying game channel subscription...');
                this.gameChannel.subscribe();
              }
            }, 2000);
          }
        }
      });
  }

  private emit(event: RealtimeEvent) {
    for (const h of this.handlers) h(event);
  }

  private sendTeam(event: string, payload: any) {
    if (this.disconnected) return;
    if (this._teamReady && this.teamChannel) {
      log(`→ team send: ${event}`, payload);
      this.teamChannel.send({ type: 'broadcast', event, payload });
    } else {
      warn(`Team channel not ready, queuing: ${event}`);
      let attempts = 0;
      const retry = () => {
        if (this.disconnected) return;
        attempts++;
        if (this._teamReady && this.teamChannel) {
          log(`→ team send (retry #${attempts}): ${event}`);
          this.teamChannel.send({ type: 'broadcast', event, payload });
        } else if (attempts < 50) {
          setTimeout(retry, 200);
        } else {
          warn(`Gave up sending ${event} after ${attempts} retries`);
        }
      };
      setTimeout(retry, 200);
    }
  }

  private sendGame(event: string, payload: any) {
    if (this.disconnected) return;
    if (this._gameReady && this.gameChannel) {
      log(`→ game send: ${event}`, payload);
      this.gameChannel.send({ type: 'broadcast', event, payload });
    } else {
      warn(`Game channel not ready, queuing: ${event}`);
      let attempts = 0;
      const retry = () => {
        if (this.disconnected) return;
        attempts++;
        if (this._gameReady && this.gameChannel) {
          log(`→ game send (retry #${attempts}): ${event}`);
          this.gameChannel.send({ type: 'broadcast', event, payload });
        } else if (attempts < 50) {
          setTimeout(retry, 200);
        } else {
          warn(`Gave up sending ${event} after ${attempts} retries`);
        }
      };
      setTimeout(retry, 200);
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
    log('Disconnecting...');
    this.disconnected = true;
    if (this.teamChannel) { supabase.removeChannel(this.teamChannel); this.teamChannel = null; }
    if (this.gameChannel) { supabase.removeChannel(this.gameChannel); this.gameChannel = null; }
    this.handlers = [];
    this.statusHandlers = [];
    this._teamReady = false;
    this._gameReady = false;
  }
}
