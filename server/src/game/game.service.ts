import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LevelProgress, LevelProgressDocument } from './level-progress.schema';

@Injectable()
export class GameService {
  constructor(
    @InjectModel(LevelProgress.name)
    private levelModel: Model<LevelProgressDocument>,
  ) {}

  async saveLevelProgress(
    playerId: string,
    level: number,
    score: number,
    stars: number,
  ): Promise<LevelProgressDocument> {
    return this.levelModel
      .findOneAndUpdate(
        { playerId, level },
        { $set: { score, stars, completedAt: new Date() } },
        { upsert: true, new: true },
      )
      .exec() as Promise<LevelProgressDocument>;
  }

  async getPlayerProgress(playerId: string): Promise<LevelProgressDocument[]> {
    return this.levelModel.find({ playerId }).sort({ level: 1 }).exec();
  }
}
