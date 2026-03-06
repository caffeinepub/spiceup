import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bold,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Italic,
  LayoutDashboard,
  List,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PracticeRating } from "../backend.d";

// ─── Types ─────────────────────────────────────────────────────

type Rating = "N" | "P" | "L" | "F" | "";

interface EvidenceItem {
  description: string;
  link: string;
  version: string;
}

interface SwEntry {
  id: string;
  type: "strength" | "weakness";
  text: string;
}

interface PracticeState {
  rating: Rating;
  swEntries: SwEntry[];
  workProducts: EvidenceItem[];
  // legacy fields kept for backward compat serialization
  strengths?: string;
  weaknesses?: string;
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

const NPLF_COLORS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  N: { bg: "#990000", color: "#fff", border: "#990000" },
  P: { bg: "#ffff00", color: "#000", border: "#d4d400" },
  L: { bg: "#92d050", color: "#000", border: "#7ab840" },
  F: { bg: "#00b04f", color: "#000", border: "#009040" },
};

const RATING_OPTIONS: {
  value: Rating;
  label: string;
}[] = [
  { value: "N", label: "N" },
  { value: "P", label: "P" },
  { value: "L", label: "L" },
  { value: "F", label: "F" },
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
          const level = processLevels[p.id] ?? "2";
          // Exclude processes marked as NA — they are out of scope for assessment
          if (level === "NA") continue;
          result.push({ id: p.id, targetLevel: level });
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
  swEntries: [],
  workProducts: [],
});

function getRatingDotStyle(_rating: Rating): React.CSSProperties {
  return { backgroundColor: "#9ca3af" };
}

function getAggregateDotStyle(_ratings: Rating[]): React.CSSProperties {
  return { backgroundColor: "#9ca3af" };
}

function getRatingBadgeStyle(rating: Rating): React.CSSProperties {
  switch (rating) {
    case "N":
      return {
        backgroundColor: "#990000",
        color: "#fff",
        borderColor: "#990000",
      };
    case "P":
      return {
        backgroundColor: "#ffff00",
        color: "#000",
        borderColor: "#d4d400",
      };
    case "L":
      return {
        backgroundColor: "#92d050",
        color: "#000",
        borderColor: "#7ab840",
      };
    case "F":
      return {
        backgroundColor: "#00b04f",
        color: "#000",
        borderColor: "#009040",
      };
    default:
      return {};
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

/** Simple markdown-like renderer: **bold**, *italic*, • list items */
function renderRichText(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        // Render inline bold/italic
        const parts: React.ReactNode[] = [];
        let remaining = line;
        let ki = 0;
        while (remaining.length > 0) {
          const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
          const italicMatch = remaining.match(/\*([^*]+?)\*/);

          const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
          const italicIdx = italicMatch
            ? remaining.indexOf(italicMatch[0])
            : -1;

          if (boldIdx !== -1 && (italicIdx === -1 || boldIdx <= italicIdx)) {
            if (boldIdx > 0) {
              parts.push(
                <span key={`${li}-t${ki++}`}>
                  {remaining.slice(0, boldIdx)}
                </span>,
              );
            }
            parts.push(<strong key={`${li}-b${ki++}`}>{boldMatch![1]}</strong>);
            remaining = remaining.slice(boldIdx + boldMatch![0].length);
          } else if (italicIdx !== -1) {
            if (italicIdx > 0) {
              parts.push(
                <span key={`${li}-t${ki++}`}>
                  {remaining.slice(0, italicIdx)}
                </span>,
              );
            }
            parts.push(<em key={`${li}-i${ki++}`}>{italicMatch![1]}</em>);
            remaining = remaining.slice(italicIdx + italicMatch![0].length);
          } else {
            parts.push(<span key={`${li}-t${ki++}`}>{remaining}</span>);
            remaining = "";
          }
        }

        const isBullet = line.startsWith("• ");
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: line index is the only stable key for rich text rendering
            key={`line-${li}`}
            className={cn("leading-relaxed", isBullet && "flex gap-1")}
          >
            {isBullet && <span className="shrink-0">•</span>}
            <span>{parts.length > 0 ? parts : " "}</span>
          </div>
        );
      })}
    </>
  );
}

// ─── Rich Text Editor ─────────────────────────────────────────────

function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(prefix: string, suffix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newText =
      value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }

  function insertBullet() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    // Find start of current line
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newText = `${value.slice(0, lineStart)}• ${value.slice(lineStart)}`;
    onChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 2, start + 2);
    }, 0);
  }

  return (
    <div className="space-y-1">
      {!disabled && (
        <div className="flex items-center gap-0.5 p-1 rounded-t-md border border-b-0 border-border/60 bg-muted/30">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              wrapSelection("**", "**");
            }}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Bold (wrap selection)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              wrapSelection("*", "*");
            }}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Italic (wrap selection)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertBullet();
            }}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground/50 ml-1">
            Select text then B/I
          </span>
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={disabled}
        className={cn(
          "font-body text-sm resize-none",
          !disabled && "rounded-t-none border-t-0",
        )}
      />
    </div>
  );
}

// ─── Add / Edit Evidence Dialog ──────────────────────────────────

