/**
 * Auto-layout for agent flow graph using dagre.
 */

import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

const ROOT_WIDTH = 320
const ROOT_HEIGHT = 120
const LINKED_WIDTH = 240
const LINKED_HEIGHT = 100

/** Apply dagre auto-layout to nodes and edges (left-to-right direction) */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'LR',
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 150 })

  for (const node of nodes) {
    const isRoot = (node.data as { isRoot?: boolean })?.isRoot
    const w = isRoot ? ROOT_WIDTH : LINKED_WIDTH
    const h = isRoot ? ROOT_HEIGHT : LINKED_HEIGHT
    g.setNode(node.id, { width: w, height: h })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = g.node(node.id)
    const isRoot = (node.data as { isRoot?: boolean })?.isRoot
    const w = isRoot ? ROOT_WIDTH : LINKED_WIDTH
    const h = isRoot ? ROOT_HEIGHT : LINKED_HEIGHT
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - h / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
