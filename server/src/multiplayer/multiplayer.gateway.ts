import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@crystal-nexus/shared';

interface MatchRoom {
  id: string;
  playerIds: string[];
  scores: Record<string, number>;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/multiplayer' })
export class MultiplayerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private matches = new Map<string, MatchRoom>();
  private playerSockets = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const playerId = this.playerSockets.get(client.id);
    if (playerId) {
      this.playerSockets.delete(client.id);
      for (const [matchId, match] of this.matches) {
        if (match.playerIds.includes(playerId)) {
          match.playerIds = match.playerIds.filter((id) => id !== playerId);
          if (match.playerIds.length === 0) this.matches.delete(matchId);
        }
      }
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.MATCH_JOIN)
  handleJoin(client: Socket, payload: { matchId: string; playerId: string }) {
    const { matchId, playerId } = payload;
    client.join(matchId);
    this.playerSockets.set(client.id, playerId);

    let match = this.matches.get(matchId);
    if (!match) {
      match = { id: matchId, playerIds: [], scores: {} };
      this.matches.set(matchId, match);
    }
    if (!match.playerIds.includes(playerId)) {
      match.playerIds.push(playerId);
      match.scores[playerId] = 0;
    }

    this.server.to(matchId).emit(SOCKET_EVENTS.MATCH_STATE, match);
    return match;
  }

  @SubscribeMessage(SOCKET_EVENTS.MATCH_MOVE)
  handleMove(
    client: Socket,
    payload: { matchId: string; playerId: string; score: number },
  ) {
    const match = this.matches.get(payload.matchId);
    if (!match) return;

    match.scores[payload.playerId] = payload.score;
    this.server.to(payload.matchId).emit(SOCKET_EVENTS.MATCH_STATE, match);
    return match;
  }

  @SubscribeMessage(SOCKET_EVENTS.MATCH_LEAVE)
  handleLeave(client: Socket, payload: { matchId: string; playerId: string }) {
    client.leave(payload.matchId);
    const match = this.matches.get(payload.matchId);
    if (match) {
      match.playerIds = match.playerIds.filter((id) => id !== payload.playerId);
      delete match.scores[payload.playerId];
    }
    return { left: true };
  }
}
