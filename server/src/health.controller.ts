import { Controller, Get } from '@nestjs/common';
import { GAME_ID, GAME_VERSION } from '@crystal-nexus/shared';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      game: GAME_ID,
      version: GAME_VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}
