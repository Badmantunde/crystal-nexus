import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from './game/game.module';
import { PlayerModule } from './player/player.module';
import { MultiplayerModule } from './multiplayer/multiplayer.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/crystal-nexus',
    ),
    GameModule,
    PlayerModule,
    MultiplayerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
