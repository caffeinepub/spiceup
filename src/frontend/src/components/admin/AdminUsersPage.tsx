import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useGetAllAssessments } from "@/hooks/useQueries";
import {
  type StoredUser,
  deleteUserById,
  demoteUser,
  getAllUsers,
  getAssessmentCountForUser,
  getAssessmentIdsForUser,
  promoteUser,
  suspendUser,
  unsuspendUser,
} from "@/utils/authStorage";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Assessment } from "../../backend.d";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface UserAssessmentsModalProps {
  user: StoredUser | null;
  open: boolean;
  onClose: () => void;
  allAssessments: Assessment[];
}

function UserAssessmentsModal({
  user,
  open,
  onClose,
  allAssessments,
}: UserAssessmentsModalProps) {
  if (!user) return null;
  const assessmentIds = getAssessmentIdsForUser(user.id);
  const userAssessments = allAssessments.filter((a) =>
    assessmentIds.includes(a.id.toString()),
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl"
        data-ocid="admin_users.user_assessments.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-accent" />
            Assessments for {user.username}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {userAssessments.length === 0 ? (
            <div
              className="flex flex-col items-center py-10 text-center"
              data-ocid="admin_users.user_assessments.empty_state"
            >
              <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground font-body">
                No assessments found for this user.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                    Assessment Title
                  </TableHead>
                  <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                    Created
                  </TableHead>
                  <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                    Last Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAssessments.map((a, idx) => (
                  <TableRow
                    key={a.id.toString()}
                    className="hover:bg-muted/30"
                    data-ocid={`admin_users.user_assessments.row.${idx + 1}`}
                  >
                    <TableCell className="font-body text-sm font-medium text-foreground">
                      {a.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-body ${
                          a.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : a.status === "Active"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-body whitespace-nowrap">
                      {new Date(
                        Number(a.createdAt / BigInt(1_000_000)),
                      ).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-body whitespace-nowrap">
                      {new Date(
                        Number(a.updatedAt / BigInt(1_000_000)),
                      ).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="font-body"
            data-ocid="admin_users.user_assessments.close_button"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUsersPage() {
  const { sessionToken, currentUser } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [pendingAction, setPendingAction] = useState<{
    type: "delete" | "suspend" | "unsuspend" | "promote" | "demote";
    user: StoredUser;
  } | null>(null);
  const [viewAssessmentsUser, setViewAssessmentsUser] =
    useState<StoredUser | null>(null);
  const [isActing, setIsActing] = useState(false);

  const { data: allAssessments = [] } = useGetAllAssessments();

  function refreshUsers() {
    setUsers(getAllUsers());
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-time mount load
  useEffect(() => {
    setUsers(getAllUsers());
  }, []);

  async function handleAction() {
    if (!pendingAction || !sessionToken) return;
    setIsActing(true);
    await new Promise((r) => setTimeout(r, 80)); // allow UI to reflect loading

    const { type, user } = pendingAction;
    let result: { ok: true } | { err: string };

    switch (type) {
      case "suspend":
        result = suspendUser(sessionToken, user.id);
        break;
      case "unsuspend":
        result = unsuspendUser(sessionToken, user.id);
        break;
      case "delete":
        result = deleteUserById(sessionToken, user.id);
        break;
      case "promote":
        result = promoteUser(sessionToken, user.id);
        break;
      case "demote":
        result = demoteUser(sessionToken, user.id);
        break;
      default:
        result = { err: "Unknown action" };
    }

    setIsActing(false);
    setPendingAction(null);

    if ("err" in result) {
      toast.error(result.err);
    } else {
      const messages: Record<string, string> = {
        suspend: `User "${user.username}" has been suspended.`,
        unsuspend: `User "${user.username}" has been reactivated.`,
        delete: `User "${user.username}" has been deleted.`,
        promote: `User "${user.username}" promoted to Admin.`,
        demote: `User "${user.username}" demoted to User.`,
      };
      toast.success(messages[type]);
      refreshUsers();
    }
  }

  const isDeleteAction = pendingAction?.type === "delete";

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-accent" />
            Manage Users
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            View and manage all registered users
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-body text-sm px-3 py-1 border-border bg-muted/40"
          data-ocid="admin_users.total_count"
        >
          {users.length} user{users.length !== 1 ? "s" : ""} total
        </Badge>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
        <Table data-ocid="admin_users.table">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/20">
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Username
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Role
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Registered
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                # Assessments
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                Last Active
              </TableHead>
              <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12"
                  data-ocid="admin_users.empty_state"
                >
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-body">
                    No users found.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, idx) => {
                const isSelf = user.id === currentUser?.userId;
                const assessmentCount = getAssessmentCountForUser(user.id);
                return (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/20"
                    data-ocid={`admin_users.row.${idx + 1}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-accent font-heading">
                            {user.username.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium font-body text-sm text-foreground">
                            {user.username}
                          </p>
                          {isSelf && (
                            <span className="text-[10px] text-muted-foreground font-body">
                              (you)
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-body ${
                          user.role === "admin"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <UserCheck className="h-3 w-3 mr-1" />
                        )}
                        {user.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-body ${
                          user.suspended
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {user.suspended ? (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Suspended
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-body whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-body text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold text-foreground font-heading">
                        {assessmentCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-body whitespace-nowrap">
                      {user.lastActive
                        ? formatDateFull(user.lastActive)
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground font-body italic">
                          —
                        </span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-ocid={`admin_users.actions.${idx + 1}.button`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48"
                            data-ocid={`admin_users.actions.${idx + 1}.dropdown_menu`}
                          >
                            {/* View Assessments */}
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer font-body text-sm"
                              onClick={() => setViewAssessmentsUser(user)}
                              data-ocid={`admin_users.view_assessments.${idx + 1}.button`}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              View Assessments
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {/* Suspend / Reactivate */}
                            {user.suspended ? (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer font-body text-sm text-emerald-700 focus:text-emerald-700"
                                onClick={() =>
                                  setPendingAction({ type: "unsuspend", user })
                                }
                                data-ocid={`admin_users.reactivate.${idx + 1}.button`}
                              >
                                <UserCheck className="h-4 w-4" />
                                Reactivate Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer font-body text-sm text-amber-700 focus:text-amber-700"
                                onClick={() =>
                                  setPendingAction({ type: "suspend", user })
                                }
                                data-ocid={`admin_users.suspend.${idx + 1}.button`}
                              >
                                <UserX className="h-4 w-4" />
                                Suspend Account
                              </DropdownMenuItem>
                            )}
                            {/* Promote / Demote */}
                            {user.role === "user" ? (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer font-body text-sm text-blue-700 focus:text-blue-700"
                                onClick={() =>
                                  setPendingAction({ type: "promote", user })
                                }
                                data-ocid={`admin_users.promote.${idx + 1}.button`}
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer font-body text-sm text-gray-700 focus:text-gray-700"
                                onClick={() =>
                                  setPendingAction({ type: "demote", user })
                                }
                                data-ocid={`admin_users.demote.${idx + 1}.button`}
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                                Demote to User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {/* Delete */}
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer font-body text-sm text-destructive focus:text-destructive"
                              onClick={() =>
                                setPendingAction({ type: "delete", user })
                              }
                              data-ocid={`admin_users.delete.${idx + 1}.button`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation AlertDialog for all actions */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(o) => {
          if (!o && !isActing) setPendingAction(null);
        }}
      >
        <AlertDialogContent data-ocid="admin_users.confirm.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              {pendingAction?.type === "delete" && "Delete User"}
              {pendingAction?.type === "suspend" && "Suspend Account"}
              {pendingAction?.type === "unsuspend" && "Reactivate Account"}
              {pendingAction?.type === "promote" && "Promote to Admin"}
              {pendingAction?.type === "demote" && "Demote to User"}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              {pendingAction?.type === "delete" && (
                <>
                  Are you sure you want to permanently delete{" "}
                  <strong>{pendingAction.user.username}</strong>? Their
                  assessments will be reassigned to Admin. This cannot be
                  undone.
                </>
              )}
              {pendingAction?.type === "suspend" && (
                <>
                  Suspend <strong>{pendingAction.user.username}</strong>? They
                  will be unable to log in until reactivated.
                </>
              )}
              {pendingAction?.type === "unsuspend" && (
                <>
                  Reactivate <strong>{pendingAction.user.username}</strong>?
                  They will be able to log in again.
                </>
              )}
              {pendingAction?.type === "promote" && (
                <>
                  Promote <strong>{pendingAction.user.username}</strong> to
                  Admin? They will have access to all assessments and admin
                  features.
                </>
              )}
              {pendingAction?.type === "demote" && (
                <>
                  Demote <strong>{pendingAction.user.username}</strong> to a
                  regular User? They will lose Admin privileges.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isActing}
              onClick={() => setPendingAction(null)}
              data-ocid="admin_users.confirm.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isActing}
              className={
                isDeleteAction
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  : "spice-gradient text-white border-0"
              }
              data-ocid="admin_users.confirm.confirm_button"
            >
              {isActing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isActing ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Assessments Modal */}
      <UserAssessmentsModal
        user={viewAssessmentsUser}
        open={!!viewAssessmentsUser}
        onClose={() => setViewAssessmentsUser(null)}
        allAssessments={allAssessments as Assessment[]}
      />
    </div>
  );
}
