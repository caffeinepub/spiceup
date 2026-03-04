import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import {
  BASE_PRACTICES,
  type BasePractice,
  type GenericPractice,
  LEVEL2_ATTRIBUTES,
  LEVEL3_ATTRIBUTES,
  PROCESS_GROUPS,
} from "@/data/aspiceData";
import {
  useGetAllAssessments,
  useGetAllPracticeRatingsForAssessment,
  useGetProcessGroupConfig,
  useSavePracticeRating,
  useUpdateAssessmentStep,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PracticeRating } from "../backend.d";

// ─── Types ─────────────────────────────────────────────────────

type Rating = "N" | "P" | "L" | "F" | "";

interface EvidenceItem {
  description: string;
  link: string;
  version: string;
}

interface PracticeState {
  rating: Rating;
  strengths: string;
  weaknesses: string;
  workProducts: EvidenceItem[];
}

// key: `${processId}_${level}_${practiceId}`
type RatingsMap = Record<string, PracticeState>;

type SelectedNodeType = "root" | "process" | "pa" | "bp" | "gp";

interface SelectedNode {
  type: SelectedNodeType;
  id: string; // practiceId for bp/gp, processId for process, paId for pa, "root" for root
  processId: string;
  level?: number; // 1=bp, 2=gp under PA2.x, 3=gp under PA3.x
  paId?: string; // e.g. "PA1.1", "PA2.1" etc.
}

// ─── Constants ─────────────────────────────────────────────────

const PA_LABELS: Record<string, string> = {
  "PA1.1": "Process Performance (Base Practices)",
  "PA2.1": "Performance Management",
  "PA2.2": "Work Product Management",
  "PA3.1": "Process Definition",
  "PA3.2": "Process Deployment",
};

