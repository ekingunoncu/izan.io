import { Link, useParams, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Play,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Check,
  Bot,
  Info,
  X,
} from "lucide-react";
import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { ExpandableTextarea } from "~/components/ui/expandable-textarea";
import { IzanLogo } from "~/components/ui/izan-logo";
import { usePlanStore } from "~/store/plan.store";
import { useAgentStore } from "~/store/agent.store";
import { useChatStore } from "~/store/chat.store";
import { useMCPStore } from "~/store/mcp.store";
import { getAgentIcon } from "~/lib/agent-icons";
import { getAgentDisplayName } from "~/lib/agent-display";
import type { ScheduledPlan, PlanScheduleType } from "~/lib/db";
import { validateCron, describeCronNextRun } from "~/lib/scheduler/cron";

// Client-only
export function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <CalendarClock className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function meta() {
  return [{ title: "Scheduled Plans - izan.io" }];
}

// ─── Cron Presets ───────────────────────────────────────────────────────────

const CRON_PRESETS = [
  { key: "presetHourly", cron: "0 * * * *" },
  { key: "presetDaily9am", cron: "0 9 * * *" },
  { key: "presetWeeklyMonday", cron: "0 9 * * 1" },
  { key: "presetMonthly1st", cron: "0 9 1 * *" },
] as const;

// ─── Date/Time Quick Presets ────────────────────────────────────────────────

