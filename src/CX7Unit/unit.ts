// A CX7Unit has NO intelligence - it only exposes a capability interface
// All intelligence lives in the WorldEngine and CEO AI
import { CX7UnitState, Vector3, Color, MaterialType, InteractionType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class CX7Unit {
  readonly id: string;
  private state: CX7UnitState;

  constructor(overrides?: Partial<CX7UnitState>) {
    this.id = overrides?.id ?? uuidv4();
    this.state = {
      id: this.id,
      position: overrides?.position ?? { x: 0, y: 0, z: 0 },
      rotation: overrides?.rotation ?? { x: 0, y: 0, z: 0 },
      scale: overrides?.scale ?? { x: 1, y: 1, z: 1 },
      color: overrides?.color ?? { r: 1, g: 1, b: 1, a: 1 },
      transparency: overrides?.transparency ?? 0,
      material: overrides?.material ?? 'standard',
      visible: overrides?.visible ?? true,
      interactive: overrides?.interactive ?? 'none',
      attachedTo: overrides?.attachedTo,
      groupId: overrides?.groupId,
      tags: overrides?.tags ?? [],
      metadata: overrides?.metadata ?? {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // Capabilities - the only interface CX7Unit exposes
  setPosition(v: Vector3): this { this.state.position = v; this.state.updatedAt = Date.now(); return this; }
  setRotation(v: Vector3): this { this.state.rotation = v; this.state.updatedAt = Date.now(); return this; }
  setScale(v: Vector3): this { this.state.scale = v; this.state.updatedAt = Date.now(); return this; }
  setColor(c: Color): this { this.state.color = c; this.state.updatedAt = Date.now(); return this; }
  setTransparency(t: number): this { this.state.transparency = Math.max(0, Math.min(1, t)); this.state.updatedAt = Date.now(); return this; }
  setMaterial(m: MaterialType): this { this.state.material = m; this.state.updatedAt = Date.now(); return this; }
  setVisible(v: boolean): this { this.state.visible = v; this.state.updatedAt = Date.now(); return this; }
  setInteraction(i: InteractionType): this { this.state.interactive = i; this.state.updatedAt = Date.now(); return this; }
  attachTo(parentId: string): this { this.state.attachedTo = parentId; this.state.updatedAt = Date.now(); return this; }
  detach(): this { this.state.attachedTo = undefined; this.state.updatedAt = Date.now(); return this; }
  addTag(tag: string): this { if (!this.state.tags.includes(tag)) this.state.tags.push(tag); return this; }
  setMetadata(key: string, value: any): this { this.state.metadata[key] = value; return this; }
  getState(): Readonly<CX7UnitState> { return { ...this.state }; }
  clone(): CX7Unit { return new CX7Unit({ ...this.state, id: uuidv4(), createdAt: Date.now(), updatedAt: Date.now() }); }
  serialize(): string { return JSON.stringify(this.state); }
  static deserialize(json: string): CX7Unit { return new CX7Unit(JSON.parse(json)); }
}