const RATING_OPTIONS: {
  value: Rating;
  label: string;
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: "N",
    label: "N",
    activeClass: "bg-red-500 text-white border-red-500",
    dotClass: "bg-red-500",
  },
  {
    value: "P",
    label: "P",
    activeClass: "bg-orange-500 text-white border-orange-500",
    dotClass: "bg-orange-500",
  },
  {
    value: "L",
    label: "L",
    activeClass: "bg-blue-500 text-white border-blue-500",
    dotClass: "bg-blue-500",
  },
  {
    value: "F",
    label: "F",
    activeClass: "bg-emerald-500 text-white border-emerald-500",
    dotClass: "bg-emerald-500",
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function buildEnabledProcesses(
  config: { enabledGroups: string; processLevels: string } | null,
): Array<{ id: string; targetLevel: string }> {
  if (!config) return [];
  try {
    const enabledGroups = JSON.parse(config.enabledGroups) as string[];
    const processLevels = JSON.parse(config.processLevels) as Record<
      string,
      string
    >;
    const result: Array<{ id: string; targetLevel: string }> = [];
    for (const group of PROCESS_GROUPS) {
      if (enabledGroups.includes(group.id)) {
        for (const p of group.processes) {
          result.push({ id: p.id, targetLevel: processLevels[p.id] ?? "2" });
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

const defaultPracticeState = (): PracticeState => ({
  rating: "",
  strengths: "",
  weaknesses: "",
  workProducts: [],
});

function getRatingDotClass(rating: Rating): string {
  switch (rating) {
    case "N":
      return "bg-red-500";
    case "P":
      return "bg-orange-400";
    case "L":
      return "bg-blue-500";
    case "F":
      return "bg-emerald-500";
    default:
      return "bg-muted-foreground/30";
  }
}

function getAggregateDotClass(ratings: Rating[]): string {
  if (ratings.length === 0) return "bg-muted-foreground/30";
  const rated = ratings.filter((r) => r !== "");
  if (rated.length === 0) return "bg-muted-foreground/30";
  if (rated.length < ratings.length) return "bg-orange-400";
  // All rated — check if all F or L
  const allGood = rated.every((r) => r === "F" || r === "L");
  return allGood ? "bg-emerald-500" : "bg-orange-400";
}

function getRatingBadgeClass(rating: Rating): string {
  switch (rating) {
    case "N":
      return "bg-red-100 text-red-700 border-red-200";
    case "P":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "L":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "F":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function isProcessComplete(
  processId: string,
  processInfo: { targetLevel: string },
  currentRatings: RatingsMap,
): boolean {
  const targetLevel =
    processInfo.targetLevel === "NA"
      ? 0
      : Number.parseInt(processInfo.targetLevel, 10);

  if (targetLevel === 0) return false;

  if (targetLevel >= 1) {
    const bps = BASE_PRACTICES[processId] ?? [];
    if (bps.length === 0) return false;
    for (const bp of bps) {
      const key = `${processId}_1_${bp.id}`;
      if (!currentRatings[key]?.rating) return false;
    }
  }

  if (targetLevel >= 2) {
    for (const attr of LEVEL2_ATTRIBUTES) {
      for (const gp of attr.practices) {
        const key = `${processId}_2_${gp.id}`;
        if (!currentRatings[key]?.rating) return false;
      }
    }
  }

  if (targetLevel >= 3) {
    for (const attr of LEVEL3_ATTRIBUTES) {
      for (const gp of attr.practices) {
        const key = `${processId}_3_${gp.id}`;
        if (!currentRatings[key]?.rating) return false;
      }
    }
  }

  return true;
}

function getProcessName(processId: string): string {
  return (
    PROCESS_GROUPS.flatMap((g) => g.processes).find((p) => p.id === processId)
      ?.name ?? processId
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-blue-50 text-blue-700 border-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <Badge
      variant="outline"
      className={`font-body text-xs ${styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {status}
    </Badge>
  );
}

function RatingSelector({
  value,
  onChange,
  index,
}: {
  value: Rating;
  onChange: (v: Rating) => void;
  index: number;
}) {
  return (
    <div className="flex gap-1.5">
      {RATING_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          className={cn(
            "w-9 h-9 rounded-lg text-sm font-bold font-heading border-2 transition-all",
            value === opt.value
              ? opt.activeClass
              : "bg-background border-border text-muted-foreground hover:bg-muted",
          )}
          data-ocid={`perform.practice_rating_button.${index}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PracticeCard({
  id,
  title,
  text,
  notes,
  state,
  onChange,
  index,
  isCompleted,
}: {
  id: string;
  title: string;
  text: string;
  notes?: string[];
  state: PracticeState;
  onChange: (patch: Partial<PracticeState>) => void;
  index: number;
  isCompleted?: boolean;
}) {
  const [notesOpen, setNotesOpen] = useState(false);

  function updateEvidence(i: number, patch: Partial<EvidenceItem>) {
    const updated = state.workProducts.map((item, idx) =>
      idx === i ? { ...item, ...patch } : item,
    );
    onChange({ workProducts: updated });
  }

  function removeEvidence(i: number) {
    onChange({
      workProducts: state.workProducts.filter((_, idx) => idx !== i),
    });
  }

  function addEvidence() {
    onChange({
      workProducts: [
        ...state.workProducts,
        { description: "", link: "", version: "" },
      ],
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-bold font-heading text-sm text-foreground">
                {id}
              </span>
              <span className="text-muted-foreground font-body text-sm ml-2">
                — {title}
              </span>
            </div>
            <div
              className={isCompleted ? "opacity-60 pointer-events-none" : ""}
            >
              <RatingSelector
                value={state.rating}
                onChange={(v) => onChange({ rating: v })}
                index={index}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            {text}
          </p>
          {notes && notes.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setNotesOpen((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                data-ocid={`perform.notes_toggle.${index}`}
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    notesOpen && "rotate-180",
                  )}
                />
                {notesOpen ? "Hide Notes" : "Show Notes"}
              </button>
              {notesOpen && (
                <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border/40 space-y-1.5">
                  {notes.map((note, i) => (
                    <p
                      key={note.slice(0, 40)}
                      className="text-xs text-muted-foreground font-body italic leading-relaxed"
                    >
                      <span className="font-semibold not-italic">
                        Note {i + 1}:
                      </span>{" "}
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Strengths
            </Label>
            <Textarea
              value={state.strengths}
              onChange={(e) => onChange({ strengths: e.target.value })}
              placeholder="Document strengths observed..."
              rows={3}
              className="font-body text-sm resize-none"
              disabled={isCompleted}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Weaknesses
            </Label>
            <Textarea
              value={state.weaknesses}
              onChange={(e) => onChange({ weaknesses: e.target.value })}
              placeholder="Document weaknesses observed..."
              rows={3}
              className="font-body text-sm resize-none"
              disabled={isCompleted}
            />
          </div>
        </div>

        {/* Work Products Inspected */}
        <div className="space-y-2">
          <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Work Products Inspected
          </Label>
          <div className="space-y-1.5">
            {state.workProducts.map((ev, i) => {
              const isLineItem = ev.description.trim() !== "";
              return isLineItem ? (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: evidence items have no stable IDs
                  key={`wp-${index}-${i}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/40 text-sm"
                >
                  <span className="font-medium font-body text-foreground flex-1 min-w-0 truncate">
                    {ev.description}
                  </span>
                  <span className="shrink-0 text-muted-foreground font-body text-xs">
                    |
                  </span>
                  {ev.link ? (
                    <a
                      href={ev.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-body text-xs truncate max-w-[140px]"
                    >
                      {ev.link}
                    </a>
                  ) : (
                    <span className="text-muted-foreground font-body text-xs">
                      —
                    </span>
                  )}
                  <span className="shrink-0 text-muted-foreground font-body text-xs">
                    |
                  </span>
                  <span className="text-muted-foreground font-body text-xs shrink-0">
                    {ev.version || "—"}
                  </span>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => removeEvidence(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded ml-1"
                      data-ocid={`perform.evidence_remove_button.${index}.${i + 1}`}
                      aria-label="Remove evidence"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: evidence items have no stable IDs
                  key={`wp-${index}-${i}`}
                  className="border border-border/40 rounded-md p-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={ev.description}
                      onChange={(e) =>
                        updateEvidence(i, { description: e.target.value })
                      }
                      placeholder="Evidence description..."
                      className="font-body text-sm flex-1"
                      disabled={isCompleted}
                      data-ocid={`perform.evidence_description_input.${index}.${i + 1}`}
                    />
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => removeEvidence(i)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                        data-ocid={`perform.evidence_remove_button.${index}.${i + 1}`}
                        aria-label="Remove evidence"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={ev.link}
                      onChange={(e) =>
                        updateEvidence(i, { link: e.target.value })
                      }
                      placeholder="Link (optional)"
                      className="font-body text-sm"
                      disabled={isCompleted}
                      data-ocid={`perform.evidence_link_input.${index}.${i + 1}`}
                    />
                    <Input
                      value={ev.version}
                      onChange={(e) =>
                        updateEvidence(i, { version: e.target.value })
                      }
                      placeholder="Version (optional)"
                      className="font-body text-sm"
                      disabled={isCompleted}
                      data-ocid={`perform.evidence_version_input.${index}.${i + 1}`}
                    />
                  </div>
                </div>
              );
            })}
            {!isCompleted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEvidence}
                className="font-body text-xs gap-1"
                data-ocid={`perform.evidence_add_button.${index}`}
              >
                <Plus className="h-3.5 w-3.5" /> Add Evidence
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tree Node Component ─────────────────────────────────────────

interface TreeNodeData {
  type: SelectedNodeType;
  id: string;
  label: string;
  sublabel?: string;
  processId: string;
  level?: number;
  paId?: string;
  dotClass?: string;
  children?: TreeNodeData[];
}

function TreeNode({
  node,
  depth,
  selected,
  expandedNodes,
  onSelect,
  onToggle,
  index,
}: {
  node: TreeNodeData;
  depth: number;
  selected: SelectedNode | null;
  expandedNodes: Set<string>;
  onSelect: (n: SelectedNode) => void;
  onToggle: (key: string) => void;
  index: number;
}) {
  const nodeKey = `${node.type}:${node.processId}:${node.id}`;
  const isExpanded = expandedNodes.has(nodeKey);
  const isLeaf = !node.children || node.children.length === 0;
  const isSelected =
    selected?.type === node.type &&
    selected?.id === node.id &&
    selected?.processId === node.processId;

  const paddingLeft = 8 + depth * 14;

  function handleClick() {
    if (!isLeaf) onToggle(nodeKey);
    onSelect({
      type: node.type,
      id: node.id,
      processId: node.processId,
      level: node.level,
      paId: node.paId,
    });
  }

  const ocidMap: Record<SelectedNodeType, string> = {
    root: "perform.tree_root_node",
    process: `perform.tree_process_node.${index}`,
    pa: `perform.tree_pa_node.${index}`,
    bp: `perform.tree_bp_node.${index}`,
    gp: `perform.tree_gp_node.${index}`,
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        data-ocid={ocidMap[node.type]}
        className={cn(
          "w-full text-left flex items-center gap-1.5 py-1 pr-2 rounded-sm text-sm transition-colors group",
          isSelected
            ? "bg-accent/15 text-accent font-medium"
            : "text-foreground hover:bg-muted/70",
          node.type === "process" && "font-semibold",
        )}
        style={{ paddingLeft }}
      >
        {/* Expand/collapse chevron */}
        {!isLeaf ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Status dot */}
        {node.dotClass && (
          <span
            className={cn("h-2 w-2 rounded-full shrink-0", node.dotClass)}
          />
        )}

        {/* Label */}
        <span className="truncate font-body text-xs leading-snug">
          {node.label}
          {node.sublabel && (
            <span className="text-muted-foreground font-normal ml-1 text-[11px]">
              {node.sublabel}
            </span>
          )}
        </span>
      </button>

      {/* Children */}
      {!isLeaf && isExpanded && node.children && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode
              key={`${child.type}:${child.processId}:${child.id}`}
              node={child}
              depth={depth + 1}
              selected={selected}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggle={onToggle}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PA Summary View ─────────────────────────────────────────────

function PASummaryView({
  paId,
  processId,
  ratings,
  onSelectPractice,
}: {
  paId: string;
  processId: string;
  ratings: RatingsMap;
  onSelectPractice: (node: SelectedNode) => void;
  isCompleted?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "rated" | "unrated">("all");

  const practices: Array<{
    practice: BasePractice | GenericPractice;
    level: number;
  }> = useMemo(() => {
    if (paId === "PA1.1") {
      return (BASE_PRACTICES[processId] ?? []).map((bp) => ({
        practice: bp,
        level: 1,
      }));
    }
    if (paId === "PA2.1") {
      return (LEVEL2_ATTRIBUTES[0]?.practices ?? []).map((gp) => ({
        practice: gp,
        level: 2,
      }));
    }
    if (paId === "PA2.2") {
      return (LEVEL2_ATTRIBUTES[1]?.practices ?? []).map((gp) => ({
        practice: gp,
        level: 2,
      }));
    }
    if (paId === "PA3.1") {
      return (LEVEL3_ATTRIBUTES[0]?.practices ?? []).map((gp) => ({
        practice: gp,
        level: 3,
      }));
    }
    if (paId === "PA3.2") {
      return (LEVEL3_ATTRIBUTES[1]?.practices ?? []).map((gp) => ({
        practice: gp,
        level: 3,
      }));
    }
    return [];
  }, [paId, processId]);

  const practicesWithState = useMemo(() => {
    return practices.map(({ practice, level }) => {
      const key = `${processId}_${level}_${practice.id}`;
      const state = ratings[key] ?? defaultPracticeState();
      return { practice, level, state };
    });
  }, [practices, processId, ratings]);

  const totalCount = practicesWithState.length;
  const ratedCount = practicesWithState.filter(
    (p) => p.state.rating !== "",
  ).length;
  const strengthsCount = practicesWithState.filter(
    (p) => p.state.strengths.trim() !== "",
  ).length;
  const weaknessesCount = practicesWithState.filter(
    (p) => p.state.weaknesses.trim() !== "",
  ).length;

  const filtered = practicesWithState.filter((p) => {
    if (filter === "rated") return p.state.rating !== "";
    if (filter === "unrated") return p.state.rating === "";
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold font-heading text-foreground">
            {paId} — {PA_LABELS[paId]}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground font-body mt-1">
          {processId}
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Total Practices", value: totalCount, cls: "bg-muted/50" },
          {
            label: "Assessed",
            value: ratedCount,
            cls: "bg-blue-50 text-blue-700",
          },
          {
            label: "Strengths documented",
            value: strengthsCount,
            cls: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Weaknesses documented",
            value: weaknessesCount,
            cls: "bg-red-50 text-red-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "px-3 py-2 rounded-lg border border-border/40 min-w-[100px]",
              s.cls,
            )}
          >
            <p className="text-lg font-bold font-heading">{s.value}</p>
            <p className="text-xs font-body text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="h-8">
          <TabsTrigger
            value="all"
            className="font-body text-xs h-6 px-3"
            data-ocid="perform.pa_summary_filter_tab"
          >
            All ({totalCount})
          </TabsTrigger>
          <TabsTrigger
            value="rated"
            className="font-body text-xs h-6 px-3"
            data-ocid="perform.pa_summary_filter_tab"
          >
            Rated ({ratedCount})
          </TabsTrigger>
          <TabsTrigger
            value="unrated"
            className="font-body text-xs h-6 px-3"
            data-ocid="perform.pa_summary_filter_tab"
          >
            Unrated ({totalCount - ratedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-3">
          <div
            className="rounded-md border border-border/60 overflow-hidden"
            data-ocid="perform.pa_summary_table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-body text-xs w-[110px]">
                    Practice ID
                  </TableHead>
                  <TableHead className="font-body text-xs w-[70px]">
                    Rating
                  </TableHead>
                  <TableHead className="font-body text-xs">Strengths</TableHead>
                  <TableHead className="font-body text-xs">
                    Weaknesses
                  </TableHead>
                  <TableHead className="font-body text-xs w-[80px]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground font-body text-sm"
                    >
                      No practices match this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(({ practice, level, state }, idx) => (
                    <TableRow
                      key={practice.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      data-ocid={`perform.pa_summary_row.${idx + 1}`}
                      onClick={() =>
                        onSelectPractice({
                          type: paId === "PA1.1" ? "bp" : "gp",
                          id: practice.id,
                          processId,
                          level,
                          paId,
                        })
                      }
                    >
                      <TableCell className="font-body text-xs font-medium py-2">
                        {practice.id}
                      </TableCell>
                      <TableCell className="py-2">
                        {state.rating ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-body text-xs",
                              getRatingBadgeClass(state.rating),
                            )}
                          >
                            {state.rating}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-body text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-body text-xs py-2 max-w-[180px]">
                        <span className="line-clamp-2 text-muted-foreground">
                          {state.strengths || (
                            <span className="italic">Not documented</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-body text-xs py-2 max-w-[180px]">
                        <span className="line-clamp-2 text-muted-foreground">
                          {state.weaknesses || (
                            <span className="italic">Not documented</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-body",
                            state.rating
                              ? "text-emerald-600"
                              : "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              getRatingDotClass(state.rating),
                            )}
                          />
                          {state.rating ? "Assessed" : "Pending"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Process Overview View ────────────────────────────────────────

function ProcessOverviewView({
  processId,
  processInfo,
  ratings,
  onSelectPA,
}: {
  processId: string;
  processInfo: { targetLevel: string };
  ratings: RatingsMap;
  onSelectPA: (node: SelectedNode) => void;
}) {
  const targetLevel =
    processInfo.targetLevel === "NA"
      ? 0
      : Number.parseInt(processInfo.targetLevel, 10);
  const processName = getProcessName(processId);

  const paRows = useMemo(() => {
    const rows: Array<{
      paId: string;
      label: string;
      total: number;
      rated: number;
    }> = [];

    if (targetLevel >= 1) {
      const bps = BASE_PRACTICES[processId] ?? [];
      const rated = bps.filter(
        (bp) => !!ratings[`${processId}_1_${bp.id}`]?.rating,
      ).length;
      rows.push({
        paId: "PA1.1",
        label: PA_LABELS["PA1.1"],
        total: bps.length,
        rated,
      });
    }
    if (targetLevel >= 2) {
      for (const attr of LEVEL2_ATTRIBUTES) {
        const gps = attr.practices;
        const rated = gps.filter(
          (gp) => !!ratings[`${processId}_2_${gp.id}`]?.rating,
        ).length;
        rows.push({
          paId: attr.id,
          label: PA_LABELS[attr.id] ?? attr.name,
          total: gps.length,
          rated,
        });
      }
    }
    if (targetLevel >= 3) {
      for (const attr of LEVEL3_ATTRIBUTES) {
        const gps = attr.practices;
        const rated = gps.filter(
          (gp) => !!ratings[`${processId}_3_${gp.id}`]?.rating,
        ).length;
        rows.push({
          paId: attr.id,
          label: PA_LABELS[attr.id] ?? attr.name,
          total: gps.length,
          rated,
        });
      }
    }
    return rows;
  }, [processId, ratings, targetLevel]);

  const totalAll = paRows.reduce((s, r) => s + r.total, 0);
  const ratedAll = paRows.reduce((s, r) => s + r.rated, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold font-heading text-foreground text-lg">
          {processId}
        </h2>
        <p className="text-muted-foreground font-body text-sm">{processName}</p>
        <p className="text-xs text-muted-foreground font-body mt-1">
          Target Level:{" "}
          <span className="font-semibold">{processInfo.targetLevel}</span>
        </p>
      </div>

      {targetLevel === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground font-body text-sm">
              This process is excluded from assessment (Target Level: NA).
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-3">
            <div className="px-4 py-3 rounded-lg border border-border/40 bg-muted/30 min-w-[110px]">
              <p className="text-xl font-bold font-heading">
                {ratedAll}/{totalAll}
              </p>
              <p className="text-xs font-body text-muted-foreground">
                Total Rated
              </p>
            </div>
            <div className="px-4 py-3 rounded-lg border border-border/40 bg-blue-50 min-w-[110px]">
              <p className="text-xl font-bold font-heading text-blue-700">
                {Math.round((ratedAll / Math.max(totalAll, 1)) * 100)}%
              </p>
              <p className="text-xs font-body text-muted-foreground">
                Complete
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-body text-xs">
                    PA Section
                  </TableHead>
                  <TableHead className="font-body text-xs w-[60px]">
                    Total
                  </TableHead>
                  <TableHead className="font-body text-xs w-[60px]">
                    Rated
                  </TableHead>
                  <TableHead className="font-body text-xs w-[90px]">
                    % Complete
                  </TableHead>
                  <TableHead className="font-body text-xs w-[80px]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paRows.map((row) => {
                  const pct = Math.round(
                    (row.rated / Math.max(row.total, 1)) * 100,
                  );
                  return (
                    <TableRow
                      key={row.paId}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() =>
                        onSelectPA({
                          type: "pa",
                          id: row.paId,
                          processId,
                          paId: row.paId,
                        })
                      }
                    >
                      <TableCell className="font-body text-xs py-2">
                        <span className="font-semibold">{row.paId}</span>
                        <span className="text-muted-foreground ml-1">
                          — {row.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-body text-xs py-2">
                        {row.total}
                      </TableCell>
                      <TableCell className="font-body text-xs py-2">
                        {row.rated}
                      </TableCell>
                      <TableCell className="font-body text-xs py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct === 100
                                  ? "bg-emerald-500"
                                  : pct > 0
                                    ? "bg-blue-500"
                                    : "bg-muted-foreground/20",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span>{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={cn(
                            "text-xs font-body",
                            pct === 100
                              ? "text-emerald-600"
                              : pct > 0
                                ? "text-blue-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {pct === 100
                            ? "✓ Done"
                            : pct > 0
                              ? "In Progress"
                              : "Pending"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground font-body italic">
            Click a PA row to view its practices, or select a practice from the
            tree.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Root Overview View ──────────────────────────────────────────

function RootOverviewView({
  enabledProcesses,
  ratings,
}: {
  enabledProcesses: Array<{ id: string; targetLevel: string }>;
  ratings: RatingsMap;
}) {
  const stats = useMemo(() => {
    let totalPractices = 0;
    let ratedPractices = 0;
    let completeProcesses = 0;

    for (const proc of enabledProcesses) {
      const complete = isProcessComplete(proc.id, proc, ratings);
      if (complete) completeProcesses++;

      const tl =
        proc.targetLevel === "NA" ? 0 : Number.parseInt(proc.targetLevel, 10);
      if (tl >= 1) {
        const bps = BASE_PRACTICES[proc.id] ?? [];
        totalPractices += bps.length;
        ratedPractices += bps.filter(
          (bp) => !!ratings[`${proc.id}_1_${bp.id}`]?.rating,
        ).length;
      }
      if (tl >= 2) {
        for (const attr of LEVEL2_ATTRIBUTES) {
          totalPractices += attr.practices.length;
          ratedPractices += attr.practices.filter(
            (gp) => !!ratings[`${proc.id}_2_${gp.id}`]?.rating,
          ).length;
        }
      }
      if (tl >= 3) {
        for (const attr of LEVEL3_ATTRIBUTES) {
          totalPractices += attr.practices.length;
          ratedPractices += attr.practices.filter(
            (gp) => !!ratings[`${proc.id}_3_${gp.id}`]?.rating,
          ).length;
        }
      }
    }

    return { totalPractices, ratedPractices, completeProcesses };
  }, [enabledProcesses, ratings]);

  const overallPct = Math.round(
    (stats.ratedPractices / Math.max(stats.totalPractices, 1)) * 100,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold font-heading text-foreground text-lg">
          ASPICE — Automotive SPICE v4.0
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          Assessment Overview
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Processes Enabled",
            value: enabledProcesses.length,
            cls: "bg-muted/40",
          },
          {
            label: "Processes Complete",
            value: stats.completeProcesses,
            cls: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Practices Rated",
            value: `${stats.ratedPractices}/${stats.totalPractices}`,
            cls: "bg-blue-50 text-blue-700",
          },
          {
            label: "Overall Progress",
            value: `${overallPct}%`,
            cls: "bg-violet-50 text-violet-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              "px-3 py-3 rounded-lg border border-border/40",
              s.cls,
            )}
          >
            <p className="text-xl font-bold font-heading">{s.value}</p>
            <p className="text-xs font-body text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground font-body">
        Select a process or practice from the tree on the left to begin rating.
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function PerformAssessment() {
  const { currentAssessmentId, currentAssessmentTitle, navigateTo } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: processConfig, isLoading: loadingConfig } =
    useGetProcessGroupConfig(currentAssessmentId);
  const { data: savedRatings, isLoading: loadingRatings } =
    useGetAllPracticeRatingsForAssessment(currentAssessmentId);
  const savePracticeRating = useSavePracticeRating();
  const updateStepMutation = useUpdateAssessmentStep();

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [ratings, setRatings] = useState<RatingsMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [descNotesOpen, setDescNotesOpen] = useState(false);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const isCompleted = currentAssessment?.status === "Completed";
  const enabledProcesses = buildEnabledProcesses(processConfig ?? null);

  // Default: expand all process and PA nodes
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when process list changes
  useEffect(() => {
    if (enabledProcesses.length === 0) return;
    const keys = new Set<string>();
    keys.add("root:root:root");
    for (const proc of enabledProcesses) {
      keys.add(`process:${proc.id}:${proc.id}`);
      const tl =
        proc.targetLevel === "NA" ? 0 : Number.parseInt(proc.targetLevel, 10);
      const pas = buildPAList(tl);
      for (const pa of pas) {
        keys.add(`pa:${proc.id}:${pa}`);
      }
    }
    setExpandedNodes(keys);
  }, [enabledProcesses]);

  // Default selection: first enabled process
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run once when processes load
  useEffect(() => {
    if (enabledProcesses.length > 0 && !selectedNode) {
      const first = enabledProcesses[0];
      setSelectedNode({ type: "process", id: first.id, processId: first.id });
    }
  }, [enabledProcesses, selectedNode]);

  // Populate ratings from backend
  useEffect(() => {
    if (savedRatings && savedRatings.length > 0) {
      const map: RatingsMap = {};
      for (const r of savedRatings as PracticeRating[]) {
        const key = `${r.processId}_${Number(r.level)}_${r.practiceId}`;
        let workProducts: EvidenceItem[] = [];
        try {
          const parsed = JSON.parse(r.workProductsInspected) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const p = parsed as Record<string, unknown>;
            if (Array.isArray(p.workProducts)) {
              workProducts = p.workProducts as EvidenceItem[];
            } else {
              if (typeof p.workProducts === "string" && p.workProducts) {
                workProducts.push({
                  description: p.workProducts,
                  link: "",
                  version: "",
                });
              }
              if (Array.isArray(p.evidences)) {
                for (const ev of p.evidences as string[]) {
                  workProducts.push({ description: ev, link: "", version: "" });
                }
              }
            }
          }
        } catch {
          if (r.workProductsInspected) {
            workProducts = [
              { description: r.workProductsInspected, link: "", version: "" },
            ];
          }
        }
        map[key] = {
          rating: r.rating as Rating,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          workProducts,
        };
      }
      setRatings((prev) => ({ ...map, ...prev }));
    }
  }, [savedRatings]);

  function getRatingKey(processId: string, level: number, practiceId: string) {
    return `${processId}_${level}_${practiceId}`;
  }

  function getPracticeState(
    processId: string,
    level: number,
    practiceId: string,
  ): PracticeState {
    return (
      ratings[getRatingKey(processId, level, practiceId)] ??
      defaultPracticeState()
    );
  }

  function updatePracticeState(
    processId: string,
    level: number,
    practiceId: string,
    patch: Partial<PracticeState>,
  ) {
    const key = getRatingKey(processId, level, practiceId);
    setRatings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? defaultPracticeState()), ...patch },
    }));
  }

  const saveProcessRatings = useCallback(
    async (processId: string, currentRatings: RatingsMap) => {
      if (!currentAssessmentId) return;
      const processInfo = enabledProcesses.find((p) => p.id === processId);
      if (!processInfo) return;

      const getState = (
        pid: string,
        lvl: number,
        practiceId: string,
      ): PracticeState =>
        currentRatings[`${pid}_${lvl}_${practiceId}`] ?? defaultPracticeState();

      const targetLevel =
        processInfo.targetLevel === "NA"
          ? 0
          : Number.parseInt(processInfo.targetLevel, 10);
      const savePromises: Promise<unknown>[] = [];

      if (targetLevel >= 1) {
        const bps = BASE_PRACTICES[processId] ?? [];
        for (const bp of bps) {
          const state = getState(processId, 1, bp.id);
          if (state.rating) {
            savePromises.push(
              savePracticeRating.mutateAsync({
                assessmentId: currentAssessmentId,
                processId,
                level: BigInt(1),
                practiceId: bp.id,
                rating: state.rating,
                strengths: state.strengths,
                weaknesses: state.weaknesses,
                workProductsInspected: JSON.stringify({
                  workProducts: state.workProducts,
                }),
              }),
            );
          }
        }
      }

      if (targetLevel >= 2) {
        for (const attr of LEVEL2_ATTRIBUTES) {
          for (const gp of attr.practices) {
            const state = getState(processId, 2, gp.id);
            if (state.rating) {
              savePromises.push(
                savePracticeRating.mutateAsync({
                  assessmentId: currentAssessmentId,
                  processId,
                  level: BigInt(2),
                  practiceId: gp.id,
                  rating: state.rating,
                  strengths: state.strengths,
                  weaknesses: state.weaknesses,
                  workProductsInspected: JSON.stringify({
                    workProducts: state.workProducts,
                  }),
                }),
              );
            }
          }
        }
      }

      if (targetLevel >= 3) {
        for (const attr of LEVEL3_ATTRIBUTES) {
          for (const gp of attr.practices) {
            const state = getState(processId, 3, gp.id);
            if (state.rating) {
              savePromises.push(
                savePracticeRating.mutateAsync({
                  assessmentId: currentAssessmentId,
                  processId,
                  level: BigInt(3),
                  practiceId: gp.id,
                  rating: state.rating,
                  strengths: state.strengths,
                  weaknesses: state.weaknesses,
                  workProductsInspected: JSON.stringify({
                    workProducts: state.workProducts,
                  }),
                }),
              );
            }
          }
        }
      }

      await Promise.all(savePromises);
    },
    [currentAssessmentId, enabledProcesses, savePracticeRating],
  );

  async function handleSaveAll() {
    setIsSaving(true);
    try {
      await Promise.all(
        enabledProcesses.map((p) => saveProcessRatings(p.id, ratings)),
      );
      toast.success("All ratings saved");
    } catch {
      toast.error("Failed to save some ratings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAndContinue() {
    if (!currentAssessmentId) return;
    await handleSaveAll();
    await updateStepMutation.mutateAsync({
      id: currentAssessmentId,
      step: "results",
    });
    toast.success("Navigating to View Results");
    navigateTo("results");
  }

  // ─── Tree building ───────────────────────────────────────────

  function buildPAList(tl: number): string[] {
    const pas: string[] = [];
    if (tl >= 1) pas.push("PA1.1");
    if (tl >= 2) {
      pas.push("PA2.1");
      pas.push("PA2.2");
    }
    if (tl >= 3) {
      pas.push("PA3.1");
      pas.push("PA3.2");
    }
    return pas;
  }

  function getPABpGpRatings(processId: string, paId: string): Rating[] {
    if (paId === "PA1.1") {
      return (BASE_PRACTICES[processId] ?? []).map(
        (bp) => ratings[`${processId}_1_${bp.id}`]?.rating ?? "",
      );
    }
    if (paId === "PA2.1") {
      return (LEVEL2_ATTRIBUTES[0]?.practices ?? []).map(
        (gp) => ratings[`${processId}_2_${gp.id}`]?.rating ?? "",
      );
    }
    if (paId === "PA2.2") {
      return (LEVEL2_ATTRIBUTES[1]?.practices ?? []).map(
        (gp) => ratings[`${processId}_2_${gp.id}`]?.rating ?? "",
      );
    }
    if (paId === "PA3.1") {
      return (LEVEL3_ATTRIBUTES[0]?.practices ?? []).map(
        (gp) => ratings[`${processId}_3_${gp.id}`]?.rating ?? "",
      );
    }
    if (paId === "PA3.2") {
      return (LEVEL3_ATTRIBUTES[1]?.practices ?? []).map(
        (gp) => ratings[`${processId}_3_${gp.id}`]?.rating ?? "",
      );
    }
    return [];
  }

  function buildLeafNodes(processId: string, paId: string): TreeNodeData[] {
    if (paId === "PA1.1") {
      return (BASE_PRACTICES[processId] ?? []).map((bp) => ({
        type: "bp" as const,
        id: bp.id,
        label: bp.id,
        sublabel: bp.title,
        processId,
        level: 1,
        paId,
        dotClass: getRatingDotClass(
          ratings[`${processId}_1_${bp.id}`]?.rating ?? "",
        ),
      }));
    }
    const level = paId.startsWith("PA2") ? 2 : 3;
    let practices: GenericPractice[] = [];
    if (paId === "PA2.1") practices = LEVEL2_ATTRIBUTES[0]?.practices ?? [];
    else if (paId === "PA2.2")
      practices = LEVEL2_ATTRIBUTES[1]?.practices ?? [];
    else if (paId === "PA3.1")
      practices = LEVEL3_ATTRIBUTES[0]?.practices ?? [];
    else if (paId === "PA3.2")
      practices = LEVEL3_ATTRIBUTES[1]?.practices ?? [];

    return practices.map((gp) => ({
      type: "gp" as const,
      id: gp.id,
      label: gp.id,
      sublabel: gp.title,
      processId,
      level,
      paId,
      dotClass: getRatingDotClass(
        ratings[`${processId}_${level}_${gp.id}`]?.rating ?? "",
      ),
    }));
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: ratings used via getPABpGpRatings/buildLeafNodes closures
  const treeData: TreeNodeData = useMemo(() => {
    const processNodes: TreeNodeData[] = enabledProcesses.map((proc) => {
      const tl =
        proc.targetLevel === "NA" ? 0 : Number.parseInt(proc.targetLevel, 10);
      const pas = buildPAList(tl);
      const allRatings: Rating[] = [];

      const paNodes: TreeNodeData[] = pas.map((paId) => {
        const leafRatings = getPABpGpRatings(proc.id, paId);
        allRatings.push(...leafRatings);
        return {
          type: "pa" as const,
          id: paId,
          label: paId,
          sublabel: PA_LABELS[paId],
          processId: proc.id,
          paId,
          dotClass: getAggregateDotClass(leafRatings),
          children: buildLeafNodes(proc.id, paId),
        };
      });

      return {
        type: "process" as const,
        id: proc.id,
        label: proc.id,
        sublabel: getProcessName(proc.id),
        processId: proc.id,
        dotClass: getAggregateDotClass(allRatings),
        children: paNodes,
      };
    });

    return {
      type: "root" as const,
      id: "root",
      label: "ASPICE — Automotive SPICE v4.0",
      processId: "root",
      children: processNodes,
    };
  }, [enabledProcesses, ratings]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleNode(key: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    const keys = new Set<string>();
    function collect(node: TreeNodeData) {
      if (node.children && node.children.length > 0) {
        keys.add(`${node.type}:${node.processId}:${node.id}`);
        for (const c of node.children) collect(c);
      }
    }
    collect(treeData);
    setExpandedNodes(keys);
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  // ─── Description panel content ───────────────────────────────

  interface DescContent {
    id: string;
    title: string;
    text: string;
    notes?: string[];
  }

  const descContent: DescContent | null = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === "root") {
      return {
        id: "ASPICE v4.0",
        title: "Automotive SPICE v4.0",
        text: "Select a process or practice from the tree to view its details.",
      };
    }
    if (selectedNode.type === "process") {
      return {
        id: selectedNode.processId,
        title: getProcessName(selectedNode.processId),
        text: "Select a practice below to view its full requirement text and notes.",
      };
    }
    if (selectedNode.type === "pa") {
      const paId = selectedNode.paId ?? selectedNode.id;
      return {
        id: paId,
        title: PA_LABELS[paId] ?? paId,
        text: "Select a Base Practice or Generic Practice below to view its full requirement text.",
      };
    }
    if (selectedNode.type === "bp") {
      const bp = (BASE_PRACTICES[selectedNode.processId] ?? []).find(
        (b) => b.id === selectedNode.id,
      );
      if (bp)
        return { id: bp.id, title: bp.title, text: bp.text, notes: bp.notes };
    }
    if (selectedNode.type === "gp") {
      const level = selectedNode.level ?? 2;
      const attrs = level === 2 ? LEVEL2_ATTRIBUTES : LEVEL3_ATTRIBUTES;
      for (const attr of attrs) {
        const gp = attr.practices.find((g) => g.id === selectedNode.id);
        if (gp)
          return { id: gp.id, title: gp.title, text: gp.text, notes: gp.notes };
      }
    }
    return null;
  }, [selectedNode]);

  // ─── Right panel content ──────────────────────────────────────

  function renderRightPanel() {
    if (!selectedNode) {
      return (
        <RootOverviewView
          enabledProcesses={enabledProcesses}
          ratings={ratings}
        />
      );
    }

    if (selectedNode.type === "root") {
      return (
        <RootOverviewView
          enabledProcesses={enabledProcesses}
          ratings={ratings}
        />
      );
    }

    if (selectedNode.type === "process") {
      const procInfo = enabledProcesses.find(
        (p) => p.id === selectedNode.processId,
      );
      if (!procInfo) return null;
      return (
        <ProcessOverviewView
          processId={selectedNode.processId}
          processInfo={procInfo}
          ratings={ratings}
          onSelectPA={(node) => setSelectedNode(node)}
        />
      );
    }

    if (selectedNode.type === "pa") {
      const paId = selectedNode.paId ?? selectedNode.id;
      return (
        <PASummaryView
          paId={paId}
          processId={selectedNode.processId}
          ratings={ratings}
          onSelectPractice={(node) => setSelectedNode(node)}
          isCompleted={!!isCompleted}
        />
      );
    }

    // BP or GP — single practice card
    if (selectedNode.type === "bp" || selectedNode.type === "gp") {
      const level = selectedNode.level ?? 1;
      const practiceId = selectedNode.id;
      const processId = selectedNode.processId;

      let practice: BasePractice | GenericPractice | undefined;
      if (selectedNode.type === "bp") {
        practice = (BASE_PRACTICES[processId] ?? []).find(
          (b) => b.id === practiceId,
        );
      } else {
        const attrs = level === 2 ? LEVEL2_ATTRIBUTES : LEVEL3_ATTRIBUTES;
        for (const attr of attrs) {
          practice = attr.practices.find((g) => g.id === practiceId);
          if (practice) break;
        }
      }

      if (!practice) return null;

      const paId = selectedNode.paId ?? "PA1.1";

      return (
        <div className="space-y-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-body text-muted-foreground flex-wrap">
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() =>
                setSelectedNode({ type: "process", id: processId, processId })
              }
            >
              {processId}
            </button>
            <ChevronRight className="h-3 w-3" />
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() =>
                setSelectedNode({ type: "pa", id: paId, processId, paId })
              }
            >
              {paId}
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{practiceId}</span>
          </nav>

          <PracticeCard
            id={practice.id}
            title={practice.title}
            text={practice.text}
            notes={practice.notes}
            state={getPracticeState(processId, level, practiceId)}
            onChange={(patch) =>
              updatePracticeState(processId, level, practiceId, patch)
            }
            index={1}
            isCompleted={isCompleted}
          />
        </div>
      );
    }

    return null;
  }

  // ─── Early returns ───────────────────────────────────────────

  if (!currentAssessmentId) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20 text-center space-y-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold font-heading text-foreground">
            No Assessment Selected
          </p>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Please select or create an assessment from the Dashboard.
          </p>
        </div>
        <Button
          onClick={() => navigateTo("dashboard")}
          className="spice-gradient text-white border-0 gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const isLoading = loadingConfig || loadingRatings;

  if (isLoading) {
    return (
      <div className="page-enter space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-96 w-64" />
          <Skeleton className="flex-1 h-96" />
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────

  return (
    <div className="page-enter flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 pb-3 shrink-0">
        <div>
          <p className="text-xs text-muted-foreground font-body mb-1 uppercase tracking-wide">
            Current Assessment
          </p>
          <h1 className="text-xl font-bold font-heading text-foreground leading-tight">
            {currentAssessmentTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 font-body">
            Perform Assessment
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentAssessment && (
            <StatusBadge status={currentAssessment.status} />
          )}
          {!isCompleted && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="gap-1.5"
                data-ocid="perform.save_button"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save All
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="spice-gradient text-white border-0 gap-1.5"
                data-ocid="perform.save_continue_button"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save & Continue →
              </Button>
            </>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3 shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-body text-amber-800">
            This assessment is marked as Completed. No further edits are
            allowed.
          </p>
        </div>
      )}

      {enabledProcesses.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground font-body text-sm">
              No processes enabled. Go to Define Target Profile to enable
              process groups.
            </p>
            <Button
              className="mt-4 spice-gradient text-white border-0"
              onClick={() => navigateTo("target-profile")}
            >
              Define Target Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-lg border border-border/60"
          >
            {/* ── Left Panel ── */}
            <ResizablePanel
              defaultSize={25}
              minSize={15}
              maxSize={40}
              className="flex flex-col min-h-0"
            >
              {/* Tree header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0 bg-muted/20">
                <span className="text-xs font-semibold font-heading uppercase tracking-wide text-muted-foreground">
                  Processes
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={collapseAll}
                    title="Collapse all"
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    data-ocid="perform.tree_collapse_all_button"
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={expandAll}
                    title="Expand all"
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    data-ocid="perform.tree_expand_all_button"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Tree scroll area */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-1.5">
                  {/* Root node */}
                  <TreeNode
                    node={treeData}
                    depth={0}
                    selected={selectedNode}
                    expandedNodes={expandedNodes}
                    onSelect={(n) => {
                      setSelectedNode(n);
                      setDescNotesOpen(false);
                    }}
                    onToggle={toggleNode}
                    index={0}
                  />
                </div>
              </ScrollArea>

              <Separator />

              {/* Description Panel — bottom of left panel */}
              <div
                className="shrink-0"
                style={{ height: 220 }}
                data-ocid="perform.description_panel"
              >
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-1.5">
                    {descContent ? (
                      <>
                        <p className="text-[11px] font-mono text-muted-foreground/70 uppercase tracking-wider">
                          {descContent.id}
                        </p>
                        <p className="text-xs font-semibold font-heading text-foreground leading-snug">
                          {descContent.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
                          {descContent.text}
                        </p>
                        {descContent.notes && descContent.notes.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDescNotesOpen((v) => !v)}
                              className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 mt-1"
                              data-ocid="perform.description_notes_toggle"
                            >
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 transition-transform",
                                  descNotesOpen && "rotate-180",
                                )}
                              />
                              {descNotesOpen
                                ? "Hide Notes"
                                : `Show Notes (${descContent.notes.length})`}
                            </button>
                            {descNotesOpen && (
                              <div className="space-y-1 pt-1">
                                {descContent.notes.map((note, i) => (
                                  <p
                                    key={note.slice(0, 30)}
                                    className="text-[11px] text-muted-foreground font-body italic leading-snug"
                                  >
                                    <span className="font-semibold not-italic">
                                      Note {i + 1}:
                                    </span>{" "}
                                    {note}
                                  </p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground font-body italic">
                        Select a practice to view its description.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* ── Right Panel ── */}
            <ResizablePanel defaultSize={75} className="min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">{renderRightPanel()}</div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
}
