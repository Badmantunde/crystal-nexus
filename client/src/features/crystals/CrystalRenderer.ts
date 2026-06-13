import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Animation,
  ParticleSystem,
  Texture,
  Color4,
  GlowLayer,
} from '@babylonjs/core';
import {
  CRYSTAL_DEFINITIONS,
  PowerType,
} from '@crystal-nexus/shared';
import type { BoardCrystal } from '../match3/BoardCrystal';

const CELL_SIZE = 1;
const CELL_GAP = 0.08;

export class CrystalRenderer {
  private meshes = new Map<string, Mesh>();
  private glowLayer: GlowLayer;

  constructor(private scene: Scene) {
    this.glowLayer = new GlowLayer('crystalGlow', scene);
    this.glowLayer.intensity = 0.6;
  }

  syncGrid(
    grid: readonly (readonly (BoardCrystal | null)[])[],
    offsetX = 0,
    offsetZ = 0,
  ): void {
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

        const pos = this.cellToWorld(r, c, offsetX, offsetZ);
        let mesh = this.meshes.get(key);

        if (!mesh) {
          mesh = this.createCrystalMesh(cell, key);
          this.meshes.set(key, mesh);
        } else {
          this.updateCrystalMesh(mesh, cell);
        }

        mesh.position.copyFrom(pos);
        mesh.metadata = { row: r, col: c, category: cell.category, power: cell.power };
        this.applyPowerVisuals(mesh, cell);
      }
    }

    for (const key of this.meshes.keys()) {
      if (!activeKeys.has(key)) this.removeMesh(key);
    }
  }

  getMeshAt(row: number, col: number): Mesh | undefined {
    return this.meshes.get(`${row},${col}`);
  }

  highlight(row: number, col: number, on: boolean): void {
    const mesh = this.meshes.get(`${row},${col}`);
    if (!mesh) return;
    const base = mesh.metadata?.power !== PowerType.None ? 1.12 : 1;
    mesh.scaling.setAll(on ? base * 1.12 : base);
  }

  private cellToWorld(row: number, col: number, offsetX: number, offsetZ: number): Vector3 {
    return new Vector3(
      col * (CELL_SIZE + CELL_GAP) + offsetX,
      0.5,
      row * (CELL_SIZE + CELL_GAP) + offsetZ,
    );
  }

  private createCrystalMesh(cell: BoardCrystal, key: string): Mesh {
    const def = CRYSTAL_DEFINITIONS[cell.category];
    const mesh = this.buildShape(def.shape, `crystal_${key}`);
    const intensity = cell.power !== PowerType.None ? def.emissiveIntensity * 1.5 : def.emissiveIntensity;
    this.applyMaterial(mesh, def.primaryColor, def.secondaryColor, intensity);
    this.addBreathingAnimation(mesh);
    this.addParticleAura(mesh, def.primaryColor, cell.power !== PowerType.None);
    this.glowLayer.addIncludedOnlyMesh(mesh);
    return mesh;
  }

  private updateCrystalMesh(mesh: Mesh, cell: BoardCrystal): void {
    const def = CRYSTAL_DEFINITIONS[cell.category];
    const prevPower = mesh.metadata?.power;
    const prevCategory = mesh.metadata?.category;
    if (prevCategory === cell.category && prevPower === cell.power) return;

    mesh.metadata.category = cell.category;
    mesh.metadata.power = cell.power;
    const intensity = cell.power !== PowerType.None ? def.emissiveIntensity * 1.5 : def.emissiveIntensity;
    this.applyMaterial(mesh, def.primaryColor, def.secondaryColor, intensity);
  }

  private applyPowerVisuals(mesh: Mesh, cell: BoardCrystal): void {
    const base = cell.power !== PowerType.None ? 1.12 : 1;
    mesh.scaling.setAll(base);

    if (cell.power === PowerType.Fused) {
      mesh.rotation.y += 0.02;
    }
  }

  private buildShape(
    shape: 'octahedron' | 'dodecahedron' | 'icosahedron' | 'tetrahedron' | 'prism',
    name: string,
  ): Mesh {
    switch (shape) {
      case 'tetrahedron':
        return MeshBuilder.CreatePolyhedron(name, { type: 0, size: 0.4 }, this.scene);
      case 'octahedron':
        return MeshBuilder.CreatePolyhedron(name, { type: 1, size: 0.4 }, this.scene);
      case 'icosahedron':
        return MeshBuilder.CreatePolyhedron(name, { type: 2, size: 0.4 }, this.scene);
      case 'dodecahedron':
        return MeshBuilder.CreatePolyhedron(name, { type: 3, size: 0.4 }, this.scene);
      case 'prism':
        return MeshBuilder.CreateCylinder(name, { height: 0.7, diameter: 0.5, tessellation: 6 }, this.scene);
    }
  }

  private applyMaterial(
    mesh: Mesh,
    primary: string,
    secondary: string,
    emissive: number,
  ): void {
    let mat = mesh.material as StandardMaterial | null;
    if (!mat) {
      mat = new StandardMaterial(`mat_${mesh.name}`, this.scene);
      mesh.material = mat;
    }
    mat.diffuseColor = Color3.FromHexString(primary);
    mat.emissiveColor = Color3.FromHexString(secondary).scale(emissive * 0.3);
    mat.specularColor = Color3.White();
    mat.specularPower = 128;
    mat.alpha = 0.92;
  }

  private addBreathingAnimation(mesh: Mesh): void {
    if (mesh.animations.length > 0) return;
    const anim = new Animation(
      'breathe',
      'scaling',
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    anim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 30, value: new Vector3(1.05, 1.08, 1.05) },
      { frame: 60, value: new Vector3(1, 1, 1) },
    ]);
    mesh.animations.push(anim);
    this.scene.beginAnimation(mesh, 0, 60, true);
  }

  private addParticleAura(mesh: Mesh, color: string, powered: boolean): void {
    const ps = new ParticleSystem(`aura_${mesh.name}`, powered ? 50 : 30, this.scene);
    ps.particleTexture = new Texture(
      'https://assets.babylonjs.com/textures/flare.png',
      this.scene,
    );
    ps.emitter = mesh;
    ps.minEmitBox = new Vector3(-0.2, -0.2, -0.2);
    ps.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
    ps.color1 = Color4.FromHexString(color + 'AA');
    ps.color2 = Color4.FromHexString(color + '44');
    ps.minSize = powered ? 0.03 : 0.02;
    ps.maxSize = powered ? 0.09 : 0.06;
    ps.emitRate = powered ? 14 : 8;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;
    ps.gravity = new Vector3(0, 0.05, 0);
    ps.minLifeTime = 0.4;
    ps.maxLifeTime = 0.8;
    ps.start();
  }

  private removeMesh(key: string): void {
    const mesh = this.meshes.get(key);
    if (mesh) {
      mesh.dispose();
      this.meshes.delete(key);
    }
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) mesh.dispose();
    this.meshes.clear();
    this.glowLayer.dispose();
  }
}
