import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ExternalLink,
  LogIn,
  Upload,
  X,
  Plus,
  Server,
  Sparkles,
  FileText,
  Settings,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { AGENT_CATEGORIES } from "~/lib/types";
import type { MarketplaceAgent, RequiredMCP, MacroServer } from "~/lib/types";
import { createAgentPR } from "~/lib/github";
import {
  getStoredToken,
  getStoredUser,
  getGitHubAuthUrl,
  type GitHubUser,
} from "~/lib/auth";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  basePrompt: string;
  tags: string[];
  examplePrompts: string[];
  requiredMCPs: RequiredMCP[];
  macroServers: MacroServer[];
}

const STEP_ICONS = [Info, FileText, Server, Settings, Eye];

const CATEGORY_ICONS: Record<string, string> = {
  Development: "💻",
  Writing: "✍️",
  Marketing: "📣",
  Data: "📊",
  Design: "🎨",
  Productivity: "⚡",
  Education: "📚",
  Finance: "💰",
  Other: "🔧",
};

export default function SubmitPage() {
  const { t } = useTranslation();
  const { lang = "en" } = useParams();
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const STEPS = [
    { label: t("submit.steps.basicInfo"), desc: t("submit.steps.basicInfoDesc") },
    { label: t("submit.steps.systemPrompt"), desc: t("submit.steps.systemPromptDesc") },
    { label: t("submit.steps.mcpServers"), desc: t("submit.steps.mcpServersDesc") },
    { label: t("submit.steps.config"), desc: t("submit.steps.configDesc") },
    { label: t("submit.steps.preview"), desc: t("submit.steps.previewDesc") },
  ];

  const [form, setForm] = useState<FormData>({
    name: "",
    slug: "",
    description: "",
    icon: "",
    category: "Other",
    basePrompt: "",
    tags: [],
    examplePrompts: [""],
    requiredMCPs: [],
    macroServers: [],
  });

  useEffect(() => {
    setUser(getStoredUser());
    setToken(getStoredToken());
    const handler = () => {
      setUser(getStoredUser());
      setToken(getStoredToken());
    };
    window.addEventListener("auth-change", handler);
    return () => window.removeEventListener("auth-change", handler);
  }, []);

  const updateField = <K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && form.tags.length < 5 && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    updateField(
      "tags",
      form.tags.filter((t) => t !== tag)
    );
  };

  const handleSubmit = async () => {
    if (!token || !user) return;
    setSubmitting(true);
    setError(null);

    const now = new Date().toISOString();
    const agent: MarketplaceAgent = {
      id: form.slug,
      slug: form.slug,
      name: form.name,
      description: form.description,
      icon: form.icon,
      basePrompt: form.basePrompt,
      category: form.category,
      author: {
        githubUsername: user.login,
        displayName: user.name || user.login,
        avatarUrl: user.avatar_url,
      },
      version: "1.0.0",
      tags: form.tags,
      createdAt: now,
      updatedAt: now,
      examplePrompts: form.examplePrompts.filter(Boolean),
      requiredMCPs: form.requiredMCPs.length > 0 ? form.requiredMCPs : undefined,
      macros: form.macroServers.length > 0 ? { servers: form.macroServers } : undefined,
    };

    try {
      const url = await createAgentPR(token, agent);
      setPrUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Auth gate ---------- */
  if (!user || !token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-izan-primary/20 to-izan-secondary/20">
          <Sparkles className="h-8 w-8 text-izan-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t("submit.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("submit.signInRequired")}
        </p>
        <a href={getGitHubAuthUrl()}>
          <Button size="lg" className="mt-8 gap-2">
            <LogIn className="h-4 w-4" />
            {t("submit.signInWithGitHub")}
          </Button>
        </a>
      </div>
    );
  }

  /* ---------- Success ---------- */
  if (prUrl) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">{t("submit.success.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("submit.success.description")}
        </p>
        <a href={prUrl} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="mt-8 gap-2">
            {t("submit.success.viewPR")}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    );
  }

  /* ---------- Wizard ---------- */
  const charPercent = Math.min((form.basePrompt.length / 10000) * 100, 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("submit.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("submit.description")}</p>
      </div>

      {/* ── Stepper ── */}
      <div className="mb-10">
        <div className="flex items-start justify-between">
          {STEPS.map((s, i) => {
            const Icon = STEP_ICONS[i];
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex flex-1 flex-col items-center relative">
                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div className="absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5">
                    <div className={`h-full transition-colors duration-300 ${
                      i < step ? "bg-izan-primary" : "bg-border"
                    }`} />
                  </div>
                )}
                {/* Circle */}
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? "border-izan-primary bg-izan-primary text-white shadow-lg shadow-izan-primary/25"
                      : isDone
                        ? "border-izan-primary bg-izan-primary/10 text-izan-primary"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </button>
                {/* Label */}
                <span className={`mt-2.5 text-xs font-medium text-center transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step description ── */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
      </div>

      {/* ── Step content ── */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Name + Slug row */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.name")}
                </label>
                <Input
                  placeholder={t("submit.fields.namePlaceholder")}
                  value={form.name}
                  onChange={(e) => {
                    updateField("name", e.target.value);
                    if (!form.slug || form.slug === slugify(form.name)) {
                      updateField("slug", slugify(e.target.value));
                    }
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.slug")}
                </label>
                <Input
                  placeholder={t("submit.fields.slugPlaceholder")}
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("submit.fields.slugHint")}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("submit.fields.description")}
              </label>
              <Textarea
                placeholder={t("submit.fields.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Icon + Category row */}
            <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
              {/* Icon picker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.icon")}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50 text-3xl transition-colors has-[:focus]:border-izan-primary/50">
                    {form.icon || (
                      <span className="text-sm text-muted-foreground">?</span>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder={t("submit.fields.iconPlaceholder")}
                      value={form.icon}
                      onChange={(e) => updateField("icon", e.target.value)}
                      className="w-28"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("submit.fields.iconHint")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.category")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AGENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => updateField("category", cat)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                        form.category === cat
                          ? "border-izan-primary bg-izan-primary/10 font-medium text-foreground"
                          : "border-border hover:border-foreground/20 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: System Prompt ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("submit.fields.systemPrompt")}
              </label>
              <Textarea
                placeholder={t("submit.fields.systemPromptPlaceholder")}
                value={form.basePrompt}
                onChange={(e) => updateField("basePrompt", e.target.value)}
                rows={14}
                className="font-mono text-sm"
              />
              {/* Character counter bar */}
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      charPercent > 90
                        ? "bg-destructive"
                        : charPercent > 70
                          ? "bg-yellow-500"
                          : "bg-izan-primary"
                    }`}
                    style={{ width: `${charPercent}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t("submit.fields.characters", {
                    count: form.basePrompt.length,
                  })}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-izan-primary/20 bg-izan-primary/5 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t("submit.fields.systemPromptTip")}
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: MCP Servers ── */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    {t("submit.fields.mcpServers")}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("submit.fields.mcpServersHint")}
                  </p>
                </div>
                {form.requiredMCPs.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      updateField("requiredMCPs", [
                        ...form.requiredMCPs,
                        { name: "", url: "", description: "" },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("submit.fields.addMCP")}
                  </Button>
                )}
              </div>

              {form.requiredMCPs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                  <Server className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {t("submit.fields.noMCPs")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {t("submit.fields.noMCPsHint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.requiredMCPs.map((mcp, i) => (
                    <div key={i} className="rounded-xl border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Server className="h-3.5 w-3.5 text-muted-foreground" />
                          MCP #{i + 1}
                        </span>
                        <button
                          onClick={() =>
                            updateField(
                              "requiredMCPs",
                              form.requiredMCPs.filter((_, j) => j !== i)
                            )
                          }
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder={t("submit.fields.mcpNamePlaceholder")}
                          value={mcp.name}
                          onChange={(e) => {
                            const updated = [...form.requiredMCPs];
                            updated[i] = { ...updated[i], name: e.target.value };
                            updateField("requiredMCPs", updated);
                          }}
                        />
                        <Input
                          placeholder={t("submit.fields.mcpUrlPlaceholder")}
                          value={mcp.url}
                          onChange={(e) => {
                            const updated = [...form.requiredMCPs];
                            updated[i] = { ...updated[i], url: e.target.value };
                            updateField("requiredMCPs", updated);
                          }}
                        />
                        <Input
                          placeholder={t("submit.fields.mcpDescriptionPlaceholder")}
                          value={mcp.description}
                          onChange={(e) => {
                            const updated = [...form.requiredMCPs];
                            updated[i] = {
                              ...updated[i],
                              description: e.target.value,
                            };
                            updateField("requiredMCPs", updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <div className="mb-4">
                <h3 className="text-sm font-medium">
                  {t("submit.fields.macros")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("submit.fields.macrosHint")}
                </p>
              </div>
              {form.macroServers.map((server, i) => (
                <div key={i} className="mb-3 flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-izan-primary/10 text-izan-primary">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{server.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {server.tools.length} {t("submit.fields.macroToolCount")}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateField(
                        "macroServers",
                        form.macroServers.filter((_, j) => j !== i)
                      )
                    }
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const data = JSON.parse(reader.result as string);
                        if (data.server && data.tools) {
                          updateField("macroServers", [
                            ...form.macroServers,
                            {
                              name: data.server.name,
                              description: data.server.description || "",
                              category: data.server.category || "custom",
                              tools: data.tools,
                            },
                          ]);
                        } else if (data.name && data.steps) {
                          updateField("macroServers", [
                            ...form.macroServers,
                            {
                              name: data.displayName || data.name,
                              description: data.description || "",
                              category: "custom",
                              tools: [data],
                            },
                          ]);
                        }
                      } catch {
                        // invalid JSON
                      }
                      e.target.value = "";
                    };
                    reader.readAsText(file);
                  }}
                />
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <span>
                    <Upload className="h-3.5 w-3.5" />
                    {t("submit.fields.uploadMacro")}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {/* ── Step 3: Config ── */}
        {step === 3 && (
          <div className="space-y-8">
            {/* Tags */}
            <div>
              <div className="mb-3">
                <label className="block text-sm font-medium">
                  {t("submit.fields.tags")}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("submit.fields.tagsHint")}
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("submit.fields.addTag")}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  className="shrink-0"
                >
                  {t("submit.fields.add")}
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Example Prompts */}
            <div>
              <div className="mb-3">
                <label className="block text-sm font-medium">
                  {t("submit.fields.examplePrompts")}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("submit.fields.examplePromptsHint")}
                </p>
              </div>
              <div className="space-y-2">
                {form.examplePrompts.map((prompt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <Input
                      placeholder={`${t("submit.fields.examplePrompts")} ${i + 1}`}
                      value={prompt}
                      onChange={(e) => {
                        const updated = [...form.examplePrompts];
                        updated[i] = e.target.value;
                        updateField("examplePrompts", updated);
                      }}
                    />
                    {form.examplePrompts.length > 1 && (
                      <button
                        onClick={() =>
                          updateField(
                            "examplePrompts",
                            form.examplePrompts.filter((_, j) => j !== i)
                          )
                        }
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {form.examplePrompts.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() =>
                    updateField("examplePrompts", [
                      ...form.examplePrompts,
                      "",
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("submit.fields.addAnother")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Preview ── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Agent card preview */}
            <div className="overflow-hidden rounded-xl border">
              <div className="bg-gradient-to-r from-izan-primary/10 via-izan-secondary/10 to-izan-accent/10 px-6 py-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm dark:bg-white/10">
                    {form.icon || "?"}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {form.name || "Untitled"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {form.description || "No description"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 px-6 py-5">
                {/* Category & Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-izan-primary/30 bg-izan-primary/10 px-3 py-1 text-xs font-medium">
                    <span>{CATEGORY_ICONS[form.category]}</span>
                    {form.category}
                  </span>
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* MCP count */}
                {(form.requiredMCPs.length > 0 || form.macroServers.length > 0) && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {form.requiredMCPs.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5" />
                        {form.requiredMCPs.length} MCP server{form.requiredMCPs.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {form.macroServers.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        {form.macroServers.reduce((sum, s) => sum + s.tools.length, 0)} macro tool{form.macroServers.reduce((sum, s) => sum + s.tools.length, 0) > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Example prompts */}
                {form.examplePrompts.filter(Boolean).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {t("submit.fields.examplePrompts")}
                    </p>
                    <div className="space-y-1.5">
                      {form.examplePrompts.filter(Boolean).map((p, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-muted/50 px-3 py-2 text-sm"
                        >
                          "{p}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Author */}
                {user && (
                  <div className="flex items-center gap-2 border-t pt-4">
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="h-6 w-6 rounded-full"
                    />
                    <span className="text-sm text-muted-foreground">
                      {user.name || user.login}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("submit.back")}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} className="gap-1.5">
            {t("submit.next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submit.submitting")}
              </>
            ) : (
              <>
                {t("submit.submitAgent")}
                <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
