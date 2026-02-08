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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
import { useMCPStore, useModelStore, useAgentStore, useExternalApiKeysStore } from "~/store";
import { EXTERNAL_API_KEY_DEFINITIONS } from "~/lib/external-api-keys";
import { DEFAULT_MCP_SERVERS } from "~/lib/mcp/config";
import { getAgentDisplayName } from "~/lib/agent-display";
import { cn } from "~/lib/utils";
import { type SupportedLanguage, setStoredLanguagePreference } from "~/i18n";
import { useProvidersWithModels } from "~/lib/use-providers-with-models";

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
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    </div>
  );
}

export function meta() {
  return [{ title: "Ayarlar - izan.io" }];
}

function ProviderKeyRow({
  providerId: _providerId, // passed for parent keying, unused in row
  providerName,
  apiKeyUrl,
  envHint,
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
        {currentKey && (
          <span className="text-xs bg-emerald-400/90 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 rounded-md flex items-center gap-1.5 flex-shrink-0">
            <CheckCircle className="h-3.5 w-3.5" />
            {t("settings.connected")}
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-3 bg-muted/30 rounded-b-lg">
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
          <a
            href={apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {t("settings.getApiKey")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const backTo = from ?? `/${lang}`;
  const serpApiInputRef = useRef<HTMLInputElement | null>(null);
  const addApiKeyFromHash = location.hash?.slice(1) || null; // e.g. #serp_api -> serp_api
  const [theme, setTheme] = useTheme();
  const {
    servers,
    userServers,
    error,
    addUserServer,
    removeUserServer,
    setServerAgents,
    disabledBuiltinMCPIds,
    setDisabledBuiltinMCPIds,
  } = useMCPStore();
  const { agents } = useAgentStore();
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
  const [newServerAgentIds, setNewServerAgentIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit agent assignment state
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

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
      if (serpApiInputRef.current) {
        serpApiInputRef.current.focus();
        hasFocusedForAddApiKey.current = true;
        window.history.replaceState(null, '', location.pathname + location.search);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [addApiKeyFromHash, expandedExternalKeyId, location.pathname, location.search]);

  const enabledAgents = agents.filter((a) => a.enabled);
  // Built-in: show only name + description (no connection status, no API calls)
  const customServerStates = servers.filter((s) => s.config.source === "user");

  const handleAddServer = async () => {
    if (!newServerName.trim()) {
      setFormError(t("settings.mcpNameRequired"));
      return;
    }
    if (!newServerUrl.trim()) {
      setFormError(t("settings.mcpUrlRequired"));
      return;
    }
    setFormError(null);
    setIsAdding(true);
    try {
      await addUserServer({
        name: newServerName.trim(),
        url: newServerUrl.trim(),
        description: newServerDesc.trim(),
        assignedAgentIds: newServerAgentIds,
      });
      // Reset form
      setNewServerName("");
      setNewServerUrl("");
      setNewServerDesc("");
      setNewServerAgentIds([]);
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
    await removeUserServer(deleteServerId);
  };

  const toggleAgentForNewServer = (agentId: string) => {
    setNewServerAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const { providers, filterProviders: doFilter } = useProvidersWithModels();

  const toggleAgentAssignment = async (
    serverId: string,
    agentId: string,
    currentIds: string[]
  ) => {
    const newIds = currentIds.includes(agentId)
      ? currentIds.filter((id) => id !== agentId)
      : [...currentIds, agentId];
    await setServerAgents(serverId, newIds);
  };

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
                    currentKey={currentKey}
                    onSave={(key) => setExternalApiKey(def.id, key)}
                    onRemove={() => removeExternalApiKey(def.id)}
                    isExpanded={expandedExternalKeyId === def.id}
                    onToggle={() =>
                      setExpandedExternalKeyId((prev) =>
                        prev === def.id ? null : def.id
                      )
                    }
                    inputRef={def.id === addApiKeyFromHash ? serpApiInputRef : undefined}
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
                        count: DEFAULT_MCP_SERVERS.length,
                      })}
                </span>
              </button>
              {builtinMcpExpanded &&
                DEFAULT_MCP_SERVERS.map((config) => {
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
                const isEditingAgents = editingServerId === us.id;

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
                          onClick={() =>
                            setEditingServerId(
                              isEditingAgents ? null : us.id
                            )
                          }
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

                    {/* Assigned agents chips */}
                    {us.assignedAgentIds.length > 0 && !isEditingAgents && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-1">
                          {t("settings.mcpAssignedAgents")}:
                        </span>
                        {us.assignedAgentIds.map((agentId) => {
                          const agent = agents.find(
                            (a) => a.id === agentId
                          );
                          return agent ? (
                            <span
                              key={agentId}
                              className="text-xs bg-primary/20 text-primary dark:bg-primary/10 dark:text-primary px-1.5 py-0.5 rounded"
                            >
                              {getAgentDisplayName(agent, t)}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}

                    {/* Edit agent assignment */}
                    {isEditingAgents && (
                      <div className="border-t pt-2 space-y-2">
                        <p className="text-xs font-medium">
                          {t("settings.mcpAssignAgents")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {enabledAgents.map((agent) => (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={() =>
                                toggleAgentAssignment(
                                  us.id,
                                  agent.id,
                                  us.assignedAgentIds
                                )
                              }
                              className={cn(
                                "text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer",
                                us.assignedAgentIds.includes(agent.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted border-border"
                              )}
                            >
                              {getAgentDisplayName(agent, t)}
                            </button>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setEditingServerId(null)}
                        >
                          {t("settings.mcpSaveChanges")}
                        </Button>
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

                    {/* Agent assignment */}
                    <div>
                      <label className="text-xs font-medium">
                        {t("settings.mcpAssignAgents")}
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        {t("settings.mcpAssignAgentsDesc")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {enabledAgents.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => toggleAgentForNewServer(agent.id)}
                            className={cn(
                              "text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer",
                              newServerAgentIds.includes(agent.id)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border"
                            )}
                          >
                            {getAgentDisplayName(agent, t)}
                          </button>
                        ))}
                      </div>
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
