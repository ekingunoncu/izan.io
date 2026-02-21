import { Link, useParams, useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  Sun,
  Moon,
  Plug,
  CheckCircle,
  XCircle,
  Key,
  Gift,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Plus,
  AlertTriangle,
  Pencil,
  Shield,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Cog,
  FileJson,
  HardDrive,
  MessageSquare,
  Archive,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IzanLogo } from "~/components/ui/izan-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useTheme, type Theme } from "~/lib/theme";
import { useMCPStore, useModelStore } from "~/store";
import { useChatStore } from "~/store/chat.store";
import { useAgentStore } from "~/store/agent.store";
import { storageService } from "~/lib/services";
import { useAutomationStore } from "~/store/automation.store";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import { requestAutomationData, sendPreferenceToExtension } from "~/lib/mcp/extension-bridge";
import { cn } from "~/lib/utils";
import { type SupportedLanguage, setStoredLanguagePreference } from "~/i18n";
import { useProvidersWithModels } from "~/lib/use-providers-with-models";
import { agentIconMap } from "~/lib/agent-icons";

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
];

const THEMES: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: "light", icon: Sun, labelKey: "settings.themeLight" },
  { value: "dark", icon: Moon, labelKey: "settings.themeDark" },
];

// Client-only: uses localStorage and navigator
export function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Bot className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function meta() {
  return [{ title: "Settings - izan.io" }];
}

