import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LevelProgressDocument = HydratedDocument<LevelProgress>;

@Schema({ timestamps: true })
export class LevelProgress {
  @Prop({ required: true, index: true })
  playerId!: string;

  @Prop({ required: true })
  level!: number;

  @Prop({ default: 0 })
  score!: number;

  @Prop({ default: 0 })
  stars!: number;

  @Prop()
  completedAt?: Date;
}

export const LevelProgressSchema = SchemaFactory.createForClass(LevelProgress);
LevelProgressSchema.index({ playerId: 1, level: 1 }, { unique: true });
