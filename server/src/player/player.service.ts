import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from './player.schema';

@Injectable()
export class PlayerService {
  constructor(@InjectModel(Player.name) private playerModel: Model<PlayerDocument>) {}

  async findByFirebaseUid(uid: string): Promise<PlayerDocument | null> {
    return this.playerModel.findOne({ firebaseUid: uid }).exec();
  }

  async create(uid: string, displayName: string): Promise<PlayerDocument> {
    return this.playerModel.create({ firebaseUid: uid, displayName });
  }

  async getOrCreate(uid: string, displayName: string): Promise<PlayerDocument> {
    const existing = await this.findByFirebaseUid(uid);
    if (existing) return existing;
    return this.create(uid, displayName);
  }

  async updateProgress(
    uid: string,
    data: Partial<Pick<Player, 'level' | 'experience' | 'wallet' | 'unlockedRegions'>>,
  ): Promise<PlayerDocument | null> {
    return this.playerModel
      .findOneAndUpdate({ firebaseUid: uid }, { $set: data }, { new: true })
      .exec();
  }
}
