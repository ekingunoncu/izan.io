import { useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bot, Settings } from "lucide-react";
import { isSupportedLanguage } from "~/i18n";
import { Button } from "~/components/ui/button";
import { AgentSidebar } from "~/components/agents/AgentSidebar";
import { AgentEditPanel } from "~/components/agents/AgentEditPanel";
import { CreateAgentDialog } from "~/components/agents/CreateAgentDialog";
import { ChatHeader } from "~/components/chat/ChatHeader";
import { ChatWindow } from "~/components/chat/ChatWindow";
import { ModelSelector } from "~/components/chat/ModelSelector";
import { useModelStore, useAgentStore, useUIStore, useMCPStore } from "~/store";
import { initializeDatabase } from "~/lib/db";

// Client-only: all data loading happens in the browser
export function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Bot className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    </div>
  );
}

export function meta() {
  return [
    { title: "Chat - izan.io" },
    { name: "robots", content: "noindex" },
  ];
}

export default function Chat() {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const { agentSlug } = useParams();
  const lang = (i18n.language || "tr").split("-")[0];
  const settingsPath = isSupportedLanguage(lang) ? `/${lang}/settings` : "/tr/settings";
  const {
    initialize: initModel,
    isInitialized: isModelInitialized,
    isConfigured,
  } = useModelStore();
  const {
    initialize: initAgent,
    isInitialized: isAgentInitialized,
    getAgentBySlug,
    selectAgent,
    currentAgent,
    getAgentSlug,
  } = useAgentStore();
  const {
    isModelSelectorOpen,
    openModelSelector,
    closeModelSelector,
    isAgentEditOpen,
    isCreateAgentOpen,
  } = useUIStore();
  const { initialize: initMCP } = useMCPStore();

  // Initialize database and stores
  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await Promise.all([
        initModel(),
        initAgent(),
        initMCP(),
      ]);
    };
    init();
  }, [initModel, initAgent, initMCP]);

  const isInitialized = isModelInitialized && isAgentInitialized;
  const showModelSelectorModal =
    isModelSelectorOpen || (!isConfigured() && isInitialized);

  // Sync model selector modal state for scroll lock (when forced open due to !isConfigured)
  useEffect(() => {
    if (!isConfigured() && isInitialized) {
      openModelSelector();
    }
  }, [isConfigured, isInitialized, openModelSelector]);

  // Sync agent from URL (agentSlug) when opening shared link
  useEffect(() => {
    if (!isInitialized || !agentSlug) return
    const agent = getAgentBySlug(agentSlug)
    if (agent && currentAgent?.id !== agent.id) {
      selectAgent(agent.id).then(() => {
        useMCPStore.getState().activateAgentMCPs(agent)
      })
    }
  }, [isInitialized, agentSlug, getAgentBySlug, currentAgent?.id, selectAgent])

  // When on /chat with no slug, update URL to include current agent for shareable links
  useEffect(() => {
    if (!isInitialized || !currentAgent || agentSlug) return
    const slug = getAgentSlug(currentAgent)
    if (slug) navigate(`/chat/${slug}`, { replace: true })
  }, [isInitialized, currentAgent, agentSlug, getAgentSlug, navigate])

  // Loading state
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen h-[100dvh]">
      {/* Sidebar */}
      <AgentSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
          <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
            <Link to={lang ? `/${lang}` : "/"}>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link
              to={lang ? `/${lang}` : "/"}
              className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
            >
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <span className="text-lg sm:text-xl font-semibold truncate">
                izan.io
              </span>
            </Link>
            <Link to={settingsPath} state={{ from: location.pathname }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] sm:h-10 sm:w-10"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Chat Header with Model Selector + Edit Button */}
        <ChatHeader />

        {/* Chat Area */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <ChatWindow />
        </main>
      </div>

      {/* Agent Edit Panel (right drawer) */}
      {isAgentEditOpen && <AgentEditPanel />}

      {/* Create Agent Dialog */}
      {isCreateAgentOpen && <CreateAgentDialog />}

      {/* Model Selector Modal */}
      {showModelSelectorModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-background border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin pb-[env(safe-area-inset-bottom)]">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("modelSelector.selectModelTitle")}</h2>
              {isConfigured() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeModelSelector}
                >
                  {t("modelSelector.close")}
                </Button>
              )}
            </div>
            <ModelSelector onModelLoaded={closeModelSelector} />
          </div>
        </div>
      )}
    </div>
  );
}
