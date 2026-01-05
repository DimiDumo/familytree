import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/svelte';
import type { FamilyTree, FamilyUnit } from '$lib/types/family';

const elk = new ELK();

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const SINGLE_NODE_WIDTH = 150;
const PERSON_WIDTH = 140;

function getNodeWidth(unit: FamilyUnit): number {
	if (unit.type === 'polygamous') {
		// Base width + extra width for each additional person beyond 2
		return NODE_WIDTH + (unit.persons.length - 2) * PERSON_WIDTH;
	}
	return unit.type === 'couple' ? NODE_WIDTH : SINGLE_NODE_WIDTH;
}

// Reorder children of polygamous units so they align under their mothers
function reorderPolygamousChildren(nodes: Node[], familyTree: FamilyTree): void {
	// Find all polygamous units
	const polygamousUnits = Object.values(familyTree.units).filter(u => u.type === 'polygamous');

	for (const parentUnit of polygamousUnits) {
		// Get children of this polygamous unit
		const childUnits = parentUnit.childrenIds
			.map(id => familyTree.units[id])
			.filter(Boolean);

		if (childUnits.length === 0) continue;

		// Group children by motherIndex
		const childrenByMother = new Map<number, FamilyUnit[]>();
		for (const child of childUnits) {
			const motherIdx = child.motherIndex ?? 1; // Default to first wife if not specified
			const group = childrenByMother.get(motherIdx) || [];
			group.push(child);
			childrenByMother.set(motherIdx, group);
		}

		// Get parent node position
		const parentNode = nodes.find(n => n.id === parentUnit.id);
		if (!parentNode) continue;

		// Get child nodes and sort them by motherIndex
		const childNodes = childUnits
			.map(u => nodes.find(n => n.id === u.id))
			.filter((n): n is Node => n !== undefined);

		if (childNodes.length === 0) continue;

		// Sort child nodes by their unit's motherIndex
		childNodes.sort((a, b) => {
			const unitA = familyTree.units[a.id];
			const unitB = familyTree.units[b.id];
			const motherA = unitA?.motherIndex ?? 1;
			const motherB = unitB?.motherIndex ?? 1;
			return motherA - motherB;
		});

		// Collect current x positions and reassign in sorted order
		const xPositions = childNodes.map(n => n.position.x).sort((a, b) => a - b);
		childNodes.forEach((node, index) => {
			node.position.x = xPositions[index];
		});
	}
}

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

	// Sort units to ensure children are ordered by motherIndex (for polygamous parents)
	// This helps ELK position them correctly to avoid edge crossings
	const sortedUnits = [...units].sort((a, b) => {
		// If same parent, sort by motherIndex
		if (a.parentId && b.parentId && a.parentId === b.parentId) {
			const aMotherIndex = a.motherIndex ?? 0;
			const bMotherIndex = b.motherIndex ?? 0;
			return aMotherIndex - bMotherIndex;
		}
		return 0;
	});

	// Create ELK graph
	const elkGraph: ElkGraph = {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered',
			'elk.direction': 'DOWN',
			'elk.spacing.nodeNode': '50',
			'elk.layered.spacing.nodeNodeBetweenLayers': '80',
			'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
			'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
		},
		children: sortedUnits.map((unit) => ({
			id: unit.id,
			width: getNodeWidth(unit),
			height: NODE_HEIGHT
		})),
		edges: sortedUnits
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

	// Post-process: Reorder children of polygamous units to align with mothers
	reorderPolygamousChildren(nodes, familyTree);

	// Convert to Svelte Flow edges
	const edges: Edge[] = units
		.filter((unit) => unit.parentId)
		.map((unit) => {
			// Get the primary person's gender for edge coloring
			const primaryIndex = unit.primaryPersonIndex ?? 0;
			const primaryPerson = unit.persons[primaryIndex];
			const gender = primaryPerson?.gender;

			// Check if parent is polygamous and child has motherIndex
			const parentUnit = familyTree.units[unit.parentId!];
			const sourceHandle = parentUnit?.type === 'polygamous' && unit.motherIndex !== undefined
				? `mother-${unit.motherIndex}`
				: undefined;

			return {
				id: `e-${unit.parentId}-${unit.id}`,
				source: unit.parentId!,
				target: unit.id,
				type: 'family',
				sourceHandle,
				data: { gender }
			};
		});

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

	// Sort each level group by motherIndex to avoid edge crossings
	levelGroups.forEach((group) => {
		group.sort((a, b) => {
			// If same parent, sort by motherIndex
			if (a.parentId && b.parentId && a.parentId === b.parentId) {
				const aMotherIndex = a.motherIndex ?? 0;
				const bMotherIndex = b.motherIndex ?? 0;
				return aMotherIndex - bMotherIndex;
			}
			return 0;
		});
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
			// Get the primary person's gender for edge coloring
			const primaryIndex = unit.primaryPersonIndex ?? 0;
			const primaryPerson = unit.persons[primaryIndex];
			const gender = primaryPerson?.gender;

			// Check if parent is polygamous and child has motherIndex
			const parentUnit = familyTree.units[unit.parentId];
			const sourceHandle = parentUnit?.type === 'polygamous' && unit.motherIndex !== undefined
				? `mother-${unit.motherIndex}`
				: undefined;

			edges.push({
				id: `e-${unit.parentId}-${unit.id}`,
				source: unit.parentId,
				target: unit.id,
				type: 'family',
				sourceHandle,
				data: { gender }
			});
		}
	});

	return { nodes, edges };
}
