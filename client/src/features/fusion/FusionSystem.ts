import {
  FUSION_RECIPES,
  CrystalCategory,
  PowerType,
  type FusionRecipe,
} from '@crystal-nexus/shared';
import { createCrystal, type BoardCrystal } from '../match3/BoardCrystal';

export class FusionSystem {
  findRecipe(a: CrystalCategory, b: CrystalCategory): FusionRecipe | null {
    return (
      FUSION_RECIPES.find(
        (r) =>
          (r.inputs[0] === a && r.inputs[1] === b) ||
          (r.inputs[0] === b && r.inputs[1] === a),
      ) ?? null
    );
  }

  createFusedCrystal(recipe: FusionRecipe): BoardCrystal {
    return createCrystal(recipe.result, PowerType.Fused, recipe.exclusiveAbility);
  }

  canFuse(a: CrystalCategory, b: CrystalCategory): boolean {
    return this.findRecipe(a, b) !== null;
  }
}
