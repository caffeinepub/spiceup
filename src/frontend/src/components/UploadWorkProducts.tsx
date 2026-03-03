import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useAddWorkProduct,
  useGetAllAssessments,
  useGetAllWorkProducts,
} from "@/hooks/useQueries";
import {
  File,
  FileCode,
  FileImage,
  FileText,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FILE_TYPES = [
  "PDF",
  "DOCX",
  "XLSX",
  "PPTX",
  "PNG",
  "JPG",
  "CSV",
  "TXT",
  "ZIP",
  "Other",
];

function FileTypeIcon({ fileType }: { fileType: string }) {
  if (["PNG", "JPG", "GIF", "SVG"].includes(fileType.toUpperCase()))
    return <FileImage className="h-4 w-4" />;
  if (["JS", "TS", "PY", "JAVA", "CPP"].includes(fileType.toUpperCase()))
    return <FileCode className="h-4 w-4" />;
  if (["PDF", "DOCX", "TXT"].includes(fileType.toUpperCase()))
    return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

const fileTypeColors: Record<string, string> = {
  PDF: "bg-red-100 text-red-700 border-red-200",
  DOCX: "bg-blue-100 text-blue-700 border-blue-200",
  XLSX: "bg-green-100 text-green-700 border-green-200",
  PPTX: "bg-orange-100 text-orange-700 border-orange-200",
  PNG: "bg-purple-100 text-purple-700 border-purple-200",
  JPG: "bg-violet-100 text-violet-700 border-violet-200",
};

export function UploadWorkProducts() {
  const { data: workProducts, isLoading } = useGetAllWorkProducts();
  const { data: assessments } = useGetAllAssessments();
  const addMutation = useAddWorkProduct();

  const [showForm, setShowForm] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState("PDF");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessmentId) {
      toast.error("Please select an assessment");
      return;
    }
    if (!name.trim()) {
      toast.error("Work product name is required");
      return;
    }
    try {
      await addMutation.mutateAsync({
        assessmentId: BigInt(assessmentId),
        name: name.trim(),
        fileType,
        notes: notes.trim(),
      });
      toast.success("Work product added successfully");
      setName("");
      setNotes("");
      setAssessmentId("");
      setFileType("PDF");
      setShowForm(false);
    } catch {
      toast.error("Failed to add work product");
    }
  }

  function getAssessmentName(id: bigint) {
    return (
      assessments?.find((a) => a.id === id)?.name ?? `Assessment #${String(id)}`
    );
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Upload Work Products
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Manage evidence and work artifacts
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="spice-gradient text-white border-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Work Product
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">
              Add Work Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assessment</Label>
                  <Select value={assessmentId} onValueChange={setAssessmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessments?.map((a) => (
                        <SelectItem key={String(a.id)} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File Type</Label>
                  <Select value={fileType} onValueChange={setFileType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPES.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {ft}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Work Product Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., System Architecture Document"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this work product..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="spice-gradient text-white border-0"
                >
                  {addMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Work Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Work Products List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : workProducts && workProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workProducts.map((wp) => (
            <Card
              key={String(wp.id)}
              className="border-border/60 hover:border-accent/30 transition-colors"
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <FileTypeIcon fileType={wp.fileType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold font-heading text-foreground text-sm truncate">
                        {wp.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          fileTypeColors[wp.fileType.toUpperCase()] ??
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {wp.fileType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-body mb-1">
                      {getAssessmentName(wp.assessmentId)}
                    </p>
                    {wp.notes && (
                      <p className="text-xs text-foreground/70 font-body line-clamp-2">
                        {wp.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 font-body mt-2">
                      {formatDate(wp.uploadedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm">
              No work products yet.
            </p>
            <p className="text-muted-foreground/60 font-body text-xs mt-1">
              Add evidence and artifacts for your assessments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
