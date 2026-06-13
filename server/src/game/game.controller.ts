import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('progress/:playerId')
  async getProgress(@Param('playerId') playerId: string) {
    return this.gameService.getPlayerProgress(playerId);
  }

  @Post('progress')
  async saveProgress(
    @Body() body: { playerId: string; level: number; score: number; stars: number },
  ) {
    return this.gameService.saveLevelProgress(
      body.playerId,
      body.level,
      body.score,
      body.stars,
    );
  }
}
