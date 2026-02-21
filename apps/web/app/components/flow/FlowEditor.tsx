import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeDragHandler,
  type EdgeMouseHandler,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTranslation } from 'react-i18next'
import { Bot } from 'lucide-react'
import { useAgentStore } from '~/store/agent.store'
import { useFlowStore } from '~/store/flow.store'
import { useUIStore } from '~/store/ui.store'
import { validateConnection } from '~/lib/flow/depth-validator'
import { AgentNode } from './AgentNode'
import { AgentEdge } from './AgentEdge'
import { FlowControls } from './FlowControls'

export function FlowEditor() {
  const { t } = useTranslation('common')
  const { agents } = useAgentStore()
  const nodes = useFlowStore(s => s.nodes)
  const edges = useFlowStore(s => s.edges)
  const rootAgentId = useFlowStore(s => s.rootAgentId)
  const rootAgentHistory = useFlowStore(s => s.rootAgentHistory)
  const _fitViewTrigger = useFlowStore(s => s._fitViewTrigger)
  const _ready = useFlowStore(s => s._ready)
  const initializeFlow = useFlowStore(s => s.initializeFlow)
  const updateNodePosition = useFlowStore(s => s.updateNodePosition)
  const setRootAgent = useFlowStore(s => s.setRootAgent)
  const drillInto = useFlowStore(s => s.drillInto)
  const drillBack = useFlowStore(s => s.drillBack)
  const autoLayout = useFlowStore(s => s.autoLayout)

  const { fitView } = useReactFlow()

  // settled = true after the first fitView completes — hides the flash
  const [settled, setSettled] = useState(false)
  const hasSettled = useRef(false)

  const nodeTypes = useMemo(() => ({ agentNode: AgentNode }), [])
  const edgeTypes = useMemo(() => ({ agentEdge: AgentEdge }), [])

  // Initialize on mount — only once
  useEffect(() => {
    if (_ready) return
    const loadPositions = async () => {
      try {
        const { storageService } = await import('~/lib/services')
        const prefs = await storageService.getPreferences()
        initializeFlow(agents, prefs.flowNodePositions ?? {})
      } catch {
        initializeFlow(agents)
      }
    }
    loadPositions()
  }, [_ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Programmatic fitView whenever _fitViewTrigger changes
  useEffect(() => {
    if (_fitViewTrigger === 0) return
    const timer = setTimeout(() => {
      fitView({ padding: 0.3 })
      // After the first fitView, reveal the canvas
      if (!hasSettled.current) {
        hasSettled.current = true
        requestAnimationFrame(() => setSettled(true))
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [_fitViewTrigger, fitView])

  // Apply ReactFlow internal changes (dimensions, positions, selections) to our store.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const filtered = changes.filter(c => c.type !== 'remove')
    if (filtered.length === 0) return
    useFlowStore.setState(state => ({
      nodes: applyNodeChanges(filtered, state.nodes),
    }))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const filtered = changes.filter(c => c.type !== 'remove')
    if (filtered.length === 0) return
    useFlowStore.setState(state => ({
      edges: applyEdgeChanges(filtered, state.edges),
    }))
  }, [])

  const onNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    updateNodePosition(node.id, node.position)
  }, [updateNodePosition])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const agentStore = useAgentStore.getState()
    agentStore.selectAgent(node.id)
    useUIStore.getState().openAgentEdit()
  }, [])

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    drillInto(node.id)
  }, [drillInto])

  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return
    if (connection.source !== rootAgentId) return

    const currentAgents = useAgentStore.getState().agents
    const error = validateConnection(connection.source, connection.target, currentAgents)
    if (error) {
      console.warn('[flow] Connection rejected:', error)
      return
    }

    const agentStore = useAgentStore.getState()
    await agentStore.linkAgent(connection.source, connection.target)
  }, [rootAgentId])

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(async (_event, edge) => {
    const agentStore = useAgentStore.getState()
    await agentStore.unlinkAgent(edge.source, edge.target)
  }, [])

  if (!_ready) return null

  const isEmpty = rootAgentId === null

  return (
    <div className="w-full h-full relative">
      {isEmpty ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium mb-1">
              {t('flow.empty')}
            </p>
            <p className="text-sm">
              {t('flow.emptyHint')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Loading overlay — visible until first fitView settles */}
          {!settled && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
              <Bot className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          )}

          {/* ReactFlow renders invisibly while measuring, then fades in */}
          <div className={`w-full h-full transition-opacity duration-200 ${settled ? 'opacity-100' : 'opacity-0'}`}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onEdgeDoubleClick={onEdgeDoubleClick}
              defaultEdgeOptions={{ animated: true }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
          </div>
        </>
      )}

      {/* Controls rendered outside ReactFlow so they're always visible */}
      <FlowControls
        rootAgentId={rootAgentId}
        agents={agents}
        canDrillBack={rootAgentHistory.length > 0}
        onRootAgentChange={setRootAgent}
        onDrillBack={drillBack}
        onAutoLayout={autoLayout}
      />
    </div>
  )
}
