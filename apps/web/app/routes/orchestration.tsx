import { Link, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Bot, MessageSquare } from "lucide-react"
import { useEffect } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Button } from "~/components/ui/button"
import { IzanLogo } from "~/components/ui/izan-logo"
import { useAgentStore } from "~/store/agent.store"
import { useFlowStore } from "~/store/flow.store"
import { useUIStore } from "~/store/ui.store"
import { FlowEditor } from "~/components/flow/FlowEditor"
import { CreateAgentDialog } from "~/components/agents/CreateAgentDialog"
import { AgentEditPanel } from "~/components/agents/AgentEditPanel"

export function clientLoader() {
  return null
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Bot className="h-10 w-10 text-primary animate-pulse" />
    </div>
  )
}

export function meta() {
  return [{ title: "Orchestration - izan.io" }]
}

export default function Orchestration() {
  const { t } = useTranslation("common")
  const { lang } = useParams()
  const { agents, isInitialized, initialize } = useAgentStore()
  const rootAgentId = useFlowStore(s => s.rootAgentId)
  const isCreateAgentOpen = useUIStore(s => s.isCreateAgentOpen)
  const isAgentEditOpen = useUIStore(s => s.isAgentEditOpen)

  const rootAgent = agents.find(a => a.id === rootAgentId)

  useEffect(() => {
    if (!isInitialized) initialize()
  }, [isInitialized, initialize])

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
          <Link to={`/${lang}/agents`}>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link
            to={`/${lang}`}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <IzanLogo className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            <span className="text-lg sm:text-xl font-semibold truncate">
              izan.io
            </span>
          </Link>
          {rootAgent && (
            <Link to={`/chat/${rootAgent.slug}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t("flow.testChat")}</span>
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {isInitialized && agents.length > 0 ? (
          <ReactFlowProvider>
            <FlowEditor />
          </ReactFlowProvider>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Bot className="h-8 w-8 animate-pulse" />
          </div>
        )}
      </main>

      {isCreateAgentOpen && <CreateAgentDialog />}
      {isAgentEditOpen && <AgentEditPanel />}
    </div>
  )
}