function getQuickDatePresets(): Array<{ label: string; value: string }> {
  const now = new Date();

  const in30min = new Date(now.getTime() + 30 * 60_000);
  const in1h = new Date(now.getTime() + 60 * 60_000);
  const in3h = new Date(now.getTime() + 3 * 60 * 60_000);

  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return [
    { label: "30 min", value: toLocalInput(in30min) },
    { label: "1 hour", value: toLocalInput(in1h) },
    { label: "3 hours", value: toLocalInput(in3h) },
    { label: "Tomorrow 9am", value: toLocalInput(tomorrow9am) },
  ];
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatDate(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function formatRelativeDate(ts: number | null): string {
  if (!ts) return "-";
  const now = Date.now();
  const diff = ts - now;
  const absDiff = Math.abs(diff);
  const mins = Math.round(absDiff / 60_000);
  const hours = Math.round(absDiff / 3_600_000);
  const days = Math.round(absDiff / 86_400_000);

  if (diff > 0) {
    if (mins < 1) return "< 1 min";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatScheduledAtPreview(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < 0) return "in the past";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "less than a minute";
  if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    completed: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    error: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    running: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    failed: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  };

  const labels: Record<string, string> = {
    active: t("plans.statusActive"),
    paused: t("plans.statusPaused"),
    completed: t("plans.statusCompleted"),
    error: t("plans.statusError"),
    running: t("plans.running"),
    failed: t("plans.statusError"),
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.error}`}>
      {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
      {status === "error" || status === "failed" ? <AlertCircle className="h-3 w-3" /> : null}
      {labels[status] ?? status}
    </span>
  );
}

// ─── Agent Picker ───────────────────────────────────────────────────────────

function AgentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (agentId: string) => void;
}) {
  const { t } = useTranslation("common");
  const { agents } = useAgentStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enabledAgents = useMemo(
    () => agents.filter((a) => a.enabled),
    [agents]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return enabledAgents;
    const q = search.toLowerCase();
    return enabledAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [enabledAgents, search]);

  const selectedAgent = agents.find((a) => a.id === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus search when opened, reset search when closed
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      setSearch("");
    };
  }, [open]);

  const selectedIcon = useMemo(
    () => (selectedAgent ? getAgentIcon(selectedAgent.icon) : Bot),
    [selectedAgent]
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-left flex items-center gap-2.5 transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
          !selectedAgent ? "text-muted-foreground" : ""
        }`}
      >
        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
          {React.createElement(selectedIcon, { className: "h-4 w-4" })}
        </div>
        <span className="flex-1 truncate">
          {selectedAgent
            ? getAgentDisplayName(selectedAgent, t)
            : t("plans.selectAgent")}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-background shadow-xl max-h-64 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("plans.selectAgent")}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Agent list */}
          <div className="overflow-y-auto max-h-48 p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No agents found
              </div>
            ) : (
              filtered.map((agent) => {
                const icon = getAgentIcon(agent.icon);
                const isSelected = agent.id === value;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      onChange(agent.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors text-sm ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-primary/20" : "bg-muted"
                    }`}>
                      {React.createElement(icon, { className: "h-3.5 w-3.5" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{getAgentDisplayName(agent, t)}</div>
                      <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plan Form Dialog ───────────────────────────────────────────────────────

interface PlanFormData {
  name: string;
  description: string;
  agentId: string;
  prompt: string;
  scheduleType: PlanScheduleType;
  cronExpression: string;
  scheduledAt: string; // datetime-local string
}

function PlanFormDialog({
  open,
  onClose,
  editPlan,
}: {
  open: boolean;
  onClose: () => void;
  editPlan?: ScheduledPlan;
}) {
  const { t } = useTranslation("common");
  const { agents, initialize: initAgents } = useAgentStore();
  const { createPlan, updatePlan } = usePlanStore();

  const enabledAgents = useMemo(
    () => agents.filter((a) => a.enabled),
    [agents]
  );

  const [form, setForm] = useState<PlanFormData>({
    name: "",
    description: "",
    agentId: "",
    prompt: "",
    scheduleType: "once",
    cronExpression: "",
    scheduledAt: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize agent store when dialog opens (agents may not be loaded yet)
  useEffect(() => {
    if (open) {
      initAgents();
    }
  }, [open, initAgents]);

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    if (editPlan) {
      setForm({
        name: editPlan.name,
        description: editPlan.description,
        agentId: editPlan.agentId,
        prompt: editPlan.prompt,
        scheduleType: editPlan.scheduleType,
        cronExpression: editPlan.cronExpression ?? "",
        scheduledAt: editPlan.scheduledAt
          ? toLocalInput(new Date(editPlan.scheduledAt))
          : "",
      });
    } else {
      setForm({
        name: "",
        description: "",
        agentId: enabledAgents[0]?.id ?? "",
        prompt: "",
        scheduleType: "once",
        cronExpression: "",
        scheduledAt: "",
      });
    }
    setError("");
  }, [open, editPlan, enabledAgents]);

  const cronError = useMemo(() => {
    if (form.scheduleType !== "recurring" || !form.cronExpression) return null;
    return validateCron(form.cronExpression);
  }, [form.scheduleType, form.cronExpression]);

  const cronPreview = useMemo(() => {
    if (form.scheduleType !== "recurring" || !form.cronExpression || cronError) return null;
    return describeCronNextRun(form.cronExpression);
  }, [form.scheduleType, form.cronExpression, cronError]);

  const scheduledAtPreview = useMemo(() => {
    return formatScheduledAtPreview(form.scheduledAt);
  }, [form.scheduledAt]);

  const quickDatePresets = useMemo(() => getQuickDatePresets(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.prompt.trim()) {
      setError("Prompt is required");
      return;
    }
    if (!form.agentId) {
      setError("Agent is required");
      return;
    }
    if (form.scheduleType === "once" && !form.scheduledAt) {
      setError("Scheduled time is required for one-time plans");
      return;
    }
    if (form.scheduleType === "recurring" && !form.cronExpression) {
      setError("Cron expression is required for recurring plans");
      return;
    }
    if (cronError) {
      setError(cronError);
      return;
    }

    setSaving(true);
    try {
      if (editPlan) {
        await updatePlan(editPlan.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          agentId: form.agentId,
          prompt: form.prompt.trim(),
          scheduleType: form.scheduleType,
          cronExpression: form.scheduleType === "recurring" ? form.cronExpression : null,
          scheduledAt: form.scheduleType === "once" ? new Date(form.scheduledAt).getTime() : null,
        });
      } else {
        await createPlan({
          name: form.name.trim(),
          description: form.description.trim(),
          agentId: form.agentId,
          prompt: form.prompt.trim(),
          scheduleType: form.scheduleType,
          cronExpression: form.scheduleType === "recurring" ? form.cronExpression : null,
          scheduledAt: form.scheduleType === "once" ? new Date(form.scheduledAt).getTime() : null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-semibold">
              {editPlan ? t("plans.edit") : t("plans.create")}
            </h2>
          </div>

          <div className="px-6 space-y-4 pb-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t("plans.name")}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("plans.namePlaceholder")}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t("plans.descriptionLabel")}
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("plans.descriptionPlaceholder")}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Agent - custom searchable picker */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t("plans.agent")}
              </label>
              <AgentPicker
                value={form.agentId}
                onChange={(agentId) => setForm({ ...form, agentId })}
              />
            </div>

            {/* Prompt */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t("plans.prompt")}
              </label>
              <ExpandableTextarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                placeholder={t("plans.promptPlaceholder")}
                label={t("plans.prompt")}
                rows={3}
              />
            </div>

            {/* Schedule Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {t("plans.scheduleType")}
              </label>
              <div className="flex rounded-lg border bg-muted/50 p-0.5">
                {(["once", "recurring"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, scheduleType: type })}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      form.scheduleType === type
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`plans.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Once: date/time with quick presets */}
            {form.scheduleType === "once" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("plans.scheduledAt")}
                </label>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickDatePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setForm({ ...form, scheduledAt: preset.value })}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        form.scheduledAt === preset.value
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/50 border-border hover:bg-muted"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Date and time side by side */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={form.scheduledAt.split("T")[0] || ""}
                      onChange={(e) => {
                        const time = form.scheduledAt.split("T")[1] || "09:00";
                        setForm({ ...form, scheduledAt: e.target.value ? `${e.target.value}T${time}` : "" });
                      }}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="time"
                      value={form.scheduledAt.split("T")[1] || ""}
                      onChange={(e) => {
                        const date = form.scheduledAt.split("T")[0] || new Date().toISOString().slice(0, 10);
                        setForm({ ...form, scheduledAt: e.target.value ? `${date}T${e.target.value}` : "" });
                      }}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Preview */}
                {scheduledAtPreview && (
                  <p className={`text-xs mt-1.5 ${scheduledAtPreview === "in the past" ? "text-amber-500" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {scheduledAtPreview}
                    {scheduledAtPreview !== "in the past" && form.scheduledAt && (
                      <> &mdash; {new Date(form.scheduledAt).toLocaleString()}</>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Recurring: cron expression */}
            {form.scheduleType === "recurring" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("plans.cronExpression")}
                </label>

                {/* Presets first for better UX */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CRON_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setForm({ ...form, cronExpression: preset.cron })}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        form.cronExpression === preset.cron
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/50 border-border hover:bg-muted"
                      }`}
                    >
                      {t(`plans.${preset.key}`)}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={form.cronExpression}
                  onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                  placeholder={t("plans.cronPlaceholder")}
                  className={`w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    cronError ? "border-red-500" : ""
                  }`}
                />
                {cronError && (
                  <p className="text-xs text-red-500 mt-1">{t("plans.cronInvalid")}</p>
                )}
                {cronPreview && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {t("plans.nextRun")}: {cronPreview}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 pb-6 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("plans.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("plans.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Plan Card ──────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: ScheduledPlan }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { agents } = useAgentStore();
  const { deletePlan, togglePlanStatus, executePlan, getExecutionsForPlan } = usePlanStore();

  const [showHistory, setShowHistory] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [executing, setExecuting] = useState(false);

  const agent = agents.find((a) => a.id === plan.agentId);
  const executions = getExecutionsForPlan(plan.id);
  const agentIcon = useMemo(
    () => (agent ? getAgentIcon(agent.icon) : Bot),
    [agent]
  );

  const handleRunNow = async () => {
    setExecuting(true);
    try {
      await executePlan(plan.id);
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    await deletePlan(plan.id);
    setShowDelete(false);
  };

  return (
    <>
      <div className="rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-md">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base truncate">{plan.name}</h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                  {plan.description}
                </p>
              )}
            </div>
            <StatusBadge status={plan.status} t={t} />
          </div>

          {/* Info */}
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
                {React.createElement(agentIcon, { className: "h-3 w-3" })}
              </div>
              <span className="truncate">{agent ? getAgentDisplayName(agent, t) : plan.agentId}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {plan.scheduleType === "once"
                  ? `${t("plans.once")} - ${formatDate(plan.scheduledAt)}`
                  : `${t("plans.recurring")} - ${plan.cronExpression}`}
              </span>
            </div>
            {plan.nextRunAt && plan.status === "active" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{t("plans.nextRun")}:</span>
                <span>{formatRelativeDate(plan.nextRunAt)} ({formatDate(plan.nextRunAt)})</span>
              </div>
            )}
            {plan.lastRunAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{t("plans.lastRun")}:</span>
                <span>{formatRelativeDate(plan.lastRunAt)}</span>
              </div>
            )}
            {plan.lastError && (
              <div className="flex items-start gap-2 text-red-500 text-xs mt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{t("plans.errorLastRun", { error: plan.lastError })}</span>
              </div>
            )}
          </div>

          {/* Prompt preview */}
          <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground font-mono line-clamp-2">
            {plan.prompt}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            {plan.status !== "completed" && (
              <button
                type="button"
                role="switch"
                aria-checked={plan.status === "active"}
                onClick={() => togglePlanStatus(plan.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                  plan.status === "active" ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                    plan.status === "active" ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleRunNow}
              disabled={executing}
            >
              {executing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {t("plans.runNow")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-auto"
              onClick={() => setShowEdit(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Execution History */}
        {executions.length > 0 && (
          <div className="border-t">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>
                {t("plans.executionHistory")} ({executions.length})
              </span>
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showHistory && (
              <div className="px-5 pb-4 space-y-2">
                {executions.slice(0, 10).map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between gap-3 text-xs py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={exec.status} t={t} />
                      <span className="text-muted-foreground truncate">
                        {formatDate(exec.startedAt)}
                      </span>
                    </div>
                    {exec.chatId && (
                      <button
                        type="button"
                        onClick={async () => {
                          const agentStore = useAgentStore.getState();
                          await agentStore.selectAgent(plan.agentId);
                          const chatStore = useChatStore.getState();
                          await chatStore.loadChats(plan.agentId);
                          await chatStore.selectChat(exec.chatId);
                          navigate("/chat");
                        }}
                        className="text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("plans.viewChat")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plans.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plans.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("plans.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("plans.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <PlanFormDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        editPlan={plan}
      />
    </>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Plans() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const backTo = from ?? `/${lang}`;

  const { plans, isInitialized, initialize } = usePlanStore();
  const initAgents = useAgentStore((s) => s.initialize);
  const isExtensionInstalled = useMCPStore((s) => s.isExtensionInstalled);
  const [showCreate, setShowCreate] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(
    () => localStorage.getItem("izan-plans-warning-dismissed") === "1"
  );

  useEffect(() => {
    initialize();
    initAgents();
  }, [initialize, initAgents]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        const statusOrder: Record<string, number> = { active: 0, paused: 1, error: 2, completed: 3 };
        const sa = statusOrder[a.status] ?? 9;
        const sb = statusOrder[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      }),
    [plans]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
          <Link to={backTo}>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link
            to={backTo}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <IzanLogo className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            <span className="text-lg sm:text-xl font-semibold truncate">izan.io</span>
          </Link>
          <Button
            size="sm"
            className="gap-1.5 text-sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("plans.create")}</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
          {/* Title */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CalendarClock className="h-7 w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t("plans.title")}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">{t("plans.description")}</p>
          </div>

          {!warningDismissed && (
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${isExtensionInstalled ? 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400' : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'}`}>
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="flex-1">{t(isExtensionInstalled ? "plans.browserWarningExtension" : "plans.browserWarning")}</p>
              <button
                type="button"
                onClick={() => {
                  setWarningDismissed(true);
                  localStorage.setItem("izan-plans-warning-dismissed", "1");
                }}
                className={`shrink-0 rounded-md p-0.5 transition-colors ${isExtensionInstalled ? 'hover:bg-blue-500/10' : 'hover:bg-amber-500/10'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {!isInitialized ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedPlans.length === 0 ? (
            /* Empty State */
            <div className="relative rounded-3xl border border-dashed border-muted-foreground/20 bg-muted/20 py-20 text-center overflow-hidden">
              <div
                className="absolute inset-0 -z-10 opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-5">
                <CalendarClock className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium mb-4">
                {t("plans.noPlans")}
              </p>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("plans.create")}
              </Button>
            </div>
          ) : (
            /* Plan List */
            <div className="space-y-4">
              {sortedPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create dialog */}
      <PlanFormDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
