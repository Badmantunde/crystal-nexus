import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core';
import { PowerType, CrystalCategory } from '@crystal-nexus/shared';
import type { BoardCrystal } from '../match3/BoardCrystal';
import { cellToWorld } from '../board/BoardLayout';

/** Candy Crush–style glossy candy palette */
const CANDY_STYLES: Record<
  string,
  { color: string; highlight: string; scale: Vector3; shape: 'round' | 'oval' | 'pill' | 'gem' }
> = {
  [CrystalCategory.Fire]: { color: '#E53935', highlight: '#FFCDD2', scale: new Vector3(0.88, 0.88, 0.88), shape: 'round' },
  [CrystalCategory.Ice]: { color: '#1E88E5', highlight: '#BBDEFB', scale: new Vector3(0.82, 0.95, 0.82), shape: 'oval' },
  [CrystalCategory.Nature]: { color: '#43A047', highlight: '#C8E6C9', scale: new Vector3(0.95, 0.78, 0.95), shape: 'pill' },
  [CrystalCategory.Storm]: { color: '#8E24AA', highlight: '#E1BEE7', scale: new Vector3(0.86, 0.86, 0.86), shape: 'gem' },
  [CrystalCategory.Void]: { color: '#5E35B1', highlight: '#D1C4E9', scale: new Vector3(0.84, 0.84, 0.84), shape: 'round' },
  [CrystalCategory.Plasma]: { color: '#EC407A', highlight: '#F8BBD0', scale: new Vector3(0.9, 0.82, 0.9), shape: 'oval' },
  [CrystalCategory.Celestial]: { color: '#FDD835', highlight: '#FFF9C4', scale: new Vector3(0.87, 0.87, 0.87), shape: 'round' },
  [CrystalCategory.Quantum]: { color: '#00ACC1', highlight: '#B2EBF2', scale: new Vector3(0.85, 0.9, 0.85), shape: 'gem' },
  [CrystalCategory.Cosmic]: { color: '#3949AB', highlight: '#C5CAE9', scale: new Vector3(0.88, 0.8, 0.88), shape: 'pill' },
  [CrystalCategory.Shadow]: { color: '#546E7A', highlight: '#CFD8DC', scale: new Vector3(0.83, 0.83, 0.83), shape: 'round' },
  [CrystalCategory.Dragon]: { color: '#D84315', highlight: '#FFCCBC', scale: new Vector3(0.92, 0.76, 0.92), shape: 'pill' },
  [CrystalCategory.Ancient]: { color: '#FFB300', highlight: '#FFECB3', scale: new Vector3(0.86, 0.86, 0.86), shape: 'gem' },
};

export class CandyRenderer {
  private meshes = new Map<string, Mesh>();
  private basePositions = new Map<string, Vector3>();

  constructor(private scene: Scene) {}

