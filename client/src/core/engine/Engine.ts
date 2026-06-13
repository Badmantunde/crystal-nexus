import {
  Engine as BabylonEngine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color4,
  Color3,
  SceneLoaderFlags,
} from '@babylonjs/core';
import { boardCenter } from '@/features/board/BoardLayout';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  adaptToDeviceRatio?: boolean;
}

export class GameEngine {
  readonly engine: BabylonEngine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;

  constructor(config: EngineConfig) {
    SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;

    this.engine = new BabylonEngine(config.canvas, config.antialias ?? true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: config.adaptToDeviceRatio ?? true,
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.55, 0.78, 0.92, 1);

    const center = boardCenter();
    const target = new Vector3(center.x, 0, center.z);

    // Fixed top-down Candy Crush style view
    this.camera = new ArcRotateCamera(
      'mainCamera',
      -Math.PI / 2,
      0.85,
      13,
      target,
      this.scene,
    );
    this.camera.lowerBetaLimit = 0.85;
    this.camera.upperBetaLimit = 0.85;
    this.camera.lowerRadiusLimit = 13;
    this.camera.upperRadiusLimit = 13;
    this.camera.inputs.clear();
    this.camera.minZ = 0.1;

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 1.1;
    hemi.groundColor = new Color3(0.5, 0.55, 0.6);
    hemi.diffuse = new Color3(1, 1, 1);

    const sun = new DirectionalLight('sun', new Vector3(-0.3, -1, -0.4), this.scene);
    sun.position = new Vector3(5, 10, 5);
    sun.intensity = 0.7;

    this.handleResize(config.canvas);
  }

  private handleResize(canvas: HTMLCanvasElement): void {
    const resize = () => this.engine.resize();
    resize();
    window.addEventListener('resize', resize);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(resize);
      observer.observe(canvas.parentElement ?? canvas);
    }
  }

  start(renderLoop: () => void): void {
    this.engine.runRenderLoop(renderLoop);
  }

  dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
