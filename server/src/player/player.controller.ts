import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PlayerService } from './player.service';

@Controller('players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get(':uid')
  async getPlayer(@Param('uid') uid: string) {
    return this.playerService.findByFirebaseUid(uid);
  }

  @Post()
  async createPlayer(@Body() body: { uid: string; displayName: string }) {
    return this.playerService.getOrCreate(body.uid, body.displayName);
  }

  @Patch(':uid/progress')
  async updateProgress(
    @Param('uid') uid: string,
    @Body() body: { level?: number; experience?: number },
  ) {
    return this.playerService.updateProgress(uid, body);
  }
}
