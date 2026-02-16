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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardTitle } from "~/components/ui/card";
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
    t("submit.steps.basicInfo"),
    t("submit.steps.systemPrompt"),
    t("submit.steps.mcpServers"),
    t("submit.steps.config"),
    t("submit.steps.preview"),
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

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-bold">{t("submit.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("submit.signInRequired")}
        </p>
        <a href={getGitHubAuthUrl()}>
          <Button size="lg" className="mt-6 gap-2">
            <LogIn className="h-4 w-4" />
            {t("submit.signInWithGitHub")}
          </Button>
        </a>
      </div>
    );
  }

  if (prUrl) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">{t("submit.success.title")}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("submit.success.description")}
        </p>
        <a href={prUrl} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="mt-6 gap-2">
            {t("submit.success.viewPR")}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">{t("submit.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("submit.description")}</p>

      <div className="mt-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-izan-primary text-white"
                  : i < step
                    ? "bg-izan-primary/20 text-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span
              className={`hidden text-sm sm:inline ${
                i === step ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-px w-6 bg-border sm:w-10" />
            )}
          </div>
        ))}
      </div>

      <Card className="mt-8">
        <CardContent className="space-y-5 p-6">
          {step === 0 && (
            <>
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.icon")}
                </label>
                <Input
                  placeholder={t("submit.fields.iconPlaceholder")}
                  value={form.icon}
                  onChange={(e) => updateField("icon", e.target.value)}
                  className="w-24"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.category")}
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {AGENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 1 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t("submit.fields.systemPrompt")}
              </label>
              <Textarea
                placeholder={t("submit.fields.systemPromptPlaceholder")}
                value={form.basePrompt}
                onChange={(e) => updateField("basePrompt", e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("submit.fields.characters", {
                  count: form.basePrompt.length,
                })}
              </p>
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.mcpServers")}
                </label>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("submit.fields.mcpServersHint")}
                </p>
                {form.requiredMCPs.map((mcp, i) => (
                  <div key={i} className="mb-4 rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        MCP #{i + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() =>
                          updateField(
                            "requiredMCPs",
                            form.requiredMCPs.filter((_, j) => j !== i)
                          )
                        }
                      >
                        {t("submit.fields.removeMCP")}
                      </Button>
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
                {form.requiredMCPs.length < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateField("requiredMCPs", [
                        ...form.requiredMCPs,
                        { name: "", url: "", description: "" },
                      ])
                    }
                  >
                    {t("submit.fields.addMCP")}
                  </Button>
                )}
              </div>

              <div className="border-t pt-5">
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.macros")}
                </label>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("submit.fields.macrosHint")}
                </p>
                {form.macroServers.map((server, i) => (
                  <div key={i} className="mb-3 flex items-center gap-2 rounded-lg border p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{server.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {server.tools.length} {t("submit.fields.macroToolCount")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() =>
                        updateField(
                          "macroServers",
                          form.macroServers.filter((_, j) => j !== i)
                        )
                      }
                    >
                      {t("submit.fields.removeMCP")}
                    </Button>
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
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.tags")}
                </label>
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
                  >
                    {t("submit.fields.add")}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t("submit.fields.examplePrompts")}
                </label>
                {form.examplePrompts.map((prompt, i) => (
                  <div key={i} className="mb-2 flex gap-2">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateField(
                            "examplePrompts",
                            form.examplePrompts.filter((_, j) => j !== i)
                          )
                        }
                      >
                        &times;
                      </Button>
                    )}
                  </div>
                ))}
                {form.examplePrompts.length < 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateField("examplePrompts", [
                        ...form.examplePrompts,
                        "",
                      ])
                    }
                  >
                    {t("submit.fields.addAnother")}
                  </Button>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <CardTitle>{t("submit.steps.preview")}</CardTitle>
              <div className="rounded-xl border p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-izan-primary/20 to-izan-secondary/20 text-2xl">
                    {form.icon || "?"}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {form.name || "Untitled"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {form.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-izan-primary/30 bg-izan-primary/10 px-2.5 py-0.5 text-xs font-medium">
                        {form.category}
                      </span>
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
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
