export type Vector3 = { x: number; y: number; z: number };
export type Color = { r: number; g: number; b: number; a?: number }; // 0-1 range
export type MaterialType = 'standard' | 'wireframe' | 'points' | 'transparent' | 'emissive';
export type AnimationType = 'rotate' | 'translate' | 'scale' | 'pulse' | 'orbit' | 'custom';
export type InteractionType = 'click' | 'hover' | 'drag' | 'none';

export interface CX7UnitState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: Color;
  transparency: number; // 0-1
  material: MaterialType;
  visible: boolean;
  interactive: InteractionType;
  attachedTo?: string; // parent unit ID
  groupId?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface AnimationConfig {
  type: AnimationType;
  duration: number; // in milliseconds
  loop: boolean;
  easing?: string;
  params?: Record<string, any>;
}

export interface SceneState {
  id: string;
  name: string;
  units: Map<string, CX7UnitState>;
  groups: Map<string, string[]>;
  camera: { position: Vector3; target: Vector3; fov: number };
  lighting: { ambient: Color; directional: { direction: Vector3; color: Color }[] };
  createdAt: number;
}

export interface WorldCommand {
  type: 'create' | 'update' | 'delete' | 'clone' | 'group' | 'animate' | 'camera' | 'clear';
  targetId?: string;
  payload: any;
}

export interface VisionReport {
  sceneId: string;
  unitCount: number;
  groupCount: number;
  bounds: { min: Vector3; max: Vector3 };
  visibleUnits: number;
  issues: string[];
  description: string;
  timestamp: number;
}

export type SceneTemplate = 'diagram' | 'architecture' | 'dataflow' | 'timeline' | 'network' | 'blank';
