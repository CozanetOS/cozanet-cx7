import { WorldEngine } from '../WorldEngine/worldengine';
import { AnimationConfig, Vector3, Color } from '../types';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino({ name: 'AnimationEngine' });

interface ActiveAnimation {
  id: string;
  sceneId: string;
  unitId?: string;
  groupId?: string;
  config: AnimationConfig;
  startTime: number;
  timerId?: any; // node interval/timeout or frame reference
}

export class AnimationEngine {
  static readonly ENGINE_ID = 'cx7:animation';
  private activeAnimations = new Map<string, ActiveAnimation>();

  constructor(private world: WorldEngine) {}

  /**
   * Schedule and manage animation on a CX7Unit via WorldEngine.
   */
  animate(sceneId: string, unitId: string, config: AnimationConfig): string {
    const animId = uuidv4();
    const startTime = Date.now();

    // Verify unit exists
    const scene = this.world.getScene(sceneId);
    if (!scene.units.has(unitId)) {
      throw new Error(`Unit ${unitId} not found in scene ${sceneId}`);
    }

    // Capture initial state for relative animations
    const initialState = { ...scene.units.get(unitId)! };

    const intervalTime = 16; // ~60fps ticks
    const timerId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let progress = elapsed / config.duration;

      if (progress >= 1) {
        if (config.loop) {
          // Restart animation cycle
          const anim = this.activeAnimations.get(animId);
          if (anim) anim.startTime = Date.now();
          progress = 0;
        } else {
          // Finalize and stop
          this.applyAnimationFrame(sceneId, unitId, config, 1, initialState);
          this.stopAnimation(animId);
          return;
        }
      }

      this.applyAnimationFrame(sceneId, unitId, config, progress, initialState);
    }, intervalTime);

    this.activeAnimations.set(animId, {
      id: animId,
      sceneId,
      unitId,
      config,
      startTime,
      timerId
    });

    logger.info({ animId, unitId, type: config.type }, 'Animation scheduled');
    return animId;
  }

  /**
   * Schedule and manage animation on a whole group of CX7Units.
   */
  animateGroup(sceneId: string, groupId: string, config: AnimationConfig): string {
    const animId = uuidv4();
    const startTime = Date.now();

    const scene = this.world.getScene(sceneId);
    const unitIds = scene.groups.get(groupId);
    if (!unitIds || unitIds.length === 0) {
      throw new Error(`Group ${groupId} not found or empty in scene ${sceneId}`);
    }

    const initialStates = new Map(
      unitIds.map(id => [id, { ...scene.units.get(id)! }])
    );

    const intervalTime = 16;
    const timerId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let progress = elapsed / config.duration;

      if (progress >= 1) {
        if (config.loop) {
          const anim = this.activeAnimations.get(animId);
          if (anim) anim.startTime = Date.now();
          progress = 0;
        } else {
          unitIds.forEach(id => {
            this.applyAnimationFrame(sceneId, id, config, 1, initialStates.get(id)!);
          });
          this.stopAnimation(animId);
          return;
        }
      }

      unitIds.forEach(id => {
        this.applyAnimationFrame(sceneId, id, config, progress, initialStates.get(id)!);
      });
    }, intervalTime);

    this.activeAnimations.set(animId, {
      id: animId,
      sceneId,
      groupId,
      config,
      startTime,
      timerId
    });

    logger.info({ animId, groupId, type: config.type }, 'Group animation scheduled');
    return animId;
  }

  /**
   * Stop an active animation by its ID.
   */
  stopAnimation(animId: string): void {
    const anim = this.activeAnimations.get(animId);
    if (anim) {
      if (anim.timerId) {
        clearInterval(anim.timerId);
      }
      this.activeAnimations.delete(animId);
      logger.info({ animId }, 'Animation stopped');
    }
  }

  /**
   * Private helper to apply the animation state calculation to a unit.
   */
  private applyAnimationFrame(
    sceneId: string,
    unitId: string,
    config: AnimationConfig,
    progress: number,
    initialState: any
  ): void {
    const easedProgress = this.applyEasing(progress, config.easing);

    switch (config.type) {
      case 'rotate': {
        const speed = config.params?.speed ?? { x: 0, y: Math.PI * 2, z: 0 };
        const rotation: Vector3 = {
          x: initialState.rotation.x + speed.x * easedProgress,
          y: initialState.rotation.y + speed.y * easedProgress,
          z: initialState.rotation.z + speed.z * easedProgress
        };
        this.world.updateUnit(sceneId, unitId, { rotation });
        break;
      }
      case 'translate': {
        const offset = config.params?.offset ?? { x: 10, y: 0, z: 0 };
        const position: Vector3 = {
          x: initialState.position.x + offset.x * easedProgress,
          y: initialState.position.y + offset.y * easedProgress,
          z: initialState.position.z + offset.z * easedProgress
        };
        this.world.updateUnit(sceneId, unitId, { position });
        break;
      }
      case 'scale': {
        const targetScale = config.params?.targetScale ?? { x: 2, y: 2, z: 2 };
        const scale: Vector3 = {
          x: initialState.scale.x + (targetScale.x - initialState.scale.x) * easedProgress,
          y: initialState.scale.y + (targetScale.y - initialState.scale.y) * easedProgress,
          z: initialState.scale.z + (targetScale.z - initialState.scale.z) * easedProgress
        };
        this.world.updateUnit(sceneId, unitId, { scale });
        break;
      }
      case 'pulse': {
        const pulseScale = config.params?.pulseScale ?? 1.5;
        // Pulse pattern uses a sine wave relative to elapsed progress
        const wave = Math.sin(progress * Math.PI);
        const currentPulse = 1 + (pulseScale - 1) * wave;
        const scale: Vector3 = {
          x: initialState.scale.x * currentPulse,
          y: initialState.scale.y * currentPulse,
          z: initialState.scale.z * currentPulse
        };
        this.world.updateUnit(sceneId, unitId, { scale });
        break;
      }
      case 'orbit': {
        const center = config.params?.center ?? { x: 0, y: 0, z: 0 };
        const radius = config.params?.radius ?? 5;
        const speed = config.params?.speed ?? 1; // Orbit cycles
        const angle = easedProgress * Math.PI * 2 * speed;
        const position: Vector3 = {
          x: center.x + Math.cos(angle) * radius,
          y: initialState.position.y,
          z: center.z + Math.sin(angle) * radius
        };
        this.world.updateUnit(sceneId, unitId, { position });
        break;
      }
      case 'custom': {
        if (typeof config.params?.frameUpdate === 'function') {
          const updates = config.params.frameUpdate(easedProgress, initialState);
          this.world.updateUnit(sceneId, unitId, updates);
        }
        break;
      }
    }
  }

  /**
   * Apply basic easing formulas.
   */
  private applyEasing(t: number, easing = 'linear'): number {
    switch (easing) {
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'linear':
      default:
        return t;
    }
  }
}
