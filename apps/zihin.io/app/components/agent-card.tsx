import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { AgentIndexEntry } from "~/lib/types";

const categoryColors: Record<string, string> = {
  Development: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  Writing: "border-violet-500/20 bg-violet-500/5 text-violet-400",
  Marketing: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  Data: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  Design: "border-rose-500/20 bg-rose-500/5 text-rose-400",
  Productivity: "border-teal-500/20 bg-teal-500/5 text-teal-400",
  Education: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
  Finance: "border-yellow-500/20 bg-yellow-500/5 text-yellow-400",
  Other: "border-gray-500/20 bg-gray-500/5 text-gray-400",
};

export function AgentCard({
  agent,
  lang = "en",
}: {
  agent: AgentIndexEntry;
  lang?: string;
}) {
  const colorClass = categoryColors[agent.category] || categoryColors.Other;

  return (
    <Link to={`/${lang}/agents/${agent.slug}`}>
      <div className="glass-card group relative flex flex-col gap-3 rounded-xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-izan-primary/20 to-izan-secondary/20 text-2xl">
            {agent.icon}
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
          >
            {agent.category}
          </span>
        </div>
        <div>
          <h3 className="font-semibold leading-tight">{agent.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {agent.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <img
              src={`https://github.com/${agent.author.githubUsername}.png?size=40`}
              alt={agent.author.displayName}
              className="h-5 w-5 rounded-full"
            />
            <span>{agent.author.displayName}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
