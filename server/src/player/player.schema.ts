import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DEFAULT_SETTINGS, DEFAULT_WALLET } from '@crystal-nexus/shared';

export type PlayerDocument = HydratedDocument<Player>;

@Schema({ timestamps: true })
export class Player {
  @Prop({ required: true, unique: true })
  firebaseUid!: string;

  @Prop({ required: true })
  displayName!: string;

  @Prop({ default: 1 })
  level!: number;

  @Prop({ default: 0 })
  experience!: number;

  @Prop({ type: Object, default: DEFAULT_WALLET })
  wallet!: Record<string, number>;

  @Prop({ type: [String], default: ['crystal_forest'] })
  unlockedRegions!: string[];

  @Prop({ default: 'crystal_forest' })
  currentRegion!: string;

  @Prop({ default: 0 })
  streakDays!: number;

  @Prop({ type: Object, default: DEFAULT_SETTINGS })
  settings!: Record<string, unknown>;

  @Prop({ type: Array, default: [] })
  collection!: unknown[];
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
