import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import {
  getAssessmentAccessList,
  grantAssessmentAccess,
  revokeAssessmentAccess,
} from "@/utils/authStorage";
import { Loader2, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ManageAccessDialogProps {
  assessmentId: bigint;
  assessmentName: string;
}

export function ManageAccessDialog({
  assessmentId,
  assessmentName,
}: ManageAccessDialogProps) {
  const { sessionToken, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const [grantError, setGrantError] = useState("");
  const [isGranting, setIsGranting] = useState(false);

  const assessmentIdStr = assessmentId.toString();

  // We derive the access list from localStorage each render (reactive via re-open or actions)
  const [accessList, setAccessList] = useState<string[]>([]);

  function refreshAccessList() {
    if (!sessionToken) return;
    const list = getAssessmentAccessList(sessionToken, assessmentIdStr);
    setAccessList(list);
  }

  function handleOpen(openState: boolean) {
    setOpen(openState);
    if (openState) {
      setTargetUsername("");
      setGrantError("");
      refreshAccessList();
    }
  }

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantError("");
    const name = targetUsername.trim();
    if (!name) {
      setGrantError("Please enter a username.");
      return;
    }
    if (!sessionToken) return;
    setIsGranting(true);
    await new Promise((r) => setTimeout(r, 80));
    const result = grantAssessmentAccess(sessionToken, assessmentIdStr, name);
    setIsGranting(false);
    if ("err" in result) {
      setGrantError(result.err);
    } else {
      toast.success(`Access granted to "${name}"`);
      setTargetUsername("");
      refreshAccessList();
    }
  }

  function handleRevoke(username: string, index: number) {
    if (!sessionToken) return;
    void index; // used for data-ocid only
    const result = revokeAssessmentAccess(
      sessionToken,
      assessmentIdStr,
      username,
    );
    if ("err" in result) {
      toast.error(result.err);
    } else {
      toast.success(`Access revoked for "${username}"`);
      refreshAccessList();
    }
  }

  // Only show if owner or admin
  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-8 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
          data-ocid="dashboard.manage_access_button"
        >
          <Users className="h-3 w-3" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-ocid="manage_access.dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">Manage Access</DialogTitle>
          <DialogDescription className="font-body text-muted-foreground text-sm">
            Share <strong>&ldquo;{assessmentName}&rdquo;</strong> with other
            users. Shared users have full edit rights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Grant access section */}
          <form onSubmit={handleGrant} className="space-y-3">
            <Label className="font-body text-sm font-medium">
              Share with user
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter username"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                className="font-body flex-1"
                data-ocid="manage_access.username_input"
              />
              <Button
                type="submit"
                size="sm"
                className="spice-gradient text-white border-0 shrink-0"
                disabled={isGranting}
                data-ocid="manage_access.grant_button"
              >
                {isGranting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Grant Access"
                )}
              </Button>
            </div>
            {grantError && (
              <p className="text-xs text-destructive font-body bg-destructive/10 px-2.5 py-1.5 rounded-md">
                {grantError}
              </p>
            )}
          </form>

          {/* Current access list */}
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-muted-foreground">
              Users with access
            </Label>
            {accessList.length === 0 ? (
              <p
                className="text-sm text-muted-foreground/60 font-body py-3 text-center border border-dashed border-border rounded-md"
                data-ocid="manage_access.empty_state"
              >
                No users have been granted access yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {accessList.map((username, idx) => (
                  <li
                    key={username}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 rounded-md"
                    data-ocid={`manage_access.item.${idx + 1}`}
                  >
                    <span className="text-sm font-body text-foreground">
                      {username}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevoke(username, idx + 1)}
                      data-ocid={`manage_access.revoke_button.${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
