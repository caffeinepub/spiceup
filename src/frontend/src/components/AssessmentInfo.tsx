import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllAssessments,
  useCreateAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
} from "@/hooks/useQueries";
import type { Assessment } from "../backend.d";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-blue-100 text-blue-700 border-blue-200",
    Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <Badge variant="outline" className={styles[status] ?? "bg-gray-100 text-gray-700"}>
      {status}
    </Badge>
  );
}

function formatDate(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function AssessmentForm({
  initial,
  onSubmit,
  isPending,
  onClose,
}: {
  initial?: Assessment;
  onSubmit: (data: { name: string; description: string; status: string }) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "Active");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim(), status });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Assessment Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter assessment name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the assessment purpose"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="spice-gradient text-white border-0">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initial ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssessmentInfo() {
  const { data: assessments, isLoading } = useGetAllAssessments();
  const createMutation = useCreateAssessment();
  const updateMutation = useUpdateAssessment();
  const deleteMutation = useDeleteAssessment();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Assessment | null>(null);

  async function handleCreate(data: { name: string; description: string; status: string }) {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Assessment created successfully");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create assessment");
    }
  }

  async function handleUpdate(data: { name: string; description: string; status: string }) {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, ...data });
      toast.success("Assessment updated successfully");
      setEditTarget(null);
    } catch {
      toast.error("Failed to update assessment");
    }
  }

  async function handleDelete(id: bigint) {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Assessment deleted");
    } catch {
      toast.error("Failed to delete assessment");
    }
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Assessment Info</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Manage all assessments</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="spice-gradient text-white border-0 gap-2">
              <Plus className="h-4 w-4" />
              New Assessment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Create New Assessment</DialogTitle>
            </DialogHeader>
            <AssessmentForm
              onSubmit={handleCreate}
              isPending={createMutation.isPending}
              onClose={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">All Assessments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : assessments && assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-heading">Name</TableHead>
                  <TableHead className="font-heading">Description</TableHead>
                  <TableHead className="font-heading">Status</TableHead>
                  <TableHead className="font-heading">Created</TableHead>
                  <TableHead className="font-heading text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={String(assessment.id)} className="hover:bg-muted/40">
                    <TableCell className="font-medium font-body">{assessment.name}</TableCell>
                    <TableCell className="text-muted-foreground font-body max-w-xs truncate">{assessment.description || "—"}</TableCell>
                    <TableCell><StatusBadge status={assessment.status} /></TableCell>
                    <TableCell className="text-muted-foreground font-body text-sm">{formatDate(assessment.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => setEditTarget(assessment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(assessment.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardListIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-body text-sm">No assessments yet.</p>
              <p className="text-muted-foreground/60 font-body text-xs mt-1">Click "New Assessment" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Assessment</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <AssessmentForm
              initial={editTarget}
              onSubmit={handleUpdate}
              isPending={updateMutation.isPending}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="No assessments">
      <title>No assessments</title>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