  syncGrid(grid: readonly (readonly (BoardCrystal | null)[])[]): void {
    const activeKeys = new Set<string>();

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        const key = `${r},${c}`;
        activeKeys.add(key);

        if (cell === null) {
          this.removeMesh(key);
          continue;
        }

        const world = cellToWorld(r, c);
        const pos = new Vector3(world.x, world.y, world.z);
        let mesh = this.meshes.get(key);

        if (!mesh) {
          mesh = this.createCandyMesh(cell, key);
          this.meshes.set(key, mesh);
        } else {
          this.updateCandyMesh(mesh, cell);
        }

        mesh.position.copyFrom(pos);
        this.basePositions.set(key, pos.clone());
        Object.assign(mesh.metadata ?? (mesh.metadata = {}), {
          row: r,
          col: c,
          category: cell.category,
          power: cell.power,
        });
        this.applyPowerVisuals(mesh, cell);
      }
    }

    for (const key of [...this.meshes.keys()]) {
      if (!activeKeys.has(key)) this.removeMesh(key);
    }
  }

  getMeshAt(row: number, col: number): Mesh | undefined {
    return this.meshes.get(`${row},${col}`);
  }

  /** Candy Crush drag preview — slide candy toward swipe direction */
  dragPreview(row: number, col: number, direction: string, progress: number): void {
    const key = `${row},${col}`;
    const mesh = this.meshes.get(key);
    const base = this.basePositions.get(key);
    if (!mesh || !base) return;

    const offset = 0.42 * progress;
    const pos = base.clone();
    switch (direction) {
      case 'left':
        pos.x -= offset;
        break;
      case 'right':
        pos.x += offset;
        break;
      case 'up':
        pos.z -= offset;
        break;
      case 'down':
        pos.z += offset;
        break;
    }
    mesh.position.copyFrom(pos);
    const bx = mesh.metadata?.baseScaleX ?? 1;
    const by = mesh.metadata?.baseScaleY ?? 1;
    const bz = mesh.metadata?.baseScaleZ ?? 1;
    mesh.scaling.set(bx * 1.06, by * 1.06, bz * 1.06);
  }

  resetDrag(row: number, col: number): void {
    const key = `${row},${col}`;
    const mesh = this.meshes.get(key);
    const base = this.basePositions.get(key);
    if (!mesh || !base) return;
    mesh.position.copyFrom(base);
    this.applyPowerVisuals(mesh, { category: mesh.metadata.category, power: mesh.metadata.power });
  }

  resetAllPositions(): void {
    for (const [key, mesh] of this.meshes) {
      const base = this.basePositions.get(key);
      if (base) mesh.position.copyFrom(base);
    }
  }

  async playSwapAnimation(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    revert = false,
  ): Promise<void> {
    const m1 = this.meshes.get(`${r1},${c1}`);
    const m2 = this.meshes.get(`${r2},${c2}`);
    if (!m1 || !m2) return;

    const p1 = this.basePositions.get(`${r1},${c1}`)?.clone();
    const p2 = this.basePositions.get(`${r2},${c2}`)?.clone();
    if (!p1 || !p2) return;

    const target1 = revert ? p1 : p2;
    const target2 = revert ? p2 : p1;
    const duration = revert ? 180 : 140;
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = () => {
        const t = Math.min((performance.now() - start) / duration, 1);
        const ease = revert
          ? t < 0.5 ? 2 * t : 2 * (1 - t)
          : t * (2 - t);

        m1.position = Vector3.Lerp(p1, target1, ease);
        m2.position = Vector3.Lerp(p2, target2, ease);

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  private createCandyMesh(cell: BoardCrystal, key: string): Mesh {
    const style = CANDY_STYLES[cell.category] ?? CANDY_STYLES[CrystalCategory.Fire];
    const mesh = this.buildCandyShape(`candy_${key}`, style.shape);
    mesh.scaling.copyFrom(style.scale);
    mesh.metadata = {
      baseScaleX: style.scale.x,
      baseScaleY: style.scale.y,
      baseScaleZ: style.scale.z,
      stripes: [] as Mesh[],
    };

    this.applyCandyMaterial(mesh, style.color, style.highlight);
    this.addPowerStripes(mesh, cell);
    return mesh;
  }

  private updateCandyMesh(mesh: Mesh, cell: BoardCrystal): void {
    const style = CANDY_STYLES[cell.category] ?? CANDY_STYLES[CrystalCategory.Fire];
    if (mesh.metadata.category !== cell.category) {
      mesh.metadata.category = cell.category;
      this.applyCandyMaterial(mesh, style.color, style.highlight);
    }
    if (mesh.metadata.power !== cell.power) {
      mesh.metadata.power = cell.power;
      this.clearPowerStripes(mesh);
      this.addPowerStripes(mesh, cell);
    }
  }

  private buildCandyShape(name: string, shape: 'round' | 'oval' | 'pill' | 'gem'): Mesh {
    switch (shape) {
      case 'oval':
        return MeshBuilder.CreateSphere(name, { diameter: 0.92, segments: 20 }, this.scene);
      case 'pill': {
        const sphere = MeshBuilder.CreateSphere(name, { diameter: 0.88, segments: 20 }, this.scene);
        sphere.scaling.y = 0.72;
        return sphere;
      }
      case 'gem': {
        const gem = MeshBuilder.CreateCylinder(
          name,
          { height: 0.7, diameterTop: 0.5, diameterBottom: 0.82, tessellation: 16 },
          this.scene,
        );
        gem.rotation.x = Math.PI;
        return gem;
      }
      case 'round':
      default:
        return MeshBuilder.CreateSphere(name, { diameter: 0.9, segments: 24 }, this.scene);
    }
  }

  private applyCandyMaterial(mesh: Mesh, color: string, highlight: string): void {
    let mat = mesh.material as StandardMaterial | null;
    if (!mat) {
      mat = new StandardMaterial(`candyMat_${mesh.name}`, this.scene);
      mesh.material = mat;
    }
    mat.diffuseColor = Color3.FromHexString(color);
    mat.specularColor = Color3.FromHexString(highlight).scale(0.35);
    mat.emissiveColor = Color3.Black();
    mat.specularPower = 64;
  }

  private addPowerStripes(mesh: Mesh, cell: BoardCrystal): void {
    if (cell.power === PowerType.None) return;

    const stripeMat = new StandardMaterial(`stripe_${mesh.name}`, this.scene);
    stripeMat.diffuseColor = Color3.FromHexString('#FFFFFF');
    stripeMat.specularColor = Color3.White().scale(0.3);

    if (cell.power === PowerType.LineRow || cell.power === PowerType.LineCol) {
      const horizontal = cell.power === PowerType.LineRow;
      const stripe = MeshBuilder.CreateBox(
        `stripe_${mesh.name}`,
        horizontal
          ? { width: 0.7, height: 0.08, depth: 0.14 }
          : { width: 0.14, height: 0.08, depth: 0.7 },
        this.scene,
      );
      stripe.parent = mesh;
      stripe.position.y = 0.35;
      stripe.material = stripeMat;
      mesh.metadata.stripes = [stripe];
    } else if (cell.power === PowerType.Nova || cell.power === PowerType.Fused) {
      const wrap = MeshBuilder.CreateTorus(
        `wrap_${mesh.name}`,
        { diameter: 0.95, thickness: 0.1, tessellation: 24 },
        this.scene,
      );
      wrap.parent = mesh;
      wrap.rotation.x = Math.PI / 2;
      wrap.position.y = 0.1;
      const wrapMat = new StandardMaterial(`wrapMat_${mesh.name}`, this.scene);
      wrapMat.diffuseColor = Color3.FromHexString('#FFD54F');
      wrapMat.specularColor = Color3.White().scale(0.4);
      wrap.material = wrapMat;
      mesh.metadata.stripes = [wrap];
    }
  }

  private clearPowerStripes(mesh: Mesh): void {
    const stripes = mesh.metadata?.stripes as Mesh[] | undefined;
    if (stripes) {
      for (const s of stripes) s.dispose();
      mesh.metadata.stripes = [];
    }
  }

  private applyPowerVisuals(mesh: Mesh, cell: BoardCrystal): void {
    const bx = mesh.metadata.baseScaleX ?? 1;
    const by = mesh.metadata.baseScaleY ?? 1;
    const bz = mesh.metadata.baseScaleZ ?? 1;
    const boost = cell.power !== PowerType.None ? 1.05 : 1;
    mesh.scaling.set(bx * boost, by * boost, bz * boost);
  }

  private removeMesh(key: string): void {
    const mesh = this.meshes.get(key);
    if (mesh) {
      this.clearPowerStripes(mesh);
      mesh.dispose();
      this.meshes.delete(key);
      this.basePositions.delete(key);
    }
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      this.clearPowerStripes(mesh);
      mesh.dispose();
    }
    this.meshes.clear();
    this.basePositions.clear();
  }
}
