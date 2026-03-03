import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { useCreateAssessment } from "@/hooks/useQueries";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateNewAssessmentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateNewAssessmentModal({
  open,
  onClose,
}: CreateNewAssessmentModalProps) {
  const [title, setTitle] = useState("");
  const createMutation = useCreateAssessment();
  const { setCurrentAssessment, navigateTo } = useAppContext();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Assessment title is required");
      return;
    }
    try {
      const newId = await createMutation.mutateAsync({ name: trimmed });
      setCurrentAssessment(newId, trimmed);
      toast.success("Assessment created successfully");
      setTitle("");
      onClose();
      navigateTo("assessment-info");
    } catch {
      toast.error("Failed to create assessment");
    }
  }

  function handleClose() {
    if (!createMutation.isPending) {
      setTitle("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="create_assessment.modal"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Create New Assessment
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            Enter a title for your new assessment. You can add more details
            later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="assessment-title" className="font-body font-medium">
              Assessment Title
            </Label>
            <Input
              id="assessment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter assessment title"
              className="font-body"
              disabled={createMutation.isPending}
              autoFocus
              data-ocid="create_assessment.title_input"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
              data-ocid="create_assessment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className="spice-gradient text-white border-0"
              data-ocid="create_assessment.submit_button"
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Assessment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
