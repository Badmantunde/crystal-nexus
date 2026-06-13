import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LevelProgress, LevelProgressSchema } from './level-progress.schema';
import { GameService } from './game.service';
import { GameController } from './game.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LevelProgress.name, schema: LevelProgressSchema }]),
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
