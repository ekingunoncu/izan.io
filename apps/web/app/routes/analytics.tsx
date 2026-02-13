import { Link, useParams, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Coins,
  Hash,
  Trash2,
  Wrench,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
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
import { IzanLogo } from "~/components/ui/izan-logo";
import { storageService } from "~/lib/services";
import { useAgentStore } from "~/store/agent.store";
import type { UsageRecord } from "~/lib/db";

// Client-only
export function clientLoader() {
  return null;
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function meta() {
  return [{ title: "Analytics - izan.io" }];
}

type TimeRange = "7d" | "30d" | "90d" | "all";

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const BAR_COLORS = [
  "hsl(220 90% 56%)",
  "hsl(262 83% 58%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(190 80% 42%)",
  "hsl(330 80% 55%)",
  "hsl(80 60% 45%)",
];

// ─── Formatters ──────────────────────────────────────────────────────────────

const formatCost = (v: number) => `$${v < 0.01 ? v.toFixed(4) : v.toFixed(2)}`;
const formatTokens = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
};

// ─── Aggregation helpers ────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDay(records: UsageRecord[], timeRange: TimeRange) {
  const map = new Map<string, { date: string; cost: number; inputTokens: number; outputTokens: number }>();
  for (const r of records) {
    const key = toDateKey(new Date(r.timestamp));
    const entry = map.get(key) ?? { date: key, cost: 0, inputTokens: 0, outputTokens: 0 };
    entry.cost += r.cost;
    entry.inputTokens += r.inputTokens;
    entry.outputTokens += r.outputTokens;
    map.set(key, entry);
  }

  // Fill in missing days so the chart shows the full range
  if (timeRange !== "all") {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      if (!map.has(key)) {
        map.set(key, { date: key, cost: 0, inputTokens: 0, outputTokens: 0 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function groupByField(records: UsageRecord[], field: "agentId" | "modelId") {
  const map = new Map<string, { key: string; cost: number; tokens: number; count: number }>();
  for (const r of records) {
    const k = r[field] || "unknown";
    const entry = map.get(k) ?? { key: k, cost: 0, tokens: 0, count: 0 };
    entry.cost += r.cost;
    entry.tokens += r.inputTokens + r.outputTokens;
    entry.count += 1;
    map.set(k, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
}

function getToolFrequency(records: UsageRecord[]) {
  const map = new Map<string, number>();
  for (const r of records) {
    for (const name of r.toolCalls) {
      map.set(name, (map.get(name) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, mode }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string; fill: string }>;
  label?: string;
  mode: "cost" | "tokens";
}) {
  if (!active || !payload?.length) return null;
  // Skip if all values are 0 (empty day)
  if (payload.every(p => p.value === 0)) return null;
  const [, m, d] = (label ?? "").split("-");
  return (
    <div className="rounded-xl border bg-card px-3.5 py-2.5 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{m}/{d}</p>
      {mode === "cost" ? (
        <p className="font-semibold tabular-nums">{formatCost(payload[0].value)}</p>
      ) : (
        <div className="space-y-1">
          {payload.map((p) => (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill || p.color }} />
              <span className="text-muted-foreground">{p.dataKey === "inputTokens" ? "In" : "Out"}</span>
              <span className="font-semibold tabular-nums ml-auto">{formatTokens(p.value)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-1 mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">{formatTokens(payload.reduce((s, p) => s + p.value, 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Analytics() {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const backTo = from ?? `/${lang}`;

  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [chartMode, setChartMode] = useState<"cost" | "tokens">("cost");

  const { agents } = useAgentStore();

  useEffect(() => {
    const fromTs = timeRange === "all" ? undefined : Date.now() - RANGE_MS[timeRange];
    storageService.getUsageRecords(fromTs).then(setRecords);
  }, [timeRange]);

  const agentNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of agents) m.set(a.id, a.name);
    return m;
  }, [agents]);

  // Aggregations
  const totals = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;
    for (const r of records) {
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;
      cost += r.cost;
    }
    return { inputTokens, outputTokens, cost, calls: records.length };
  }, [records]);

  // Fetch previous period cost for trend comparison
  const [prevPeriodCost, setPrevPeriodCost] = useState<number | null>(null);
  useEffect(() => {
    if (timeRange === "all") {
      // No trend for "all" - reset handled by trendPercent memo
      return;
    }
    const now = Date.now();
    const periodMs = RANGE_MS[timeRange];
    const currentStart = now - periodMs;
    const prevStart = currentStart - periodMs;
    storageService.getUsageRecords(prevStart, currentStart).then((prevRecords) => {
      setPrevPeriodCost(prevRecords.reduce((s, r) => s + r.cost, 0));
    });
  }, [timeRange]);

  const trendPercent = useMemo(() => {
    if (timeRange === "all" || prevPeriodCost == null || prevPeriodCost === 0) return null;
    const currentCost = totals.cost;
    if (currentCost === 0) return null;
    return ((currentCost - prevPeriodCost) / prevPeriodCost) * 100;
  }, [totals.cost, prevPeriodCost, timeRange]);

  const dailyData = useMemo(() => groupByDay(records, timeRange), [records, timeRange]);
  const agentData = useMemo(() => {
    const data = groupByField(records, "agentId");
    return data.map(d => ({ ...d, label: agentNameMap.get(d.key) ?? d.key }));
  }, [records, agentNameMap]);
  const modelData = useMemo(() => groupByField(records, "modelId"), [records]);
  const toolData = useMemo(() => getToolFrequency(records), [records]);

  const handleClearData = async () => {
    await storageService.clearUsageRecords();
    setRecords([]);
    setShowClearDialog(false);
  };

  const TIME_RANGES: { value: TimeRange; labelKey: string }[] = [
    { value: "7d", labelKey: "analytics.timeRange7d" },
    { value: "30d", labelKey: "analytics.timeRange30d" },
    { value: "90d", labelKey: "analytics.timeRange90d" },
    { value: "all", labelKey: "analytics.timeRangeAll" },
  ];

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
          {records.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("analytics.clearData")}</span>
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          {/* Title + Time Range in same row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("analytics.description")}</p>
            </div>
            <div className="flex rounded-lg border bg-muted/50 p-0.5 self-start sm:self-auto">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setTimeRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    timeRange === r.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(r.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {records.length === 0 ? (
            /* ── Empty State ── */
            <div className="relative rounded-3xl border border-dashed border-muted-foreground/20 bg-muted/20 py-20 text-center overflow-hidden">
              <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{
                backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }} />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-5">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">{t("analytics.noData")}</p>
            </div>
          ) : (
            <>
              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Cost - Hero card */}
                <div className="col-span-2 lg:col-span-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-violet-600 dark:from-blue-600 dark:to-violet-700 p-5 sm:p-6 text-white">
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                  <div className="relative">
                    <div className="flex items-center gap-2 text-white/70 text-xs font-medium mb-3">
                      <Coins className="h-3.5 w-3.5" />
                      {t("analytics.totalCost")}
                    </div>
                    <p className="text-3xl sm:text-4xl font-bold tracking-tight">{formatCost(totals.cost)}</p>
                    {trendPercent != null && (
                      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendPercent > 0 ? "text-red-200" : "text-emerald-200"}`}>
                        {trendPercent > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {Math.abs(trendPercent).toFixed(0)}% {t("analytics.trendVsPrev", { range: timeRange })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Tokens */}
                <div className="rounded-2xl border bg-card p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <Hash className="h-3.5 w-3.5" />
                    {t("analytics.totalTokens")}
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{formatTokens(totals.inputTokens + totals.outputTokens)}</p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 align-middle" />
                        {t("analytics.inputTokens")} {formatTokens(totals.inputTokens)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
                        {t("analytics.outputTokens")} {formatTokens(totals.outputTokens)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* API Calls */}
                <div className="rounded-2xl border bg-card p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <Zap className="h-3.5 w-3.5" />
                    {t("analytics.totalCalls")}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{totals.calls.toLocaleString()}</p>
                </div>

                {/* Avg cost per call */}
                <div className="rounded-2xl border bg-card p-4 sm:p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t("analytics.avgPerCall")}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">
                    {totals.calls > 0 ? formatCost(totals.cost / totals.calls) : "$0"}
                  </p>
                </div>
              </div>

              {/* ── Usage Over Time ── */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
                  <h2 className="text-sm font-semibold">{t("analytics.usageOverTime")}</h2>
                  <div className="flex rounded-md border bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setChartMode("cost")}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                        chartMode === "cost"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("analytics.cost")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode("tokens")}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                        chartMode === "tokens"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("analytics.tokens")}
                    </button>
                  </div>
                </div>
                <div className="h-72 px-2 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="costBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(220 90% 56%)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="inputBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="outputBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => { const [, m, d] = v.split("-"); return `${m}/${d}`; }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                        interval={dailyData.length > 14 ? Math.floor(dailyData.length / 7) - 1 : 0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={chartMode === "cost" ? (v: number) => `$${v < 1 ? v.toFixed(2) : v.toFixed(0)}` : formatTokens}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                      />
                      <RechartsTooltip
                        content={<ChartTooltip mode={chartMode} />}
                        cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }}
                      />
                      {chartMode === "cost" ? (
                        <Bar dataKey="cost" fill="url(#costBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                      ) : (
                        <>
                          <Bar dataKey="inputTokens" fill="url(#inputBarGrad)" radius={0} maxBarSize={12} stackId="tokens" name={t("analytics.inputTokens")} />
                          <Bar dataKey="outputTokens" fill="url(#outputBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={12} stackId="tokens" name={t("analytics.outputTokens")} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Breakdown: Agent + Model ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Per Agent */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-5 sm:px-6 pt-5 sm:pt-6 pb-1">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">{t("analytics.perAgent")}</h2>
                  </div>
                  {agentData.length === 0 ? (
                    <div className="px-6 pb-6 pt-4 text-center text-sm text-muted-foreground">{t("analytics.noData")}</div>
                  ) : (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 space-y-2.5">
                      {agentData.slice(0, 6).map((item, i) => {
                        const pct = agentData[0].cost > 0 ? (item.cost / agentData[0].cost) * 100 : 0;
                        return (
                          <div key={item.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium truncate mr-2">{item.label}</span>
                              <span className="text-muted-foreground tabular-nums shrink-0">{formatCost(item.cost)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Per Model */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-5 sm:px-6 pt-5 sm:pt-6 pb-1">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">{t("analytics.perModel")}</h2>
                  </div>
                  {modelData.length === 0 ? (
                    <div className="px-6 pb-6 pt-4 text-center text-sm text-muted-foreground">{t("analytics.noData")}</div>
                  ) : (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 space-y-2.5">
                      {modelData.slice(0, 6).map((item, i) => {
                        const pct = modelData[0].cost > 0 ? (item.cost / modelData[0].cost) * 100 : 0;
                        return (
                          <div key={item.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium truncate mr-2 font-mono">{item.key}</span>
                              <span className="text-muted-foreground tabular-nums shrink-0">{formatCost(item.cost)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: BAR_COLORS[(i + 3) % BAR_COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tool Usage ── */}
              {toolData.length > 0 && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-5 sm:px-6 pt-5 sm:pt-6 pb-1">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">{t("analytics.toolUsage")}</h2>
                  </div>
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 space-y-2.5">
                    {toolData.map((item, i) => {
                      const pct = toolData[0].count > 0 ? (item.count / toolData[0].count) * 100 : 0;
                      return (
                        <div key={item.name} className="group">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium truncate mr-2 font-mono">{item.name}</span>
                            <span className="text-muted-foreground tabular-nums shrink-0">
                              {item.count} {t("analytics.calls")}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("analytics.clearData")}</AlertDialogTitle>
            <AlertDialogDescription>{t("analytics.clearDataConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("agents.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("analytics.clearData")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
