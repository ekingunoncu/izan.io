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
  Puzzle,
  Cog,
  FileJson,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useTheme, type Theme } from "~/lib/theme";
import { useMCPStore, useModelStore, useExternalApiKeysStore } from "~/store";
import { useAutomationStore } from "~/store/automation.store";
import { EXTERNAL_API_KEY_DEFINITIONS } from "~/lib/external-api-keys";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import { fetchExtensionServerRegistry, type ExtensionRegistryServer } from "~/lib/mcp/remote-tools";
import { requestAutomationData } from "~/lib/mcp/extension-bridge";
import { cn } from "~/lib/utils";
import { type SupportedLanguage, setStoredLanguagePreference } from "~/i18n";
import { useProvidersWithModels } from "~/lib/use-providers-with-models";
// Additional icons are imported from lucide-react above

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
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="font-medium flex-1 truncate">{providerName}</span>
        {hasFreeTier && (
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
        )}
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
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
        </div>
      )}
    </div>
  );
}

// ─── Extension Servers Section ──────────────────────────────────────────────

function ExtensionServersSection({
  isExtensionInstalled,
  extensionServers,
  servers,
}: {
  isExtensionInstalled: boolean;
  extensionServers: { id: string; name: string; description: string; category: string; channelId: string }[];
  servers: { config: { id: string }; status: string; tools: { name: string }[]; error?: string }[];
}) {
  const { t } = useTranslation("common");
  const [registryServers, setRegistryServers] = useState<ExtensionRegistryServer[]>([]);
  const [registryError, setRegistryError] = useState(false);
  const [registryLoading, setRegistryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const registry = await fetchExtensionServerRegistry();
        if (!cancelled) {
          setRegistryServers(registry.servers.filter((s) => s.type === "static"));
          setRegistryError(false);
        }
      } catch {
        if (!cancelled) {
          setRegistryServers([]);
          setRegistryError(true);
        }
      } finally {
        if (!cancelled) setRegistryLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          {t("settings.extensionTitle")}
        </CardTitle>
        <CardDescription>
          {t("settings.extensionDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extension install status */}
        <div className="flex items-center gap-3">
          {isExtensionInstalled ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {t("settings.extensionInstalled")}
                </span>
                {extensionServers.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.extensionServerCount", { count: extensionServers.length })}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("settings.extensionNotInstalled")}
              </span>
            </>
          )}
        </div>

        {/* Pre-built extension servers from S3 registry */}
        {!registryLoading && registryServers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("settings.extensionPrebuiltServers")}
            </h4>
            {registryServers.map((regServer) => {
              const liveServer = extensionServers.find((es) => es.id === regServer.id);
              const serverState = servers.find((s) => s.config.id === regServer.id);
              return (
                <div
                  key={regServer.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{regServer.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {t("settings.extensionPrebuiltBadge")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{regServer.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {regServer.tools.length} {t("settings.macrosTools")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {!isExtensionInstalled ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {t("settings.extensionRequiresExt")}
                      </span>
                    ) : liveServer && serverState?.status === "connected" ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {t("settings.mcpConnected")}
                      </span>
                    ) : liveServer && serverState?.status === "error" ? (
                      <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" />
                        {t("settings.mcpError")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("settings.mcpDisconnected")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {registryError && (
          <p className="text-xs text-red-500 text-center py-2">
            {t("settings.extensionRegistryError")}
          </p>
        )}

        {/* Live extension servers (runtime, not in registry) */}
        {isExtensionInstalled && extensionServers.length > 0 && (
          <div className="space-y-2">
            {extensionServers
              .filter((es) => !registryServers.some((rs) => rs.id === es.id) && es.id !== "ext-dynamic")
              .map((extServer) => {
                const serverState = servers.find((s) => s.config.id === extServer.id);
                return (
                  <div
                    key={extServer.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{extServer.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{extServer.description}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {serverState?.status === "connected" ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t("settings.mcpConnected")}
                        </span>
                      ) : serverState?.status === "error" ? (
                        <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          {t("settings.mcpError")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("settings.mcpDisconnected")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Macros Section ─────────────────────────────────────────────────────────

interface PrebuiltServer {
  id: string;
  name: string;
  description: string;
  category: string;
  tools: string[];
}

function MacroServerCard({
  name,
  description,
  toolCount,
  badge,
  badgeColor,
  isEnabled,
  onToggle,
  isExpanded,
  onToggleExpand,
  children,
}: {
  name: string;
  description?: string;
  toolCount: number;
  badge: string;
  badgeColor: string;
  isEnabled: boolean;
  onToggle?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="rounded-lg border">
      <div
        role="button"
        tabIndex={0}
        className="flex items-center gap-2 p-3 w-full text-left cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{name}</p>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", badgeColor)}>
              {badge}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{toolCount} {t("settings.macrosTools", "macro(s)")}</p>
        </div>
        {onToggle && (
          <label className="flex items-center gap-2 flex-shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={onToggle}
              className="rounded border-input cursor-pointer"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isEnabled ? t("settings.macrosEnabled", "Enabled") : t("settings.macrosDisabled", "Disabled")}
            </span>
          </label>
        )}
      </div>

      {isExpanded && (
        <div className="border-t px-3 pb-3 space-y-2">
          {description && (
            <p className="text-xs text-muted-foreground pt-2">{description}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

function AutomationToolsSection() {
  const { t } = useTranslation("common");
  const {
    servers: autoServers,
    initialized,
    initialize,
    updateServer,
    getToolsByServer,
  } = useAutomationStore();

  const { isExtensionInstalled } = useMCPStore();

  // ─── Local state ──────────────────────────────────────────────
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [prebuiltServers, setPrebuiltServers] = useState<PrebuiltServer[]>([]);
  const [prebuiltError, setPrebuiltError] = useState(false);
  const [prebuiltLoading, setPrebuiltLoading] = useState(true);

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  // Fetch pre-built macros from extension server registry (type === "automation")
  useEffect(() => {
    let cancelled = false;
    async function loadRegistry() {
      try {
        const registry = await fetchExtensionServerRegistry();
        if (!cancelled) {
          setPrebuiltServers(
            registry.servers
              .filter((s) => s.type === "automation")
              .map((s) => ({ id: s.id, name: s.name, description: s.description, category: s.category, tools: s.tools }))
          );
          setPrebuiltError(false);
        }
      } catch {
        if (!cancelled) {
          setPrebuiltServers([]);
          setPrebuiltError(true);
        }
      } finally {
        if (!cancelled) setPrebuiltLoading(false);
      }
    }
    loadRegistry();
    // Request fresh automation data from the extension
    requestAutomationData();
    return () => { cancelled = true; };
  }, []);

  const hasPrebuilt = prebuiltServers.length > 0;
  const hasUserServers = autoServers.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          {t("settings.macrosTitle", "Macros")}
        </CardTitle>
        <CardDescription>
          {t("settings.macrosDesc", "Automate browser workflows with recorded macros. Pre-built macros are available out of the box, or record your own from the extension side panel.")}
        </CardDescription>
        <p className="text-xs text-muted-foreground mt-1">
          {t("settings.macrosSidePanelHint", "To record new macros, open the extension side panel and click Record Macro.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Extension required warning */}
        {!isExtensionInstalled && (
          <div className="flex gap-3 rounded-lg border border-amber-500 dark:border-amber-700 bg-amber-300/90 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="h-5 w-5 text-amber-800 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-950 dark:text-amber-200">
              {t("settings.macrosExtRequired", "Browser extension is required for recording and running macros.")}
            </p>
          </div>
        )}

        {/* Pre-built Macros */}
        {!prebuiltLoading && hasPrebuilt && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("settings.macrosPrebuiltSection", "Pre-built Macros")}
            </h4>
            {prebuiltServers.map((server) => (
              <MacroServerCard
                key={server.id}
                name={server.name}
                description={server.description}
                toolCount={server.tools.length}
                badge={t("settings.macrosPrebuiltBadge", "Pre-built")}
                badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                isEnabled={true}
                isExpanded={expandedServer === server.id}
                onToggleExpand={() => setExpandedServer(expandedServer === server.id ? null : server.id)}
              >
                {server.tools.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    {t("settings.macrosNoTools", "No macros in this server yet.")}
                  </p>
                ) : (
                  <div className="space-y-1 pt-2">
                    {server.tools.map((toolName) => (
                      <div
                        key={toolName}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors"
                      >
                        <FileJson className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <p className="text-xs font-medium truncate">{toolName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </MacroServerCard>
            ))}
          </div>
        )}

        {prebuiltError && (
          <p className="text-xs text-red-500 text-center py-2">
            {t("settings.macrosLoadError", "Failed to load pre-built macros.")}
          </p>
        )}

        {/* User Macros */}
        <div className="space-y-2">
          {(hasPrebuilt || hasUserServers) && (
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("settings.macrosUserSection", "Your Macros")}
            </h4>
          )}

          {!hasUserServers && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("settings.macrosNoServers", "No macros yet. Record your first macro from the extension side panel.")}
            </p>
          )}

          {autoServers.map((server) => {
            const serverTools = getToolsByServer(server.id);
            const isEnabled = !server.disabled;

            return (
              <MacroServerCard
                key={server.id}
                name={server.name}
                description={server.description}
                toolCount={serverTools.length}
                badge={t("settings.macrosUserBadge", "User")}
                badgeColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                isEnabled={isEnabled}
                onToggle={() => updateServer(server.id, { disabled: isEnabled })}
                isExpanded={expandedServer === server.id}
                onToggleExpand={() => setExpandedServer(expandedServer === server.id ? null : server.id)}
              >
                {serverTools.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    {t("settings.macrosNoTools", "No macros in this server yet.")}
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
                            {tool.steps.length} {t("settings.macrosSteps", "step(s)")} · {tool.parameters.length} {t("settings.macrosParams", "param(s)")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MacroServerCard>
            );
          })}
        </div>
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
  const addApiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const addApiKeyFromHash = location.hash?.slice(1) || null; // e.g. #serp_api or #coingecko_api
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
    isExtensionInstalled,
    extensionServers,
  } = useMCPStore();
  const {
    providerKeys,
    selectedProvider,
    selectedModel,
    setApiKey,
    removeApiKey,
    initialize: initModel,
  } = useModelStore();
  const {
    getExternalApiKey,
    setExternalApiKey,
    removeExternalApiKey,
    initialize: initExternalKeys,
  } = useExternalApiKeysStore();

  // Ensure model store and external API keys are initialized when Settings mounts
  useEffect(() => {
    void initModel();
    void initExternalKeys();
  }, [initModel, initExternalKeys]);

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
  const [expandedExternalKeyId, setExpandedExternalKeyId] = useState<string | null>(() => {
    const hash = location.hash?.slice(1);
    if (hash && EXTERNAL_API_KEY_DEFINITIONS.some((d) => d.id === hash)) return hash;
    return null;
  });
  // Built-in MCP section: expanded by default so users can disable servers
  const [builtinMcpExpanded, setBuiltinMcpExpanded] = useState(true);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);

  // When opened via #serp_api (Add API Key): focus the input once, then clear hash
  const hasFocusedForAddApiKey = useRef(false);
  useEffect(() => {
    if (!addApiKeyFromHash || hasFocusedForAddApiKey.current) return;
    const id = setTimeout(() => {
      if (addApiKeyInputRef.current) {
        addApiKeyInputRef.current.focus();
        hasFocusedForAddApiKey.current = true;
        window.history.replaceState(null, '', location.pathname + location.search);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [addApiKeyFromHash, expandedExternalKeyId, location.pathname, location.search]);

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
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
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

          {/* External API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("settings.externalApiKeysTitle")}
              </CardTitle>
              <CardDescription>
                {t("settings.externalApiKeysDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {EXTERNAL_API_KEY_DEFINITIONS.map((def) => {
                const currentKey = getExternalApiKey(def.id);
                return (
                  <ProviderKeyRow
                    key={def.id}
                    providerId={def.id}
                    providerName={def.name}
                    apiKeyUrl={def.url}
                    envHint={def.placeholder}
                    descriptionKey={def.descriptionKey}
                    pricingUrl={def.pricingUrl}
                    currentKey={currentKey}
                    onSave={(key) => setExternalApiKey(def.id, key)}
                    onRemove={() => removeExternalApiKey(def.id)}
                    isExpanded={expandedExternalKeyId === def.id}
                    onToggle={() =>
                      setExpandedExternalKeyId((prev) =>
                        prev === def.id ? null : def.id
                      )
                    }
                    inputRef={def.id === addApiKeyFromHash ? addApiKeyInputRef : undefined}
                  />
                );
              })}
            </CardContent>
          </Card>

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
                className="flex w-full items-center gap-2 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
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

          {/* Browser Extension */}
          <ExtensionServersSection
            isExtensionInstalled={isExtensionInstalled}
            extensionServers={extensionServers}
            servers={servers}
          />

          {/* Macros */}
          <AutomationToolsSection />

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
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
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