function ProviderKeyRow({
  providerId,
  providerName,
  apiKeyUrl,
  envHint,
  descriptionKey,
  pricingUrl,
  hasFreeTier,
  isLocal,
  currentKey,
  onSave,
  onRemove,
  isExpanded,
  onToggle,
  inputRef,
}: {
  providerId: string;
  providerName: string;
  apiKeyUrl: string;
  envHint: string;
  descriptionKey?: string;
  pricingUrl?: string;
  hasFreeTier?: boolean;
  isLocal?: boolean;
  currentKey: string | null;
  onSave: (key: string) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation("common");
  const [key, setKey] = useState(currentKey ?? "");
  const [showKey, setShowKey] = useState(false);

  // Sync local state when currentKey loads from IndexedDB (e.g. after page refresh)
  useEffect(() => {
    queueMicrotask(() => setKey(currentKey ?? ""));
  }, [currentKey]);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="font-medium flex-1 truncate">{providerName}</span>
        {isLocal ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs bg-violet-400/90 text-violet-950 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-1 rounded-md flex items-center gap-1.5 flex-shrink-0 cursor-help">
                <HardDrive className="h-3.5 w-3.5" />
                {t("provider.local")}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {t(`provider.localHint.${providerId}`)}
            </TooltipContent>
          </Tooltip>
        ) : hasFreeTier ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs bg-emerald-400/90 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 rounded-md flex items-center gap-1.5 flex-shrink-0 cursor-help">
                <Gift className="h-3.5 w-3.5" />
                {t("provider.freeTier")}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {t(`provider.freeTierHint.${providerId}`)}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {currentKey && (
          <span className="text-xs bg-emerald-400/90 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 rounded-md flex items-center gap-1.5 flex-shrink-0">
            <CheckCircle className="h-3.5 w-3.5" />
            {t("settings.connected")}
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-3 bg-muted/30 rounded-b-lg">
          {descriptionKey && (
            <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <div className="relative flex-1 min-w-0">
              <Input
                ref={inputRef}
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={`${envHint}...`}
                className="pr-10 h-9"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <Button
                size="sm"
                className="h-9 px-4"
                onClick={() => key.trim() && onSave(key.trim())}
                disabled={!key.trim()}
              >
                {t("settings.save")}
              </Button>
              {currentKey && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-destructive hover:bg-destructive/10"
                  onClick={onRemove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {!isLocal && (
            <div className="flex flex-wrap gap-2">
              <a
                href={apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {t("settings.getApiKey")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {pricingUrl && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <a
                    href={pricingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("settings.viewPricing")} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Macros Section ─────────────────────────────────────────────────────────

function AutomationToolsSection() {
  const { t } = useTranslation("common");
  const {
    servers: autoServers,
    initialized,
    initialize,
    getToolsByServer,
  } = useAutomationStore();

  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  useEffect(() => {
    requestAutomationData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          {t("settings.macrosTitle")}
        </CardTitle>
        <CardDescription>
          {t("settings.macrosDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {autoServers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("settings.macrosNoServers")}
          </p>
        ) : (
          <div className="space-y-2">
            {autoServers.map((server) => {
              const serverTools = getToolsByServer(server.id);
              const isExpanded = expandedServer === server.id;

              return (
                <div key={server.id} className="rounded-lg border">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2 p-3 w-full text-left cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedServer(isExpanded ? null : server.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedServer(isExpanded ? null : server.id); } }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{server.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {serverTools.length} {t("settings.macrosTools")}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-3 pb-3 space-y-2">
                      {server.description && (
                        <p className="text-xs text-muted-foreground pt-2">{server.description}</p>
                      )}
                      {serverTools.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          {t("settings.macrosNoTools")}
                        </p>
                      ) : (
                        <div className="space-y-1 pt-2">
                          {serverTools.map((tool) => (
                            <div
                              key={tool.id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors"
                            >
                              <FileJson className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{tool.displayName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {tool.steps.length} {t("settings.macrosSteps")} · {tool.parameters.length} {t("settings.macrosParams")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const VIEWPORT_PRESETS = [
  { label: "1280 x 800", width: 1280, height: 800 },
  { label: "1366 x 768", width: 1366, height: 768 },
  { label: "1440 x 900", width: 1440, height: 900 },
  { label: "1920 x 1080", width: 1920, height: 1080 },
] as const;

function AutomationBrowserSection() {
  const { t } = useTranslation("common");
  const isExtensionInstalled = useMCPStore((s) => s.isExtensionInstalled);
  const [foreground, setForeground] = useState(true);
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });
  const [loaded, setLoaded] = useState(false);

  // Load saved preferences from IndexedDB
  useEffect(() => {
    storageService.getPreferences().then((prefs) => {
      setForeground(prefs.automationBrowserForeground !== false);
      setLoaded(true);
    });
  }, []);

  if (!loaded || !isExtensionInstalled) return null;

  const handleForegroundChange = (value: boolean) => {
    setForeground(value);
    storageService.updatePreferences({ automationBrowserForeground: value });
    // Sync to extension
    sendPreferenceToExtension("automationBrowserForeground", value);
  };

  const handleViewportChange = (w: number, h: number) => {
    setViewport({ width: w, height: h });
    sendPreferenceToExtension("automationViewport", { width: w, height: h });
  };

  const currentPreset = VIEWPORT_PRESETS.find(
    (p) => p.width === viewport.width && p.height === viewport.height
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          {t("settings.automationBrowserTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Foreground toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t("settings.automationBrowserForeground")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("settings.automationBrowserForegroundDesc")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={foreground}
            onClick={() => handleForegroundChange(!foreground)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              foreground ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                foreground ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Viewport resolution */}
        <div>
          <p className="text-sm font-medium mb-1.5">{t("settings.automationViewport")}</p>
          <p className="text-xs text-muted-foreground mb-2">{t("settings.automationViewportDesc")}</p>
          <div className="flex flex-wrap gap-1.5">
            {VIEWPORT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleViewportChange(preset.width, preset.height)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  currentPreset?.label === preset.label
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "bg-muted/50 border-border hover:bg-muted"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getAgentIcon(iconId: string) {
  return agentIconMap[iconId] || Bot;
}

function ChatStorageSection() {
  const { t } = useTranslation("common");
  const [chatMessageLimit, setChatMessageLimit] = useState(0);
  const [chatHistoryLimit, setChatHistoryLimit] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const { clearAllChats, clearMultipleAgentChats } = useChatStore();
  const { agents, initialize: initAgents, isInitialized: agentsReady } = useAgentStore();

  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAgentOpen, setClearAgentOpen] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [clearAllSuccess, setClearAllSuccess] = useState(false);
  const [clearAgentSuccess, setClearAgentSuccess] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageService.getPreferences().then((prefs) => {
      setChatMessageLimit(prefs.chatMessageLimit ?? 0);
      setChatHistoryLimit(prefs.chatHistoryLimit ?? 0);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!agentsReady) initAgents();
  }, [agentsReady, initAgents]);

  // Close combobox on click outside
  useEffect(() => {
    if (!comboboxOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboboxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [comboboxOpen]);

  // Focus search input when combobox opens
  useEffect(() => {
    if (comboboxOpen) searchInputRef.current?.focus();
  }, [comboboxOpen]);

  if (!loaded) return null;

  const handleChange = (field: "chatMessageLimit" | "chatHistoryLimit", raw: string) => {
    const v = Math.max(0, Math.floor(parseInt(raw, 10)) || 0);
    if (field === "chatMessageLimit") setChatMessageLimit(v);
    else setChatHistoryLimit(v);
    storageService.updatePreferences({ [field]: v });
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const handleClearAll = async () => {
    setClearAllOpen(false);
    await clearAllChats();
    setClearAllSuccess(true);
    setTimeout(() => setClearAllSuccess(false), 2000);
  };

  const handleClearAgents = async () => {
    if (selectedAgentIds.size === 0) return;
    setClearAgentOpen(false);
    await clearMultipleAgentChats([...selectedAgentIds]);
    setClearAgentSuccess(true);
    setTimeout(() => setClearAgentSuccess(false), 2000);
    setSelectedAgentIds(new Set());
  };

  const selectedNames = agents
    .filter((a) => selectedAgentIds.has(a.id))
    .map((a) => a.name);

  const filteredAgents = agentSearch.trim()
    ? agents.filter((a) => a.name.toLowerCase().includes(agentSearch.toLowerCase()))
    : agents;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          {t("settings.chatStorageTitle")}
        </CardTitle>
        <CardDescription>{t("settings.chatStorageDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { field: "chatMessageLimit" as const, value: chatMessageLimit, icon: MessageSquare },
            { field: "chatHistoryLimit" as const, value: chatHistoryLimit, icon: Archive },
          ]).map(({ field, value, icon: Icon }) => (
            <div key={field} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">{t(`settings.${field}`)}</span>
              </div>
              <Input
                type="number"
                min={0}
                value={value || ""}
                placeholder={t("settings.chatStorageNoLimit")}
                onChange={(e) => handleChange(field, e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t(`settings.${field}Hint`)}
              </p>
            </div>
          ))}
        </div>

        {/* Data Management */}
        <div className="border-t pt-3 space-y-2">
          {/* Clear All - minimal row, matches analytics clear style */}
          <div className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Trash2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t("settings.clearAllChats")}</p>
                <p className="text-[11px] text-muted-foreground">{t("settings.clearAllChatsDesc")}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-shrink-0 gap-1.5 text-xs h-7",
                clearAllSuccess
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground hover:text-destructive"
              )}
              onClick={() => setClearAllOpen(true)}
              disabled={clearAllSuccess}
            >
              {clearAllSuccess ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  {t("settings.cleared")}
                </>
              ) : (
                t("settings.clearAllChats")
              )}
            </Button>
          </div>

          {/* Clear per Agent */}
          <div className="rounded-lg border p-2.5 space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t("settings.clearAgentChats")}</p>
                <p className="text-[11px] text-muted-foreground">{t("settings.clearAgentChatsDesc")}</p>
              </div>
            </div>

            {/* Multi-select combobox */}
            <div className="relative" ref={comboboxRef}>
              {/* Trigger - matches provider search input style */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setComboboxOpen((v) => !v)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md border border-input bg-background pl-8 pr-3 h-8 text-xs transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    comboboxOpen && "ring-2 ring-ring"
                  )}
                >
                  <span className={cn(
                    "truncate",
                    selectedAgentIds.size === 0 ? "text-muted-foreground" : "text-foreground font-medium"
                  )}>
                    {selectedAgentIds.size === 0
                      ? t("settings.selectAgents")
                      : t("settings.selectedAgentsCount", { count: selectedAgentIds.size })}
                  </span>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                    comboboxOpen && "rotate-180"
                  )} />
                </button>
              </div>

              {/* Selected agent tags - matches MCP builtin badge style */}
              {selectedAgentIds.size > 0 && !comboboxOpen && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {agents.filter((a) => selectedAgentIds.has(a.id)).map((agent) => (
                    <span
                      key={agent.id}
                      className="inline-flex items-center gap-1 rounded bg-slate-300/80 text-slate-800 dark:bg-muted dark:text-muted-foreground px-1.5 py-0.5 text-[11px]"
                    >
                      {(() => { const I = getAgentIcon(agent.icon); return <I className="h-3 w-3" />; })()}
                      <span className="truncate max-w-[100px]">{agent.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id); }}
                        className="hover:text-foreground cursor-pointer ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown */}
              {comboboxOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
                  {/* Search input */}
                  <div className="flex items-center gap-2 border-b px-2.5 py-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      placeholder={t("settings.searchAgents")}
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                    {agentSearch && (
                      <button type="button" onClick={() => setAgentSearch("")} className="cursor-pointer">
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Agent list */}
                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredAgents.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {t("agents.searchNoResults")}
                      </p>
                    ) : (
                      filteredAgents.map((agent) => {
                        const isSelected = selectedAgentIds.has(agent.id);
                        return (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => toggleAgent(agent.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer",
                              "hover:bg-muted/50",
                              isSelected && "bg-muted/30"
                            )}
                          >
                            {/* Checkbox */}
                            <span className={cn(
                              "flex h-3.5 w-3.5 items-center justify-center rounded-sm border flex-shrink-0 transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            )}>
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="stroke-current">
                                  <path d="M2 5.5L4 7.5L8 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            {(() => { const I = getAgentIcon(agent.icon); return <I className="h-4 w-4 text-muted-foreground flex-shrink-0" />; })()}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{agent.name}</p>
                              {agent.description && (
                                <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action row */}
            <div className="flex justify-end pt-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 text-xs h-7",
                  clearAgentSuccess
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground hover:text-destructive"
                )}
                onClick={() => setClearAgentOpen(true)}
                disabled={selectedAgentIds.size === 0 || clearAgentSuccess}
              >
                {clearAgentSuccess ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t("settings.cleared")}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("settings.clearSelected", { count: selectedAgentIds.size })}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Clear All Confirmation */}
        <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.clearAllChats")}</AlertDialogTitle>
              <AlertDialogDescription>{t("settings.clearAllChatsConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("agents.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("settings.clearAllChats")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear Agents Confirmation */}
        <AlertDialog open={clearAgentOpen} onOpenChange={setClearAgentOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.clearAgentChats")}</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedNames.length > 0
                  ? t("settings.clearAgentChatsConfirmNames", { agents: selectedNames.join(", ") })
                  : t("settings.clearAgentChatsConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("agents.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAgents} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("settings.clearSelected", { count: selectedAgentIds.size })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const backTo = from ?? `/${lang}`;
  const [theme, setTheme] = useTheme();
  const {
    servers,
    userServers,
    error,
    addUserServer,
    removeUserServer,
    updateUserServer,
    disabledBuiltinMCPIds,
    setDisabledBuiltinMCPIds,
  } = useMCPStore();
  const {
    providerKeys,
    selectedProvider,
    selectedModel,
    setApiKey,
    removeApiKey,
    initialize: initModel,
  } = useModelStore();

  // Ensure model store is initialized when Settings mounts
  useEffect(() => {
    void initModel();
  }, [initModel]);

  // Add MCP server form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerDesc, setNewServerDesc] = useState("");
  const [newServerHeaders, setNewServerHeaders] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Edit server details (name, url, headers, agents)
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editHeaders, setEditHeaders] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Provider search (client-side)
  const [providerSearch, setProviderSearch] = useState("");
  // Expanded provider for API key (accordion)
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  // Built-in MCP section: expanded by default so users can disable servers
  const [builtinMcpExpanded, setBuiltinMcpExpanded] = useState(true);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);

  // Built-in: show only name + description (no connection status, no API calls)
  const customServerStates = servers.filter((s) => s.config.source === "user");

  // Filter built-in servers to in-browser only (exclude extension servers)
  const inBrowserServers = DEFAULT_MCP_SERVERS.filter((s) => !s.id.startsWith("ext-"));

  const parseHeaders = (raw: string): Record<string, string> | null => {
    if (!raw.trim()) return {};
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k === "string" && typeof v === "string") out[k] = v;
      }
      return out;
    } catch {
      return null;
    }
  };

  const handleAddServer = async () => {
    if (!newServerName.trim()) {
      setFormError(t("settings.mcpNameRequired"));
      return;
    }
    if (!newServerUrl.trim()) {
      setFormError(t("settings.mcpUrlRequired"));
      return;
    }
    const headers = parseHeaders(newServerHeaders);
    if (headers === null) {
      setFormError(t("settings.mcpHeadersInvalid"));
      return;
    }
    setFormError(null);
    setIsAdding(true);
    try {
      await addUserServer({
        name: newServerName.trim(),
        url: newServerUrl.trim(),
        description: newServerDesc.trim(),
        headers: Object.keys(headers).length ? headers : undefined,
        assignedAgentIds: [],
      });
      // Reset form
      setNewServerName("");
      setNewServerUrl("");
      setNewServerDesc("");
      setNewServerHeaders("");
      setShowAddForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add server"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    setDeleteServerId(serverId);
  };

  const handleDeleteServerConfirm = async () => {
    if (!deleteServerId) return;
    setDeleteServerId(null);
    setEditingDetailsId(null);
    await removeUserServer(deleteServerId);
  };

  const startEditDetails = (us: (typeof userServers)[0]) => {
    setEditingDetailsId(us.id);
    setEditName(us.name);
    setEditUrl(us.url);
    setEditDesc(us.description ?? "");
    setEditHeaders(us.headers ? JSON.stringify(us.headers, null, 2) : "");
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingDetailsId) return;
    if (!editName.trim()) {
      setEditError(t("settings.mcpNameRequired"));
      return;
    }
    if (!editUrl.trim()) {
      setEditError(t("settings.mcpUrlRequired"));
      return;
    }
    const headers = parseHeaders(editHeaders);
    if (headers === null) {
      setEditError(t("settings.mcpHeadersInvalid"));
      return;
    }
    setEditError(null);
    setIsSaving(true);
    try {
      await updateUserServer(editingDetailsId, {
        name: editName.trim(),
        url: editUrl.trim(),
        description: editDesc.trim() || undefined,
        headers: Object.keys(headers).length ? headers : undefined,
      });
      setEditingDetailsId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const { providers, filterProviders: doFilter } = useProvidersWithModels();

  const handleLanguageChange = (code: SupportedLanguage) => {
    setStoredLanguagePreference(code);
    navigate(`/${code}/settings`);
  };

  const toggleBuiltinMCP = async (serverId: string) => {
    const disabled = disabledBuiltinMCPIds.includes(serverId)
      ? disabledBuiltinMCPIds.filter((id) => id !== serverId)
      : [...disabledBuiltinMCPIds, serverId];
    await setDisabledBuiltinMCPIds(disabled);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
          <Link to={backTo}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link
            to={backTo}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <IzanLogo className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            <span className="text-lg sm:text-xl font-semibold truncate">
              izan.io
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("settings.title")}
          </h1>

          {/* AI Provider Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("settings.providersTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.providersDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProvider && selectedModel && (
                <div className="text-xs text-slate-700 dark:text-muted-foreground bg-slate-200/80 dark:bg-muted px-3 py-2 rounded-lg">
                  {t("settings.activeProvider")}: <strong>{providers.find(p => p.id === selectedProvider)?.name}</strong>{" "}
                  / <strong>{selectedModel}</strong>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("settings.providerSearchPlaceholder")}
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {(() => {
                const filtered = doFilter(providerSearch);
                if (filtered.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {t("settings.providerSearchNoResults")}
                    </p>
                  );
                }
                return (
                  <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                    {filtered.map((provider) => (
                  <ProviderKeyRow
                    key={provider.id}
                    providerId={provider.id}
                    providerName={provider.name}
                    apiKeyUrl={provider.apiKeyUrl}
                    envHint={provider.envHint}
                    hasFreeTier={provider.hasFreeTier}
                    isLocal={provider.isLocal}
                    currentKey={providerKeys[provider.id] ?? null}
                    onSave={(key) => setApiKey(provider.id, key)}
                    onRemove={() => removeApiKey(provider.id)}
                    isExpanded={expandedProviderId === provider.id}
                    onToggle={() =>
                      setExpandedProviderId((prev) =>
                        prev === provider.id ? null : provider.id
                      )
                    }
                  />
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Built-in MCP Servers - expandable, collapsed by default */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("settings.mcpBuiltinTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.mcpBuiltinDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={() => setBuiltinMcpExpanded((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {builtinMcpExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-sm font-medium">
                  {builtinMcpExpanded
                    ? t("settings.mcpBuiltinCollapse")
                    : t("settings.mcpBuiltinExpand", {
                        count: inBrowserServers.length,
                      })}
                </span>
              </button>
              {builtinMcpExpanded &&
                inBrowserServers.map((config) => {
                  const isDisabled = disabledBuiltinMCPIds.includes(config.id);
                  return (
                    <div
                      key={config.id}
                      className="flex items-start gap-2 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isDisabled ? (
                            <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" aria-hidden />
                          )}
                          <p className="font-medium truncate text-sm">
                            {config.name}
                          </p>
                          <span className="text-xs bg-slate-300/80 text-slate-800 dark:bg-muted dark:text-muted-foreground px-1.5 py-0.5 rounded">
                            {t("settings.mcpBuiltin")}
                          </span>
                        </div>
                        {config.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {config.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant={isDisabled ? "outline" : "secondary"}
                        size="sm"
                        className="text-xs h-7 flex-shrink-0"
                        onClick={() => toggleBuiltinMCP(config.id)}
                      >
                        {isDisabled
                          ? t("settings.mcpBuiltinEnable")
                          : t("settings.mcpBuiltinDisable")}
                      </Button>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Macros */}
          <AutomationToolsSection />

          {/* Automation Browser */}
          <AutomationBrowserSection />

          {/* Custom MCP Servers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                {t("settings.mcpCustomTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.mcpCustomDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CORS Warning */}
              <div className="flex gap-3 rounded-lg border border-amber-500 dark:border-amber-700 bg-amber-300/90 dark:bg-amber-950/30 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-800 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-950 dark:text-amber-200">
                  {t("settings.mcpCorsWarning")}
                </p>
              </div>

              {/* User server list */}
              {userServers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("settings.mcpNoCustomServers")}
                </p>
              )}

              {userServers.map((us) => {
                const serverState = customServerStates.find(
                  (s) => s.config.id === us.id
                );
                const isEditing = editingDetailsId === us.id;

                return (
                  <div
                    key={us.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {us.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {us.url}
                        </p>
                        {us.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {us.description}
                          </p>
                        )}
                        {serverState?.status === "connected" &&
                          serverState.tools.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("settings.mcpToolCount", {
                                count: serverState.tools.length,
                              })}
                            </p>
                          )}
                        {serverState?.status === "error" &&
                          serverState.error && (
                            <p className="text-xs text-destructive mt-1 break-all">
                              {serverState.error}
                            </p>
                          )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {serverState?.status === "connected" ? (
                          <span className="flex items-center gap-1 text-xs text-green-800 dark:text-green-400 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </span>
                        ) : serverState?.status === "error" ? (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-3.5 w-3.5" />
                          </span>
                        ) : serverState?.status === "connecting" ? (
                          <span className="text-xs text-muted-foreground">
                            {t("settings.mcpConnecting")}
                          </span>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEditDetails(us)}
                          title={t("settings.mcpEdit")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteServer(us.id)}
                          title={t("settings.mcpDelete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Edit form */}
                    {isEditing && (
                      <div className="border-t pt-3 space-y-3">
                        {editError && (
                          <p className="text-xs text-destructive">{editError}</p>
                        )}
                        <div>
                          <label className="text-xs font-medium block mb-1">
                            {t("settings.mcpServerName")}
                          </label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder={t("settings.mcpServerNamePlaceholder")}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">
                            {t("settings.mcpServerUrl")}
                          </label>
                          <Input
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            placeholder={t("settings.mcpServerUrlPlaceholder")}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">
                            {t("settings.mcpServerDescription")}
                          </label>
                          <Input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder={t("settings.mcpServerDescPlaceholder")}
                            className="text-xs h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">
                            {t("settings.mcpHeaders")}
                          </label>
                          <textarea
                            value={editHeaders}
                            onChange={(e) => setEditHeaders(e.target.value)}
                            placeholder={t("settings.mcpHeadersPlaceholder")}
                            className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                            spellCheck={false}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                          >
                            {isSaving ? "..." : t("settings.mcpSaveChanges")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => setEditingDetailsId(null)}
                          >
                            {t("settings.mcpCancel")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add server form */}
              {showAddForm ? (
                <div className="rounded-lg border border-dashed p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {t("settings.mcpAddServer")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormError(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium">
                        {t("settings.mcpServerName")}
                      </label>
                      <Input
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder={t("settings.mcpServerNamePlaceholder")}
                        className="text-xs h-8 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">
                        {t("settings.mcpServerUrl")}
                      </label>
                      <Input
                        value={newServerUrl}
                        onChange={(e) => setNewServerUrl(e.target.value)}
                        placeholder={t("settings.mcpServerUrlPlaceholder")}
                        className="text-xs h-8 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">
                        {t("settings.mcpServerDescription")}
                      </label>
                      <Input
                        value={newServerDesc}
                        onChange={(e) => setNewServerDesc(e.target.value)}
                        placeholder={t("settings.mcpServerDescPlaceholder")}
                        className="text-xs h-8 mt-1"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvanced((v) => !v)}
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showAdvanced ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {t("settings.mcpAdvanced")}
                      </button>
                      {showAdvanced && (
                        <div className="mt-2">
                          <label className="text-xs font-medium block mb-1">
                            {t("settings.mcpHeaders")}
                          </label>
                          <textarea
                            value={newServerHeaders}
                            onChange={(e) => setNewServerHeaders(e.target.value)}
                            placeholder={t("settings.mcpHeadersPlaceholder")}
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                            spellCheck={false}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("settings.mcpHeadersHint")}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>

                  {formError && (
                    <p className="text-xs text-destructive">{formError}</p>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => {
                        setShowAddForm(false);
                        setFormError(null);
                      }}
                    >
                      {t("settings.mcpCancel")}
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      className="text-xs h-8"
                      onClick={handleAddServer}
                      disabled={
                        isAdding ||
                        !newServerName.trim() ||
                        !newServerUrl.trim()
                      }
                    >
                      {isAdding ? t("settings.mcpConnecting") : t("settings.mcpAdd")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t("settings.mcpAddServer")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Chat Storage */}
          <ChatStorageSection />

          {/* Language */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.language")}</CardTitle>
              <CardDescription>
                {LANGUAGES.find((l) => l.code === lang)?.label || lang}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Button
                  key={l.code}
                  variant="outline"
                  size="sm"
                  className={cn(
                    lang === l.code ? "bg-muted font-medium" : ""
                  )}
                  onClick={() => handleLanguageChange(l.code)}
                >
                  {l.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.theme")}</CardTitle>
              <CardDescription>
                {t(
                  theme === "dark" ? "settings.themeDark" : "settings.themeLight"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {THEMES.map(({ value, icon: Icon, labelKey }) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2",
                    theme === value ? "bg-muted font-medium" : ""
                  )}
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={deleteServerId !== null} onOpenChange={(open) => !open && setDeleteServerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.mcpDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.mcpDeleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("agents.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteServerConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("settings.mcpDelete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
