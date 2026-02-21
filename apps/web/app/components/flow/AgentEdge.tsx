import { memo, useRef, useState, useCallback } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { useAgentStore } from '~/store/agent.store'
import { useFlowStore } from '~/store/flow.store'

function AgentEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleEnter = useCallback(() => {
    clearTimeout(leaveTimer.current)
    setHovered(true)
  }, [])

  const handleLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHovered(false), 150)
  }, [])

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const handleUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const agentStore = useAgentStore.getState()
    await agentStore.unlinkAgent(source, target)
    const updatedAgents = useAgentStore.getState().agents
    useFlowStore.getState().refreshFromAgents(updatedAgents)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: hovered ? 'var(--color-destructive)' : 'var(--color-primary)',
          strokeWidth: hovered ? 2.5 : 2,
          transition: 'stroke 0.15s, stroke-width 0.15s',
          ...style,
        }}
        markerEnd={markerEnd}
      />
      {/* Wide invisible hit area on top of the edge for easy hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ cursor: 'pointer' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      />
      <EdgeLabelRenderer>
        <button
          onClick={handleUnlink}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground shadow-sm hover:scale-110 transition-transform">
            <X className="h-3 w-3" />
          </div>
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export const AgentEdge = memo(AgentEdgeComponent)
