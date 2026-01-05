import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/svelte';
import type { FamilyTree, FamilyUnit } from '$lib/types/family';

const elk = new ELK();

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const SINGLE_NODE_WIDTH = 150;

interface ElkNode {
	id: string;
	width: number;
	height: number;
}

interface ElkEdge {
	id: string;
	sources: string[];
	targets: string[];
}

interface ElkGraph {
	id: string;
	layoutOptions: Record<string, string>;
	children: ElkNode[];
	edges: ElkEdge[];
}

export async function layoutFamilyTree(
	familyTree: FamilyTree
): Promise<{ nodes: Node[]; edges: Edge[] }> {
	const units = Object.values(familyTree.units);

	// Create ELK graph
	const elkGraph: ElkGraph = {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered',
			'elk.direction': 'DOWN',
			'elk.spacing.nodeNode': '50',
			'elk.layered.spacing.nodeNodeBetweenLayers': '80',
			'elk.layered.nodePlacement.strategy': 'SIMPLE'
		},
		children: units.map((unit) => ({
			id: unit.id,
			width: unit.type === 'couple' ? NODE_WIDTH : SINGLE_NODE_WIDTH,
			height: NODE_HEIGHT
		})),
		edges: units
			.filter((unit) => unit.parentId)
			.map((unit) => ({
				id: `e-${unit.parentId}-${unit.id}`,
				sources: [unit.parentId!],
				targets: [unit.id]
			}))
	};

	// Run ELK layout
	const layoutedGraph = await elk.layout(elkGraph);

	// Convert to Svelte Flow nodes
	const nodes: Node[] = (layoutedGraph.children || []).map((elkNode) => {
		const unit = familyTree.units[elkNode.id];
		return {
			id: elkNode.id,
			type: 'family',
			position: { x: elkNode.x || 0, y: elkNode.y || 0 },
			data: { unit }
		};
	});

	// Convert to Svelte Flow edges
	const edges: Edge[] = units
		.filter((unit) => unit.parentId)
		.map((unit) => ({
			id: `e-${unit.parentId}-${unit.id}`,
			source: unit.parentId!,
			target: unit.id,
			type: 'family'
		}));

	return { nodes, edges };
}

export function familyTreeToNodesEdges(familyTree: FamilyTree): { nodes: Node[]; edges: Edge[] } {
	const units = Object.values(familyTree.units);

	// Simple manual layout (fallback without ELK)
	const nodes: Node[] = [];
	const edges: Edge[] = [];

	// Build level map
	const levels = new Map<string, number>();
	const childrenByParent = new Map<string, FamilyUnit[]>();

	// Initialize
	units.forEach((unit) => {
		if (unit.parentId) {
			const siblings = childrenByParent.get(unit.parentId) || [];
			siblings.push(unit);
			childrenByParent.set(unit.parentId, siblings);
		}
	});

	// BFS to assign levels
	const queue: { id: string; level: number }[] = [{ id: familyTree.rootId, level: 0 }];
	while (queue.length > 0) {
		const { id, level } = queue.shift()!;
		levels.set(id, level);
		const unit = familyTree.units[id];
		unit.childrenIds.forEach((childId) => {
			queue.push({ id: childId, level: level + 1 });
		});
	}

	// Group by level
	const levelGroups = new Map<number, FamilyUnit[]>();
	units.forEach((unit) => {
		const level = levels.get(unit.id) ?? 0;
		const group = levelGroups.get(level) || [];
		group.push(unit);
		levelGroups.set(level, group);
	});

	// Position nodes
	const VERTICAL_SPACING = 180;
	const HORIZONTAL_SPACING = 300;

	levelGroups.forEach((group, level) => {
		const totalWidth = group.length * HORIZONTAL_SPACING;
		const startX = -totalWidth / 2 + HORIZONTAL_SPACING / 2;

		group.forEach((unit, index) => {
			nodes.push({
				id: unit.id,
				type: 'family',
				position: {
					x: startX + index * HORIZONTAL_SPACING,
					y: level * VERTICAL_SPACING
				},
				data: { unit }
			});
		});
	});

	// Create edges
	units.forEach((unit) => {
		if (unit.parentId) {
			edges.push({
				id: `e-${unit.parentId}-${unit.id}`,
				source: unit.parentId,
				target: unit.id,
				type: 'family'
			});
		}
	});

	return { nodes, edges };
}
