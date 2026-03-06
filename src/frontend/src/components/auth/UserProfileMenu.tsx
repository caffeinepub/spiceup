import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { KeyRound, Loader2, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function UserProfileMenu() {
  const { currentUser, logout, changePassword } = useAuth();
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [pwError, setPwError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!currentUser) return null;

  const initials = currentUser.username.slice(0, 2).toUpperCase();

  function handleOpenPwDialog() {
    setPwDialogOpen(true);
    setOldPassword("");
    setNewPassword("");
    setConfirmNew("");
    setPwError("");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!oldPassword) {
      setPwError("Current password is required.");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPwError("New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmNew) {
      setPwError("New passwords do not match.");
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 100));
    const result = changePassword(oldPassword, newPassword);
    setIsSaving(false);
    if ("err" in result) {
      setPwError(result.err);
    } else {
      toast.success("Password changed successfully");
      setPwDialogOpen(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-8 px-2 font-body text-sm"
            data-ocid="profile.menu_button"
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-accent/20 text-accent font-heading">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-foreground/80">
              {currentUser.username}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52"
          data-ocid="profile.dropdown_menu"
        >
          {/* User info header */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-accent/20 text-accent font-heading">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-heading text-foreground truncate">
                  {currentUser.username}
                </p>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 mt-0.5 ${
                    currentUser.role === "admin"
                      ? "border-amber-300 text-amber-700 bg-amber-50"
                      : "border-blue-200 text-blue-700 bg-blue-50"
                  }`}
                >
                  <User className="h-2.5 w-2.5 mr-1" />
                  {currentUser.role === "admin" ? "Admin" : "User"}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleOpenPwDialog}
            className="gap-2 cursor-pointer font-body text-sm"
            data-ocid="profile.change_password_button"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="gap-2 cursor-pointer font-body text-sm text-destructive focus:text-destructive"
            data-ocid="profile.logout_button"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="change_password.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-heading">Change Password</DialogTitle>
            <DialogDescription className="font-body text-muted-foreground">
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="old-password"
                className="font-body text-sm font-medium"
              >
                Current Password
              </Label>
              <Input
                id="old-password"
                type="password"
                placeholder="Current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="font-body"
                autoFocus
                data-ocid="change_password.old_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="new-password"
                className="font-body text-sm font-medium"
              >
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                placeholder="New password (min 4 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-body"
                data-ocid="change_password.new_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm-new-password"
                className="font-body text-sm font-medium"
              >
                Confirm New Password
              </Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmNew}
                onChange={(e) => setConfirmNew(e.target.value)}
                className="font-body"
                data-ocid="change_password.confirm_input"
              />
            </div>
            {pwError && (
              <p className="text-sm text-destructive font-body bg-destructive/10 px-3 py-2 rounded-md">
                {pwError}
              </p>
            )}
            <DialogFooter className="gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwDialogOpen(false)}
                disabled={isSaving}
                className="font-body"
                data-ocid="change_password.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="spice-gradient text-white border-0 gap-2 font-body"
                disabled={isSaving}
                data-ocid="change_password.submit_button"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Saving…" : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