function EvidenceDialog({
  open,
  onOpenChange,
  initialEvidence,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEvidence?: EvidenceItem & { index: number };
  onSubmit: (item: EvidenceItem, index: number | null) => void;
}) {
  const [description, setDescription] = useState(
    initialEvidence?.description ?? "",
  );
  const [link, setLink] = useState(initialEvidence?.link ?? "");
  const [version, setVersion] = useState(initialEvidence?.version ?? "");

  useEffect(() => {
    if (open) {
      setDescription(initialEvidence?.description ?? "");
      setLink(initialEvidence?.link ?? "");
      setVersion(initialEvidence?.version ?? "");
    }
  }, [open, initialEvidence]);

  function handleSubmit() {
    if (!description.trim()) return;
    onSubmit(
      {
        description: description.trim(),
        link: link.trim(),
        version: version.trim(),
      },
      initialEvidence?.index ?? null,
    );
    onOpenChange(false);
  }

  const isEdit = initialEvidence !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-ocid="perform.evidence_dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">
            {isEdit ? "Edit Work Product" : "Add Work Product"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="ev-description"
              className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ev-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Work product description..."
              rows={3}
              className="font-body text-sm resize-none"
              data-ocid="perform.evidence_description_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="ev-link"
              className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Link (optional)
            </Label>
            <Input
              id="ev-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="font-body text-sm"
              data-ocid="perform.evidence_link_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="ev-version"
              className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Version (optional)
            </Label>
            <Input
              id="ev-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. v1.2, 2024-01, Draft"
              className="font-body text-sm"
              data-ocid="perform.evidence_version_input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-body"
            data-ocid="perform.evidence_dialog_cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="spice-gradient text-white border-0 font-body"
            data-ocid="perform.evidence_dialog_submit_button"
          >
            {isEdit ? "Save Changes" : "Add Work Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / Edit Entry Dialog ──────────────────────────────────────

function AddEntryDialog({
  open,
  onOpenChange,
  initialEntry,
  practiceId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEntry?: SwEntry;
  practiceId: string;
  onSubmit: (entry: SwEntry) => void;
}) {
  const [entryType, setEntryType] = useState<"strength" | "weakness">(
    initialEntry?.type ?? "strength",
  );
  const [text, setText] = useState(initialEntry?.text ?? "");

  // Reset when dialog opens or initialEntry changes
  useEffect(() => {
    if (open) {
      setEntryType(initialEntry?.type ?? "strength");
      setText(initialEntry?.text ?? "");
    }
  }, [open, initialEntry]);

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit({
      id: initialEntry?.id ?? String(Date.now()),
      type: entryType,
      text: text.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-ocid="perform.entry_dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">
            {initialEntry ? "Edit Entry" : "Add Strength / Weakness"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Practice
            </Label>
            <p className="text-sm font-mono text-foreground">{practiceId}</p>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="entry-type"
              className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Type
            </Label>
            <Select
              value={entryType}
              onValueChange={(v) => setEntryType(v as "strength" | "weakness")}
            >
              <SelectTrigger
                id="entry-type"
                className="font-body"
                data-ocid="perform.entry_type_select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strength">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Strength
                  </span>
                </SelectItem>
                <SelectItem value="weakness">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                    Weakness
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </Label>
            <RichTextEditor
              value={text}
              onChange={setText}
              placeholder={
                entryType === "strength"
                  ? "Describe the strength observed..."
                  : "Describe the weakness observed..."
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-body"
            data-ocid="perform.entry_dialog_cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="spice-gradient text-white border-0 font-body"
            data-ocid="perform.entry_dialog_submit_button"
          >
            {initialEntry ? "Save Changes" : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── S&W Entries Table (used for BP view) ────────────────────────
// Bug fix: Dialog state is now lifted to the PerformAssessment main component
// via openDialog callback, preventing blank-page bug caused by child remounts.

function SwEntriesTable({
  entries,
  practiceId,
  onDelete,
  isCompleted,
  openDialog,
  onAddEvidence,
}: {
  entries: SwEntry[];
  practiceId: string;
  onDelete: (id: string) => void;
  isCompleted?: boolean;
  openDialog: (entry?: SwEntry) => void;
  onAddEvidence?: () => void;
}) {
  const strengths = entries.filter((e) => e.type === "strength");
  const weaknesses = entries.filter((e) => e.type === "weakness");

  return (
    <div className="space-y-3">
      {/* Header row with stats and add buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-body text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {strengths.length} Strength{strengths.length !== 1 ? "s" : ""}
            </span>
          </span>
          <span className="text-xs font-body text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {weaknesses.length} Weakness
              {weaknesses.length !== 1 ? "es" : ""}
            </span>
          </span>
        </div>
        {!isCompleted && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => openDialog(undefined)}
              className="spice-gradient text-white border-0 gap-1.5 font-body text-xs h-7 px-3"
              data-ocid="perform.sw_add_button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Entry
            </Button>
            {onAddEvidence && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddEvidence}
                className="font-body text-xs gap-1 h-7 px-3"
                data-ocid="perform.evidence_add_button"
              >
                <Plus className="h-3.5 w-3.5" /> Add Evidence
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table of entries */}
      {entries.length === 0 ? null : (
        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-body text-xs w-[90px]">
                  Type
                </TableHead>
                <TableHead className="font-body text-xs w-[90px]">
                  Practice
                </TableHead>
                <TableHead className="font-body text-xs">Description</TableHead>
                {!isCompleted && (
                  <TableHead className="font-body text-xs w-[80px]">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, idx) => (
                <TableRow
                  key={entry.id}
                  data-ocid={`perform.sw_entry_row.${idx + 1}`}
                  className={cn(
                    "transition-colors border-b border-border/50 last:border-b-0",
                    entry.type === "strength"
                      ? "bg-emerald-50/60 hover:bg-emerald-50 border-l-2 border-l-emerald-300"
                      : "bg-red-50/60 hover:bg-red-50 border-l-2 border-l-red-300",
                  )}
                >
                  <TableCell className="py-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-body text-xs",
                        entry.type === "strength"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200",
                      )}
                    >
                      {entry.type === "strength" ? "Strength" : "Weakness"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                    {practiceId}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="text-xs font-body text-foreground leading-relaxed max-w-md">
                      {renderRichText(entry.text)}
                    </div>
                  </TableCell>
                  {!isCompleted && (
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDialog(entry)}
                          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit"
                          data-ocid={`perform.sw_edit_button.${idx + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry.id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="Delete"
                          data-ocid={`perform.sw_delete_button.${idx + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
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
  disabled,
}: {
  value: Rating;
  onChange: (v: Rating) => void;
  index: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {RATING_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        const nplf = NPLF_COLORS[opt.value];
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === opt.value ? "" : opt.value)}
            className={cn(
              "w-10 h-10 rounded-lg text-sm font-bold font-heading border-2 transition-all",
              !isActive &&
                "bg-background border-border text-muted-foreground hover:bg-muted",
              disabled && "opacity-60 cursor-not-allowed",
            )}
            style={
              isActive
                ? {
                    backgroundColor: nplf.bg,
                    color: nplf.color,
                    borderColor: nplf.border,
                  }
                : undefined
            }
            data-ocid={`perform.practice_rating_button.${index}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── BP Practice Panel (new design) ──────────────────────────────

function BPPracticePanel({
  practice,
  processId,
  state,
  onChange,
  isCompleted,
  openSwDialog,
}: {
  practice: BasePractice | GenericPractice;
  processId: string;
  level?: number;
  state: PracticeState;
  onChange: (patch: Partial<PracticeState>) => void;
  isCompleted?: boolean;
  openSwDialog: (entry?: SwEntry) => void;
}) {
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<
    (EvidenceItem & { index: number }) | undefined
  >(undefined);

  function handleOpenAddEvidence() {
    setEditingEvidence(undefined);
    setEvidenceDialogOpen(true);
  }

  function handleOpenEditEvidence(i: number) {
    setEditingEvidence({ ...state.workProducts[i], index: i });
    setEvidenceDialogOpen(true);
  }

  function handleEvidenceSubmit(item: EvidenceItem, index: number | null) {
    if (index !== null) {
      // Edit existing
      const updated = state.workProducts.map((wp, idx) =>
        idx === index ? item : wp,
      );
      onChange({ workProducts: updated });
    } else {
      // Add new
      onChange({ workProducts: [...state.workProducts, item] });
    }
  }

  function removeEvidence(i: number) {
    onChange({
      workProducts: state.workProducts.filter((_, idx) => idx !== i),
    });
  }

  function deleteSwEntry(id: string) {
    onChange({
      swEntries: (state.swEntries ?? []).filter((e) => e.id !== id),
    });
  }

  const practiceLabel = `${processId} ${practice.id}`;

  return (
    <div className="space-y-5">
      {/* Rating row */}
      <div className="flex items-center justify-end gap-4 pb-3 border-b border-border/40">
        <RatingSelector
          value={state.rating}
          onChange={(v) => onChange({ rating: v })}
          index={1}
          disabled={isCompleted}
        />
      </div>

      {/* S&W Entries Table */}
      <div className="space-y-2">
        <SwEntriesTable
          entries={state.swEntries ?? []}
          practiceId={practiceLabel}
          onDelete={deleteSwEntry}
          isCompleted={isCompleted}
          openDialog={openSwDialog}
          onAddEvidence={!isCompleted ? handleOpenAddEvidence : undefined}
        />
      </div>

      {/* Work Products Inspected */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Work Products Inspected
          </Label>
          {!isCompleted && state.workProducts.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAddEvidence}
              className="font-body text-xs gap-1 h-7 px-3"
              data-ocid="perform.evidence_add_inline_button"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>

        {state.workProducts.length > 0 && (
          <div className="rounded-md border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-body text-xs">
                    Description
                  </TableHead>
                  <TableHead className="font-body text-xs w-[160px]">
                    Link
                  </TableHead>
                  <TableHead className="font-body text-xs w-[90px]">
                    Version
                  </TableHead>
                  {!isCompleted && (
                    <TableHead className="font-body text-xs w-[80px]">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.workProducts.map((ev, i) => (
                  <TableRow
                    // biome-ignore lint/suspicious/noArrayIndexKey: evidence items have no stable IDs
                    key={`wp-row-${i}`}
                    data-ocid={`perform.evidence_row.${i + 1}`}
                    className="border-b border-border/50 last:border-b-0"
                  >
                    <TableCell className="py-2 font-body text-xs text-foreground">
                      {ev.description}
                    </TableCell>
                    <TableCell className="py-2">
                      {ev.link ? (
                        <a
                          href={ev.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-body text-xs truncate block max-w-[150px]"
                        >
                          {ev.link}
                        </a>
                      ) : (
                        <span className="text-muted-foreground font-body text-xs">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 font-body text-xs text-muted-foreground">
                      {ev.version || "—"}
                    </TableCell>
                    {!isCompleted && (
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvidence(i)}
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit"
                            data-ocid={`perform.evidence_edit_button.${i + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEvidence(i)}
                            className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Delete"
                            data-ocid={`perform.evidence_remove_button.${i + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Evidence Dialog */}
      <EvidenceDialog
        open={evidenceDialogOpen}
        onOpenChange={setEvidenceDialogOpen}
        initialEvidence={editingEvidence}
        onSubmit={handleEvidenceSubmit}
      />
    </div>
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
  dotStyle?: React.CSSProperties;
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
  ratings,
}: {
  node: TreeNodeData;
  depth: number;
  selected: SelectedNode | null;
  expandedNodes: Set<string>;
  onSelect: (n: SelectedNode) => void;
  onToggle: (key: string) => void;
  index: number;
  ratings: RatingsMap;
}) {
  const nodeKey = `${node.type}:${node.processId}:${node.id}`;
  const isExpanded = expandedNodes.has(nodeKey);
  const isLeaf = !node.children || node.children.length === 0;
  const isSelected =
    selected?.type === node.type &&
    selected?.id === node.id &&
    selected?.processId === node.processId;

  const paddingLeft = 8 + depth * 14;

  // Compute the rating letter to show on the right badge
  let nodeRating: Rating = "";
  if (node.type === "process") {
    nodeRating =
      (ratings[`${node.processId}_0_${node.processId}`]?.rating as Rating) ??
      "";
  } else if (node.type === "pa") {
    nodeRating =
      (ratings[`${node.processId}_5_${node.id}`]?.rating as Rating) ?? "";
  } else if (node.type === "bp") {
    nodeRating =
      (ratings[`${node.processId}_1_${node.id}`]?.rating as Rating) ?? "";
  } else if (node.type === "gp") {
    const lvl = node.level ?? 2;
    nodeRating =
      (ratings[`${node.processId}_${lvl}_${node.id}`]?.rating as Rating) ?? "";
  }

  const nplf = nodeRating ? NPLF_COLORS[nodeRating] : null;

  function handleLabelClick() {
    onSelect({
      type: node.type,
      id: node.id,
      processId: node.processId,
      level: node.level,
      paId: node.paId,
    });
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggle(nodeKey);
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
      <div
        className={cn(
          "w-full flex items-center gap-0.5 py-0.5 rounded-sm group overflow-hidden",
        )}
        style={{ paddingLeft }}
      >
        {/* Expand/collapse chevron — separate click target */}
        {!isLeaf ? (
          <button
            type="button"
            onClick={handleChevronClick}
            className="p-0.5 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Label button — clicking only SELECTS, does NOT toggle expand */}
        <button
          type="button"
          onClick={handleLabelClick}
          data-ocid={ocidMap[node.type]}
          className={cn(
            "flex-1 min-w-0 flex items-center gap-1.5 py-1 pr-1 rounded-sm text-sm transition-colors text-left overflow-hidden",
            isSelected
              ? "bg-accent/15 text-accent font-medium"
              : "text-foreground hover:bg-muted/70",
            node.type === "process" && "font-semibold",
          )}
        >
          {/* Status dot */}
          {node.dotStyle && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={node.dotStyle}
            />
          )}

          {/* Label text — truncates to make room for rating badge */}
          <span className="truncate font-body text-xs leading-snug min-w-0 flex-1">
            {node.label}
            {node.sublabel && (
              <span className="text-muted-foreground font-normal ml-1 text-[11px]">
                {node.sublabel}
              </span>
            )}
          </span>

          {/* Rating badge — always visible at far right, never hidden */}
          {nodeRating && nplf ? (
            <span
              className="ml-auto shrink-0 min-w-[20px] h-[18px] text-[10px] font-bold rounded px-1 flex items-center justify-center"
              style={{ backgroundColor: nplf.bg, color: nplf.color }}
            >
              {nodeRating}
            </span>
          ) : (
            <span className="ml-auto shrink-0 min-w-[20px] h-[18px]" />
          )}
        </button>
      </div>

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
              ratings={ratings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PA Summary View (Consolidated S&W list) ─────────────────────

function PASummaryView({
  paId,
  processId,
  ratings,
  onEdit,
  isCompleted,
  onRatingChange,
}: {
  paId: string;
  processId: string;
  ratings: RatingsMap;
  onEdit: (practiceId: string, level: number, entry: SwEntry) => void;
  isCompleted?: boolean;
  onRatingChange?: (rating: Rating) => void;
}) {
  const [filter, setFilter] = useState<"all" | "strengths" | "weaknesses">(
    "all",
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<{
    entry: SwEntry;
    practiceId: string;
    level: number;
  } | null>(null);

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

  // Collect ALL S&W entries from all practices under this PA
  const allEntries = useMemo(() => {
    const result: Array<{
      entry: SwEntry;
      practiceId: string;
      rating: Rating;
      level: number;
    }> = [];
    for (const { practice, level } of practices) {
      const key = `${processId}_${level}_${practice.id}`;
      const state = ratings[key] ?? defaultPracticeState();
      const entries = state.swEntries ?? [];
      // Also convert legacy strings to virtual entries for display
      const legacyStrengths: SwEntry[] = [];
      const legacyWeaknesses: SwEntry[] = [];
      if (
        entries.length === 0 &&
        (state.strengths?.trim() || state.weaknesses?.trim())
      ) {
        if (state.strengths?.trim()) {
          legacyStrengths.push({
            id: `legacy-s-${practice.id}`,
            type: "strength",
            text: state.strengths,
          });
        }
        if (state.weaknesses?.trim()) {
          legacyWeaknesses.push({
            id: `legacy-w-${practice.id}`,
            type: "weakness",
            text: state.weaknesses,
          });
        }
      }
      const allForPractice =
        entries.length > 0
          ? entries
          : [...legacyStrengths, ...legacyWeaknesses];
      for (const entry of allForPractice) {
        result.push({
          entry,
          practiceId: practice.id,
          rating: state.rating,
          level,
        });
      }
    }
    return result;
  }, [practices, processId, ratings]);

  const strengthsCount = allEntries.filter(
    (e) => e.entry.type === "strength",
  ).length;
  const weaknessesCount = allEntries.filter(
    (e) => e.entry.type === "weakness",
  ).length;

  const filtered = allEntries.filter((e) => {
    if (filter === "strengths") return e.entry.type === "strength";
    if (filter === "weaknesses") return e.entry.type === "weakness";
    return true;
  });

  function openEditEntry(entry: SwEntry, practiceId: string, level: number) {
    setEditingMeta({ entry, practiceId, level });
    setEditDialogOpen(true);
  }

  function handleEditSubmit(updated: SwEntry) {
    if (!editingMeta) return;
    onEdit(editingMeta.practiceId, editingMeta.level, updated);
  }

  // PA-level rating stored at level 5, practiceId = paId
  const paRatingKey = `${processId}_5_${paId}`;
  const paLevelRating: Rating = (ratings[paRatingKey]?.rating as Rating) ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold font-heading text-foreground">
              <span className="font-bold">{paId}</span>
              {PA_LABELS[paId] ? ` — ${PA_LABELS[paId]}` : ""}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {processId} — Consolidated Strengths & Weaknesses
          </p>
        </div>
        {onRatingChange && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-body text-muted-foreground whitespace-nowrap">
              PA Rating:
            </span>
            <RatingSelector
              value={paLevelRating}
              onChange={onRatingChange}
              index={0}
              disabled={isCompleted}
            />
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="h-8">
          <TabsTrigger
            value="all"
            className="font-body text-xs h-6 px-3"
            data-ocid="perform.pa_sw_filter_all_tab"
          >
            All ({allEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="strengths"
            className="font-body text-xs h-6 px-3"
            data-ocid="perform.pa_sw_filter_strengths_tab"
          >
            Strengths ({strengthsCount})
          </TabsTrigger>
          <TabsTrigger
            value="weaknesses"
            className="font-body text-xs h-6 px-3"
            data-ocid="perform.pa_sw_filter_weaknesses_tab"
          >
            Weaknesses ({weaknessesCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-3">
          {filtered.length === 0 ? (
            <div
              className="rounded-md border border-dashed border-border/60 py-10 text-center"
              data-ocid="perform.pa_sw_empty_state"
            >
              <p className="text-sm text-muted-foreground font-body italic">
                {allEntries.length === 0
                  ? "No strengths or weaknesses recorded for this PA level yet."
                  : "No entries match this filter."}
              </p>
              <p className="text-xs text-muted-foreground font-body mt-1">
                Select individual Base Practices or Generic Practices from the
                tree to add entries.
              </p>
            </div>
          ) : (
            <div
              className="rounded-md border border-border/60 overflow-hidden"
              data-ocid="perform.pa_sw_table"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-body text-xs w-[90px]">
                      Practice
                    </TableHead>
                    <TableHead className="font-body text-xs w-[70px]">
                      Rating
                    </TableHead>
                    <TableHead className="font-body text-xs w-[90px]">
                      Type
                    </TableHead>
                    <TableHead className="font-body text-xs">
                      Description
                    </TableHead>
                    {!isCompleted && (
                      <TableHead className="font-body text-xs w-[80px]">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(({ entry, practiceId, rating, level }, idx) => (
                    <TableRow
                      key={`${practiceId}-${entry.id}`}
                      data-ocid={`perform.pa_sw_row.${idx + 1}`}
                      className={cn(
                        "transition-colors",
                        entry.type === "strength"
                          ? "bg-emerald-50/50 hover:bg-emerald-50 border-l-2 border-l-emerald-300"
                          : "bg-red-50/50 hover:bg-red-50 border-l-2 border-l-red-300",
                      )}
                    >
                      <TableCell className="font-mono text-xs py-2 text-muted-foreground">
                        {practiceId}
                      </TableCell>
                      <TableCell className="py-2">
                        {rating ? (
                          <Badge
                            variant="outline"
                            className="font-body text-xs"
                            style={getRatingBadgeStyle(rating)}
                          >
                            {rating}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-body text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-body text-xs",
                            entry.type === "strength"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200",
                          )}
                        >
                          {entry.type === "strength" ? "Strength" : "Weakness"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 max-w-xs">
                        <div className="text-xs font-body text-foreground leading-relaxed">
                          {renderRichText(entry.text)}
                        </div>
                      </TableCell>
                      {!isCompleted && (
                        <TableCell className="py-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditEntry(entry, practiceId, level)
                            }
                            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit"
                            data-ocid={`perform.pa_sw_edit_button.${idx + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingMeta && (
        <AddEntryDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialEntry={editingMeta.entry}
          practiceId={`${processId} ${editingMeta.practiceId}`}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}

// ─── Process Overview View ────────────────────────────────────────

function ProcessOverviewView({
  processId,
  processInfo,
  ratings,
  isCompleted,
  onEdit,
  onRatingChange,
}: {
  processId: string;
  processInfo: { targetLevel: string };
  ratings: RatingsMap;
  isCompleted?: boolean;
  onEdit: (practiceId: string, level: number, entry: SwEntry) => void;
  onRatingChange: (rating: Rating) => void;
}) {
  const [filter, setFilter] = useState<"all" | "strengths" | "weaknesses">(
    "all",
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<{
    entry: SwEntry;
    practiceId: string;
    level: number;
  } | null>(null);

  const targetLevel =
    processInfo.targetLevel === "NA"
      ? 0
      : Number.parseInt(processInfo.targetLevel, 10);
  const processName = getProcessName(processId);

  // Process-level rating key: `${processId}_0_${processId}`
  const processRatingKey = `${processId}_0_${processId}`;
  const processLevelRating: Rating =
    (ratings[processRatingKey]?.rating as Rating) ?? "";

  // Collect ALL S&W entries across all PAs for this process
  const allEntries = useMemo(() => {
    const result: Array<{
      entry: SwEntry;
      practiceId: string;
      rating: Rating;
      level: number;
    }> = [];

    // PA1.1 — Base Practices
    if (targetLevel >= 1) {
      const bps = BASE_PRACTICES[processId] ?? [];
      for (const bp of bps) {
        const key = `${processId}_1_${bp.id}`;
        const state = ratings[key] ?? defaultPracticeState();
        const entries = state.swEntries ?? [];
        const legacyStrengths: SwEntry[] = [];
        const legacyWeaknesses: SwEntry[] = [];
        if (
          entries.length === 0 &&
          (state.strengths?.trim() || state.weaknesses?.trim())
        ) {
          if (state.strengths?.trim()) {
            legacyStrengths.push({
              id: `legacy-s-${bp.id}`,
              type: "strength",
              text: state.strengths,
            });
          }
          if (state.weaknesses?.trim()) {
            legacyWeaknesses.push({
              id: `legacy-w-${bp.id}`,
              type: "weakness",
              text: state.weaknesses,
            });
          }
        }
        const allForPractice =
          entries.length > 0
            ? entries
            : [...legacyStrengths, ...legacyWeaknesses];
        for (const entry of allForPractice) {
          result.push({
            entry,
            practiceId: bp.id,
            rating: state.rating,
            level: 1,
          });
        }
      }
    }

    // PA2.x — Level 2 Generic Practices
    if (targetLevel >= 2) {
      for (const attr of LEVEL2_ATTRIBUTES) {
        for (const gp of attr.practices) {
          const key = `${processId}_2_${gp.id}`;
          const state = ratings[key] ?? defaultPracticeState();
          const entries = state.swEntries ?? [];
          const legacyStrengths: SwEntry[] = [];
          const legacyWeaknesses: SwEntry[] = [];
          if (
            entries.length === 0 &&
            (state.strengths?.trim() || state.weaknesses?.trim())
          ) {
            if (state.strengths?.trim()) {
              legacyStrengths.push({
                id: `legacy-s-${gp.id}`,
                type: "strength",
                text: state.strengths,
              });
            }
            if (state.weaknesses?.trim()) {
              legacyWeaknesses.push({
                id: `legacy-w-${gp.id}`,
                type: "weakness",
                text: state.weaknesses,
              });
            }
          }
          const allForPractice =
            entries.length > 0
              ? entries
              : [...legacyStrengths, ...legacyWeaknesses];
          for (const entry of allForPractice) {
            result.push({
              entry,
              practiceId: gp.id,
              rating: state.rating,
              level: 2,
            });
          }
        }
      }
    }

    // PA3.x — Level 3 Generic Practices
    if (targetLevel >= 3) {
      for (const attr of LEVEL3_ATTRIBUTES) {
        for (const gp of attr.practices) {
          const key = `${processId}_3_${gp.id}`;
          const state = ratings[key] ?? defaultPracticeState();
          const entries = state.swEntries ?? [];
          const legacyStrengths: SwEntry[] = [];
          const legacyWeaknesses: SwEntry[] = [];
          if (
            entries.length === 0 &&
            (state.strengths?.trim() || state.weaknesses?.trim())
          ) {
            if (state.strengths?.trim()) {
              legacyStrengths.push({
                id: `legacy-s-${gp.id}`,
                type: "strength",
                text: state.strengths,
              });
            }
            if (state.weaknesses?.trim()) {
              legacyWeaknesses.push({
                id: `legacy-w-${gp.id}`,
                type: "weakness",
                text: state.weaknesses,
              });
            }
          }
          const allForPractice =
            entries.length > 0
              ? entries
              : [...legacyStrengths, ...legacyWeaknesses];
          for (const entry of allForPractice) {
            result.push({
              entry,
              practiceId: gp.id,
              rating: state.rating,
              level: 3,
            });
          }
        }
      }
    }

    return result;
  }, [processId, ratings, targetLevel]);

  const strengthsCount = allEntries.filter(
    (e) => e.entry.type === "strength",
  ).length;
  const weaknessesCount = allEntries.filter(
    (e) => e.entry.type === "weakness",
  ).length;

  const filtered = allEntries.filter((e) => {
    if (filter === "strengths") return e.entry.type === "strength";
    if (filter === "weaknesses") return e.entry.type === "weakness";
    return true;
  });

  function openEditEntry(entry: SwEntry, practiceId: string, level: number) {
    setEditingMeta({ entry, practiceId, level });
    setEditDialogOpen(true);
  }

  function handleEditSubmit(updated: SwEntry) {
    if (!editingMeta) return;
    onEdit(editingMeta.practiceId, editingMeta.level, updated);
  }

  return (
    <div className="space-y-4">
      {/* Compact process header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-bold font-heading text-foreground">
            {processId}
          </span>
          <span className="text-xs text-muted-foreground font-body ml-2">
            {processName}
          </span>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Target Level:{" "}
            <span className="font-semibold">{processInfo.targetLevel}</span>
          </p>
        </div>
        {targetLevel !== 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-body text-muted-foreground">
              Rating:
            </span>
            <RatingSelector
              value={processLevelRating}
              onChange={onRatingChange}
              index={0}
              disabled={isCompleted}
            />
          </div>
        )}
      </div>

      {targetLevel === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground font-body text-xs">
              This process is excluded from assessment (Target Level: NA).
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Consolidated S&W summary */}
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
          >
            <TabsList className="h-8">
              <TabsTrigger
                value="all"
                className="font-body text-xs h-6 px-3"
                data-ocid="perform.process_sw_filter_all_tab"
              >
                All ({allEntries.length})
              </TabsTrigger>
              <TabsTrigger
                value="strengths"
                className="font-body text-xs h-6 px-3"
                data-ocid="perform.process_sw_filter_strengths_tab"
              >
                Strengths ({strengthsCount})
              </TabsTrigger>
              <TabsTrigger
                value="weaknesses"
                className="font-body text-xs h-6 px-3"
                data-ocid="perform.process_sw_filter_weaknesses_tab"
              >
                Weaknesses ({weaknessesCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-3">
              {filtered.length === 0 ? (
                <div
                  className="rounded-md border border-dashed border-border/60 py-10 text-center"
                  data-ocid="perform.process_sw_empty_state"
                >
                  <p className="text-xs text-muted-foreground font-body italic">
                    {allEntries.length === 0
                      ? "No strengths or weaknesses recorded for this process yet."
                      : "No entries match this filter."}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-1">
                    Select individual Base Practices or Generic Practices from
                    the tree to add entries.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-md border border-border/60 overflow-hidden"
                  data-ocid="perform.process_sw_table"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-body text-xs w-[90px]">
                          Practice
                        </TableHead>
                        <TableHead className="font-body text-xs w-[70px]">
                          Rating
                        </TableHead>
                        <TableHead className="font-body text-xs w-[90px]">
                          Type
                        </TableHead>
                        <TableHead className="font-body text-xs">
                          Description
                        </TableHead>
                        {!isCompleted && (
                          <TableHead className="font-body text-xs w-[80px]">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(
                        ({ entry, practiceId, rating, level }, idx) => (
                          <TableRow
                            key={`${practiceId}-${entry.id}`}
                            data-ocid={`perform.process_sw_row.${idx + 1}`}
                            className={cn(
                              "transition-colors",
                              entry.type === "strength"
                                ? "bg-emerald-50/50 hover:bg-emerald-50 border-l-2 border-l-emerald-300"
                                : "bg-red-50/50 hover:bg-red-50 border-l-2 border-l-red-300",
                            )}
                          >
                            <TableCell className="font-mono text-xs py-2 text-muted-foreground">
                              {practiceId}
                            </TableCell>
                            <TableCell className="py-2">
                              {rating ? (
                                <Badge
                                  variant="outline"
                                  className="font-body text-xs"
                                  style={getRatingBadgeStyle(rating)}
                                >
                                  {rating}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground font-body text-xs">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-body text-xs",
                                  entry.type === "strength"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-red-50 text-red-700 border-red-200",
                                )}
                              >
                                {entry.type === "strength"
                                  ? "Strength"
                                  : "Weakness"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 max-w-xs">
                              <div className="text-xs font-body text-foreground leading-relaxed">
                                {renderRichText(entry.text)}
                              </div>
                            </TableCell>
                            {!isCompleted && (
                              <TableCell className="py-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditEntry(entry, practiceId, level)
                                  }
                                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  title="Edit"
                                  data-ocid={`perform.process_sw_edit_button.${idx + 1}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </TableCell>
                            )}
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {editingMeta && (
        <AddEntryDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialEntry={editingMeta.entry}
          practiceId={`${processId} ${editingMeta.practiceId}`}
          onSubmit={handleEditSubmit}
        />
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
        <h2 className="text-sm font-semibold font-heading text-foreground">
          ASPICE — Automotive SPICE v4.0
        </h2>
        <p className="text-xs text-muted-foreground font-body">
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

// ─── BPGPRightPanel — stable named component to avoid remount on re-render ───

function BPGPRightPanel({
  selectedNode,
  isCompleted,
  getPracticeState,
  updatePracticeState,
  onSelectProcess,
  onSelectPA,
  openSwDialog,
}: {
  selectedNode: SelectedNode;
  enabledProcesses: Array<{ id: string; targetLevel: string }>;
  ratings: RatingsMap;
  isCompleted: boolean;
  getPracticeState: (
    processId: string,
    level: number,
    practiceId: string,
  ) => PracticeState;
  updatePracticeState: (
    processId: string,
    level: number,
    practiceId: string,
    patch: Partial<PracticeState>,
  ) => void;
  onSelectProcess: (processId: string) => void;
  onSelectPA: (paId: string, processId: string) => void;
  openSwDialog: (entry?: SwEntry) => void;
}) {
  const level = selectedNode.level ?? 1;
  const practiceId = selectedNode.id;
  const processId = selectedNode.processId;
  const paId = selectedNode.paId ?? "PA1.1";

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

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs font-body text-muted-foreground flex-wrap">
        <button
          type="button"
          className="hover:text-foreground transition-colors"
          onClick={() => onSelectProcess(processId)}
        >
          {processId}
        </button>
        <ChevronRight className="h-3 w-3" />
        <button
          type="button"
          className="hover:text-foreground transition-colors"
          onClick={() => onSelectPA(paId, processId)}
        >
          {paId}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{practiceId}</span>
      </nav>

      <BPPracticePanel
        practice={practice}
        processId={processId}
        level={level}
        state={getPracticeState(processId, level, practiceId)}
        onChange={(patch) =>
          updatePracticeState(processId, level, practiceId, patch)
        }
        isCompleted={isCompleted}
        openSwDialog={openSwDialog}
      />
    </div>
  );
}

// ─── Module-level helper (stable, no closure over component state) ───────────

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

// ─── Main Component ──────────────────────────────────────────────

export function PerformAssessment() {
  const { currentAssessmentId, navigateTo } = useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: processConfig, isLoading: loadingConfig } =
    useGetProcessGroupConfig(currentAssessmentId);
  const { data: savedRatings, isLoading: loadingRatings } =
    useGetAllPracticeRatingsForAssessment(currentAssessmentId);
  const savePracticeRating = useSavePracticeRating();

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [ratings, setRatings] = useState<RatingsMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [descNotesOpen, setDescNotesOpen] = useState(false);

  // ─── Bug Fix 1: Lift AddEntryDialog state here so it survives child remounts ───
  const [swDialogOpen, setSwDialogOpen] = useState(false);
  const [swDialogEntry, setSwDialogEntry] = useState<SwEntry | undefined>();
  const [swDialogPracticeKey, setSwDialogPracticeKey] = useState<{
    processId: string;
    level: number;
    practiceId: string;
  } | null>(null);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const isCompleted = currentAssessment?.status === "Completed";

  // ─── KEY FIX: Memoize enabledProcesses so its reference is stable across renders.
  // Without useMemo, buildEnabledProcesses returns a new array every render,
  // which triggers the useEffect below on every re-render (e.g. every state update),
  // resetting expandedNodes and collapsing the tree each time the user interacts.
  const enabledProcesses = useMemo(
    () => buildEnabledProcesses(processConfig ?? null),
    [processConfig],
  );

  // ─── Tree expand/collapse logic ───────────────────────────────────────────
  // Use a ref to store the toggle function so TreeNode always gets the latest
  // version without needing to be re-rendered.
  const expandedNodesRef = useRef<Set<string>>(new Set());
  expandedNodesRef.current = expandedNodes;

  const toggleNode = useCallback((key: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []); // stable — only uses setExpandedNodes functional form

  // Default: expand all process and PA nodes on first load
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (enabledProcesses.length === 0) return;
    if (hasInitialized.current) return; // only run once
    hasInitialized.current = true;
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
        let swEntries: SwEntry[] = [];
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
            // Load swEntries if stored
            if (Array.isArray(p.swEntries)) {
              swEntries = p.swEntries as SwEntry[];
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
          swEntries,
          workProducts,
          // keep legacy for backward compat in serialization
          strengths: r.strengths,
          weaknesses: r.weaknesses,
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

  // Edit a single SwEntry within a practice (used from PA summary view)
  function editSwEntryForPractice(
    processId: string,
    level: number,
    practiceId: string,
    updated: SwEntry,
  ) {
    const key = getRatingKey(processId, level, practiceId);
    setRatings((prev) => {
      const existing = prev[key] ?? defaultPracticeState();
      return {
        ...prev,
        [key]: {
          ...existing,
          swEntries: (existing.swEntries ?? []).map((e) =>
            e.id === updated.id ? updated : e,
          ),
        },
      };
    });
  }

  // ─── Stable openSwDialog callback (Bug Fix 1 continued) ──────────────────
  // This callback is passed deep into tree; using useCallback ensures stability.
  const openSwDialog = useCallback(
    (processId: string, level: number, practiceId: string, entry?: SwEntry) => {
      setSwDialogEntry(entry);
      setSwDialogPracticeKey({ processId, level, practiceId });
      setSwDialogOpen(true);
    },
    [],
  );

  // Handler for dialog submission — runs at top level, no child remount risk
  function handleSwDialogSubmit(entry: SwEntry) {
    if (!swDialogPracticeKey) return;
    const { processId, level, practiceId } = swDialogPracticeKey;
    const key = getRatingKey(processId, level, practiceId);
    setRatings((prev) => {
      const existing = prev[key] ?? defaultPracticeState();
      const existingEntries = existing.swEntries ?? [];
      const isEdit = existingEntries.some((e) => e.id === entry.id);
      return {
        ...prev,
        [key]: {
          ...existing,
          swEntries: isEdit
            ? existingEntries.map((e) => (e.id === entry.id ? entry : e))
            : [...existingEntries, entry],
        },
      };
    });
    setSwDialogOpen(false);
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

      // Serialize swEntries to strengths/weaknesses for backend + keep in workProductsInspected
      function serializeState(state: PracticeState) {
        const strengths = (state.swEntries ?? [])
          .filter((e) => e.type === "strength")
          .map((e) => e.text)
          .join("\n");
        const weaknesses = (state.swEntries ?? [])
          .filter((e) => e.type === "weakness")
          .map((e) => e.text)
          .join("\n");
        return {
          strengths: strengths || state.strengths || "",
          weaknesses: weaknesses || state.weaknesses || "",
          workProductsInspected: JSON.stringify({
            workProducts: state.workProducts,
            swEntries: state.swEntries ?? [],
          }),
        };
      }

      if (targetLevel >= 1) {
        const bps = BASE_PRACTICES[processId] ?? [];
        for (const bp of bps) {
          const state = getState(processId, 1, bp.id);
          if (state.rating || (state.swEntries ?? []).length > 0) {
            const serialized = serializeState(state);
            savePromises.push(
              savePracticeRating.mutateAsync({
                assessmentId: currentAssessmentId,
                processId,
                level: BigInt(1),
                practiceId: bp.id,
                rating: state.rating,
                strengths: serialized.strengths,
                weaknesses: serialized.weaknesses,
                workProductsInspected: serialized.workProductsInspected,
              }),
            );
          }
        }
      }

      if (targetLevel >= 2) {
        for (const attr of LEVEL2_ATTRIBUTES) {
          for (const gp of attr.practices) {
            const state = getState(processId, 2, gp.id);
            if (state.rating || (state.swEntries ?? []).length > 0) {
              const serialized = serializeState(state);
              savePromises.push(
                savePracticeRating.mutateAsync({
                  assessmentId: currentAssessmentId,
                  processId,
                  level: BigInt(2),
                  practiceId: gp.id,
                  rating: state.rating,
                  strengths: serialized.strengths,
                  weaknesses: serialized.weaknesses,
                  workProductsInspected: serialized.workProductsInspected,
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
            if (state.rating || (state.swEntries ?? []).length > 0) {
              const serialized = serializeState(state);
              savePromises.push(
                savePracticeRating.mutateAsync({
                  assessmentId: currentAssessmentId,
                  processId,
                  level: BigInt(3),
                  practiceId: gp.id,
                  rating: state.rating,
                  strengths: serialized.strengths,
                  weaknesses: serialized.weaknesses,
                  workProductsInspected: serialized.workProductsInspected,
                }),
              );
            }
          }
        }
      }

      // Save process-level rating (level 0, practiceId = processId)
      const processLevelState = getState(processId, 0, processId);
      if (
        processLevelState.rating ||
        (processLevelState.swEntries ?? []).length > 0
      ) {
        const serialized = serializeState(processLevelState);
        savePromises.push(
          savePracticeRating.mutateAsync({
            assessmentId: currentAssessmentId,
            processId,
            level: BigInt(0),
            practiceId: processId,
            rating: processLevelState.rating,
            strengths: serialized.strengths,
            weaknesses: serialized.weaknesses,
            workProductsInspected: serialized.workProductsInspected,
          }),
        );
      }

      // Save PA-level ratings (level 5, practiceId = paId)
      const pas = buildPAList(targetLevel);
      for (const paId of pas) {
        const paLevelState = getState(processId, 5, paId);
        if (paLevelState.rating) {
          const serialized = serializeState(paLevelState);
          savePromises.push(
            savePracticeRating.mutateAsync({
              assessmentId: currentAssessmentId,
              processId,
              level: BigInt(5),
              practiceId: paId,
              rating: paLevelState.rating,
              strengths: serialized.strengths,
              weaknesses: serialized.weaknesses,
              workProductsInspected: serialized.workProductsInspected,
            }),
          );
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

  // ─── Tree building ───────────────────────────────────────────
  // buildPAList is defined at module level above the component.

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
        dotStyle: getRatingDotStyle(
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
      dotStyle: getRatingDotStyle(
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
          dotStyle: getAggregateDotStyle(leafRatings),
          children: buildLeafNodes(proc.id, paId),
        };
      });

      return {
        type: "process" as const,
        id: proc.id,
        label: proc.id,
        sublabel: getProcessName(proc.id),
        processId: proc.id,
        dotStyle: getAggregateDotStyle(allRatings),
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

  // expandAll/collapseAll — use a ref to treeData so they stay stable
  const treeDataRef = useRef<TreeNodeData>(treeData);
  treeDataRef.current = treeData;

  const expandAll = useCallback(() => {
    const keys = new Set<string>();
    function collect(node: TreeNodeData) {
      if (node.children && node.children.length > 0) {
        keys.add(`${node.type}:${node.processId}:${node.id}`);
        for (const c of node.children) collect(c);
      }
    }
    collect(treeDataRef.current);
    setExpandedNodes(keys);
  }, []); // stable — reads treeData via ref

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

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

  // Build openSwDialog callback for the currently selected BP/GP node
  // This is a stable wrapper that captures the current selected node context
  const currentBpGpOpenDialog = (entry?: SwEntry) => {
    if (
      !selectedNode ||
      (selectedNode.type !== "bp" && selectedNode.type !== "gp")
    )
      return;
    openSwDialog(
      selectedNode.processId,
      selectedNode.level ?? 1,
      selectedNode.id,
      entry,
    );
  };

  return (
    <div
      className="page-enter flex flex-col"
      style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}
    >
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 pb-3 shrink-0">
        <h1 className="text-xl font-bold font-heading text-foreground leading-tight">
          Perform Assessment
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {currentAssessment && (
            <StatusBadge status={currentAssessment.status} />
          )}
          {!isCompleted && (
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="spice-gradient text-white border-0 gap-1.5"
              data-ocid="perform.save_button"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
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
        /* ── Three-panel layout with draggable divider ── */
        <DraggableThreePanelLayout
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          setDescNotesOpen={setDescNotesOpen}
          toggleNode={toggleNode}
          expandAll={expandAll}
          collapseAll={collapseAll}
          treeData={treeData}
          expandedNodes={expandedNodes}
          descContent={descContent}
          descNotesOpen={descNotesOpen}
          enabledProcesses={enabledProcesses}
          ratings={ratings}
          isCompleted={!!isCompleted}
          getPracticeState={getPracticeState}
          updatePracticeState={updatePracticeState}
          editSwEntryForPractice={editSwEntryForPractice}
          currentBpGpOpenDialog={currentBpGpOpenDialog}
        />
      )}

      {/* Bug Fix 1: AddEntryDialog rendered at top level, outside child panels */}
      {swDialogPracticeKey && (
        <AddEntryDialog
          open={swDialogOpen}
          onOpenChange={setSwDialogOpen}
          initialEntry={swDialogEntry}
          practiceId={`${swDialogPracticeKey.processId} ${swDialogPracticeKey.practiceId}`}
          onSubmit={handleSwDialogSubmit}
        />
      )}
    </div>
  );
}

// ─── DraggableThreePanelLayout — Bug Fix 3: draggable resize divider ──────────

interface DescContent {
  id: string;
  title: string;
  text: string;
  notes?: string[];
}

function DraggableThreePanelLayout({
  selectedNode,
  setSelectedNode,
  setDescNotesOpen,
  toggleNode,
  expandAll,
  collapseAll,
  treeData,
  expandedNodes,
  descContent,
  descNotesOpen,
  enabledProcesses,
  ratings,
  isCompleted,
  getPracticeState,
  updatePracticeState,
  editSwEntryForPractice,
  currentBpGpOpenDialog,
}: {
  selectedNode: SelectedNode | null;
  setSelectedNode: (n: SelectedNode) => void;
  setDescNotesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleNode: (key: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  treeData: TreeNodeData;
  expandedNodes: Set<string>;
  descContent: DescContent | null;
  descNotesOpen: boolean;
  enabledProcesses: Array<{ id: string; targetLevel: string }>;
  ratings: RatingsMap;
  isCompleted: boolean;
  getPracticeState: (
    processId: string,
    level: number,
    practiceId: string,
  ) => PracticeState;
  updatePracticeState: (
    processId: string,
    level: number,
    practiceId: string,
    patch: Partial<PracticeState>,
  ) => void;
  editSwEntryForPractice: (
    processId: string,
    level: number,
    practiceId: string,
    updated: SwEntry,
  ) => void;
  currentBpGpOpenDialog: (entry?: SwEntry) => void;
}) {
  // Bug Fix 3: Draggable panel width state
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const onMove = (me: MouseEvent) => {
      const newWidth = Math.max(
        180,
        Math.min(500, startWidth + (me.clientX - startX)),
      );
      setLeftPanelWidth(newWidth);
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        userSelect: isDragging ? "none" : undefined,
      }}
    >
      {/* ── Left Panel (resizable) ── */}
      <div
        style={{
          width: leftPanelWidth,
          minWidth: 180,
          maxWidth: 500,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "3px solid var(--border)",
          overflow: "hidden",
          alignSelf: "stretch",
        }}
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
        <div style={{ flex: "1 1 0", minHeight: 0, overflow: "auto" }}>
          <div className="p-1.5">
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
              ratings={ratings}
            />
          </div>
        </div>

        {/* Thick divider between tree and description panel */}
        <div
          style={{
            height: 4,
            flexShrink: 0,
            background: "var(--border)",
          }}
        />

        {/* Description Panel — fixed 220px at bottom of left panel */}
        <div
          style={{
            height: 220,
            flexShrink: 0,
            overflow: "auto",
            background: "hsl(var(--muted) / 0.25)",
          }}
          data-ocid="perform.description_panel"
        >
          <div className="p-3 space-y-1.5">
            {descContent ? (
              <>
                <p className="text-xs font-heading text-foreground leading-snug">
                  <span className="font-mono text-muted-foreground/70 text-[11px] uppercase tracking-wider mr-1.5">
                    {descContent.id}
                  </span>
                  <span className="font-semibold">{descContent.title}</span>
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
        </div>
      </div>

      {/* ── Drag handle ── */}
      <div
        style={{
          width: 6,
          cursor: "col-resize",
          background: isDragging ? "var(--accent)" : "var(--border)",
          flexShrink: 0,
          alignSelf: "stretch",
          transition: isDragging ? "none" : "background 0.15s",
        }}
        className="hover:bg-accent/70"
        onMouseDown={handleDragStart}
        data-ocid="perform.drag_handle"
        title="Drag to resize panels"
      />

      {/* ── Right Panel (flex: 1) ── */}
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        <div className="p-4 space-y-4">
          {(!selectedNode || selectedNode.type === "root") && (
            <RootOverviewView
              enabledProcesses={enabledProcesses}
              ratings={ratings}
            />
          )}
          {selectedNode?.type === "process" &&
            (() => {
              const procInfo = enabledProcesses.find(
                (p) => p.id === selectedNode.processId,
              );
              return procInfo ? (
                <ProcessOverviewView
                  processId={selectedNode.processId}
                  processInfo={procInfo}
                  ratings={ratings}
                  isCompleted={isCompleted}
                  onEdit={(practiceId, level, updated) =>
                    editSwEntryForPractice(
                      selectedNode.processId,
                      level,
                      practiceId,
                      updated,
                    )
                  }
                  onRatingChange={(r) =>
                    updatePracticeState(
                      selectedNode.processId,
                      0,
                      selectedNode.processId,
                      { rating: r },
                    )
                  }
                />
              ) : null;
            })()}
          {selectedNode?.type === "pa" && (
            <PASummaryView
              paId={selectedNode.paId ?? selectedNode.id}
              processId={selectedNode.processId}
              ratings={ratings}
              onEdit={(practiceId, level, updated) => {
                editSwEntryForPractice(
                  selectedNode.processId,
                  level,
                  practiceId,
                  updated,
                );
              }}
              isCompleted={!!isCompleted}
              onRatingChange={(r) =>
                updatePracticeState(
                  selectedNode.processId,
                  5,
                  selectedNode.paId ?? selectedNode.id,
                  { rating: r },
                )
              }
            />
          )}
          {(selectedNode?.type === "bp" || selectedNode?.type === "gp") && (
            <BPGPRightPanel
              selectedNode={selectedNode}
              enabledProcesses={enabledProcesses}
              ratings={ratings}
              isCompleted={!!isCompleted}
              getPracticeState={getPracticeState}
              updatePracticeState={updatePracticeState}
              onSelectProcess={(pid) =>
                setSelectedNode({
                  type: "process",
                  id: pid,
                  processId: pid,
                })
              }
              onSelectPA={(paId, pid) =>
                setSelectedNode({
                  type: "pa",
                  id: paId,
                  processId: pid,
                  paId,
                })
              }
              openSwDialog={currentBpGpOpenDialog}
            />
          )}
        </div>
      </div>
    </div>
  );
}
