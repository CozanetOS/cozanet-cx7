// The VisionEngine lets the CEO AI inspect and verify scenes
import { WorldEngine } from '../WorldEngine/worldengine';
import { VisionReport, Vector3 } from '../types';
import pino from 'pino';

const logger = pino({ name: 'VisionEngine' });

export class VisionEngine {
  static readonly ENGINE_ID = 'cx7:vision';
  constructor(private world: WorldEngine) {}

  inspectScene(sceneId: string): VisionReport {
    const scene = this.world.getScene(sceneId);
    const units = Array.from(scene.units.values());
    const issues: string[] = [];

    // Check for overlapping units at exact same position
    const posMap = new Map<string, number>();
    units.forEach(u => {
      const key = `${u.position.x},${u.position.y},${u.position.z}`;
      posMap.set(key, (posMap.get(key) ?? 0) + 1);
    });
    posMap.forEach((count, pos) => {
      if (count > 1) issues.push(`${count} units overlap at position ${pos}`);
    });

    // Calculate scene bounds
    const bounds = this.calculateBounds(units.map(u => u.position));

    // Generate natural language description
    const description = this.describeScene(scene.name, units.length, scene.groups.size, issues);

    const report: VisionReport = {
      sceneId,
      unitCount: units.length,
      groupCount: scene.groups.size,
      bounds,
      visibleUnits: units.filter(u => u.visible).length,
      issues,
      description,
      timestamp: Date.now()
    };

    logger.info({ sceneId, unitCount: units.length, issues: issues.length }, 'Scene inspected');
    return report;
  }

  private calculateBounds(positions: Vector3[]): { min: Vector3; max: Vector3 } {
    if (positions.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    return {
      min: {
        x: Math.min(...positions.map(p => p.x)),
        y: Math.min(...positions.map(p => p.y)),
        z: Math.min(...positions.map(p => p.z))
      },
      max: {
        x: Math.max(...positions.map(p => p.x)),
        y: Math.max(...positions.map(p => p.y)),
        z: Math.max(...positions.map(p => p.z))
      }
    };
  }

  private describeScene(name: string, unitCount: number, groupCount: number, issues: string[]): string {
    const issueText = issues.length > 0 ? ` Issues detected: ${issues.join('; ')}.` : ' No issues detected.';
    return `Scene "${name}" contains ${unitCount} CX7 units organized in ${groupCount} groups.${issueText}`;
  }

  verifyVisualization(sceneId: string, expectedDescription: string): boolean {
    const report = this.inspectScene(sceneId);
    // Basic sanity checks - CEO AI can use this to confirm intent
    logger.info({ sceneId, expectedDescription, actual: report.description }, 'Visualization verified');
    return report.issues.length === 0;
  }

  getUnitsByGroup(sceneId: string, groupId: string): string[] {
    const scene = this.world.getScene(sceneId);
    return scene.groups.get(groupId) ?? [];
  }

  findUnitsByTag(sceneId: string, tag: string): string[] {
    const scene = this.world.getScene(sceneId);
    return Array.from(scene.units.values()).filter(u => u.tags.includes(tag)).map(u => u.id);
  }
}
