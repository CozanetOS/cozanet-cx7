// The WorldEngine is the CEO AI's interface to the CX7 visual system
// CEO AI issues WorldCommands; WorldEngine manages all CX7Units
import EventEmitter from 'eventemitter3';
import { CX7Unit } from '../CX7Unit/unit';
import { CX7UnitState, SceneState, WorldCommand, Vector3, SceneTemplate } from '../types';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'WorldEngine' });

export class WorldEngine extends EventEmitter {
  static readonly ENGINE_ID = 'cx7:world';
  private scenes = new Map<string, SceneState>();
  private activeSceneId: string | null = null;

  // Scene management
  createScene(name: string): string {
    const id = uuidv4();
    const scene: SceneState = {
      id, name,
      units: new Map(),
      groups: new Map(),
      camera: { position: { x: 0, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 }, fov: 60 },
      lighting: {
        ambient: { r: 0.4, g: 0.4, b: 0.4 },
        directional: [{ direction: { x: 1, y: -1, z: 1 }, color: { r: 1, g: 1, b: 1 } }]
      },
      createdAt: Date.now()
    };
    this.scenes.set(id, scene);
    this.activeSceneId = id;
    logger.info({ sceneId: id, name }, 'Scene created');
    this.emit('scene:created', scene);
    return id;
  }

  activateScene(sceneId: string): void {
    if (!this.scenes.has(sceneId)) throw new Error(`Scene ${sceneId} not found`);
    this.activeSceneId = sceneId;
    this.emit('scene:activated', sceneId);
  }

  // CEO AI calls these to construct visualizations
  createUnit(sceneId: string, overrides?: Partial<CX7UnitState>): CX7Unit {
    const scene = this.getScene(sceneId);
    const unit = new CX7Unit(overrides);
    scene.units.set(unit.id, unit.getState());
    this.emit('unit:created', { sceneId, unit: unit.getState() });
    return unit;
  }

  createUnits(sceneId: string, count: number, template?: Partial<CX7UnitState>): CX7Unit[] {
    // Efficient batch creation for large scenes
    const units: CX7Unit[] = [];
    for (let i = 0; i < count; i++) {
      units.push(this.createUnit(sceneId, template));
    }
    logger.info({ sceneId, count }, 'Batch units created');
    this.emit('units:batch-created', { sceneId, count, unitIds: units.map(u => u.id) });
    return units;
  }

  updateUnit(sceneId: string, unitId: string, updates: Partial<CX7UnitState>): void {
    const scene = this.getScene(sceneId);
    const existing = scene.units.get(unitId);
    if (!existing) throw new Error(`Unit ${unitId} not found`);
    scene.units.set(unitId, { ...existing, ...updates, updatedAt: Date.now() });
    this.emit('unit:updated', { sceneId, unitId, updates });
  }

  deleteUnit(sceneId: string, unitId: string): void {
    const scene = this.getScene(sceneId);
    scene.units.delete(unitId);
    this.emit('unit:deleted', { sceneId, unitId });
  }

  cloneUnit(sceneId: string, unitId: string, offset?: Vector3): CX7Unit {
    const scene = this.getScene(sceneId);
    const source = scene.units.get(unitId);
    if (!source) throw new Error(`Unit ${unitId} not found`);
    const cloned = new CX7Unit({ ...source, id: uuidv4() });
    if (offset) {
      cloned.setPosition({
        x: source.position.x + offset.x,
        y: source.position.y + offset.y,
        z: source.position.z + offset.z
      });
    }
    scene.units.set(cloned.id, cloned.getState());
    this.emit('unit:cloned', { sceneId, sourceId: unitId, cloneId: cloned.id });
    return cloned;
  }

  // Grouping - CEO AI organizes units into semantic groups
  createGroup(sceneId: string, groupId: string, unitIds: string[]): void {
    const scene = this.getScene(sceneId);
    scene.groups.set(groupId, unitIds);
    unitIds.forEach(id => {
      const unit = scene.units.get(id);
      if (unit) scene.units.set(id, { ...unit, groupId });
    });
    this.emit('group:created', { sceneId, groupId, unitIds });
  }

  moveGroup(sceneId: string, groupId: string, delta: Vector3): void {
    const scene = this.getScene(sceneId);
    const unitIds = scene.groups.get(groupId) ?? [];
    unitIds.forEach(id => {
      const unit = scene.units.get(id);
      if (unit) {
        scene.units.set(id, {
          ...unit,
          position: { x: unit.position.x + delta.x, y: unit.position.y + delta.y, z: unit.position.z + delta.z },
          updatedAt: Date.now()
        });
      }
    });
    this.emit('group:moved', { sceneId, groupId, delta });
  }

  // Scene templates for common visualization patterns
  applyTemplate(sceneId: string, template: SceneTemplate): void {
    switch (template) {
      case 'diagram': this.setupDiagramLayout(sceneId); break;
      case 'architecture': this.setupArchitectureLayout(sceneId); break;
      case 'network': this.setupNetworkLayout(sceneId); break;
      default: break;
    }
    this.emit('template:applied', { sceneId, template });
  }

  private setupDiagramLayout(sceneId: string): void {
    const scene = this.getScene(sceneId);
    scene.camera = { position: { x: 0, y: 10, z: 0 }, target: { x: 0, y: 0, z: 0 }, fov: 45 };
  }

  private setupArchitectureLayout(sceneId: string): void {
    const scene = this.getScene(sceneId);
    scene.camera = { position: { x: 15, y: 10, z: 15 }, target: { x: 0, y: 0, z: 0 }, fov: 60 };
  }

  private setupNetworkLayout(sceneId: string): void {
    const scene = this.getScene(sceneId);
    scene.camera = { position: { x: 0, y: 0, z: 20 }, target: { x: 0, y: 0, z: 0 }, fov: 75 };
  }

  clearScene(sceneId: string): void {
    const scene = this.getScene(sceneId);
    scene.units.clear();
    scene.groups.clear();
    this.emit('scene:cleared', sceneId);
  }

  getScene(sceneId: string): SceneState {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene ${sceneId} not found`);
    return scene;
  }

  getActiveScene(): SceneState | null {
    return this.activeSceneId ? this.scenes.get(this.activeSceneId) ?? null : null;
  }

  getUnitCount(sceneId: string): number {
    return this.getScene(sceneId).units.size;
  }

  // Execute a batch of WorldCommands (efficient for large operations)
  executeBatch(sceneId: string, commands: WorldCommand[]): void {
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'create': this.createUnit(sceneId, cmd.payload); break;
        case 'update': this.updateUnit(sceneId, cmd.targetId!, cmd.payload); break;
        case 'delete': this.deleteUnit(sceneId, cmd.targetId!); break;
        case 'clone': this.cloneUnit(sceneId, cmd.targetId!, cmd.payload?.offset); break;
        case 'group': this.createGroup(sceneId, cmd.payload.groupId, cmd.payload.unitIds); break;
        case 'clear': this.clearScene(sceneId); break;
      }
    }
    this.emit('batch:executed', { sceneId, commandCount: commands.length });
  }

  exportScene(sceneId: string): object {
    const scene = this.getScene(sceneId);
    return {
      id: scene.id,
      name: scene.name,
      camera: scene.camera,
      lighting: scene.lighting,
      units: Array.from(scene.units.values()),
      groups: Object.fromEntries(scene.groups),
      unitCount: scene.units.size,
    };
  }
}
