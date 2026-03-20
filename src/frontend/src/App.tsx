import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { useAppContext } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useGetAllAssessments } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AssessmentInfo } from "./components/AssessmentInfo";
import { AssessmentPlanning } from "./components/AssessmentPlanning";
import { Dashboard } from "./components/Dashboard";
import { DefineTargetProfile } from "./components/DefineTargetProfile";
import { GenerateReport } from "./components/GenerateReport";
import { PerformAssessment } from "./components/PerformAssessment";
import { ViewResults } from "./components/ViewResults";
import { AdminAuditPage } from "./components/admin/AdminAuditPage";
import { AdminUsersPage } from "./components/admin/AdminUsersPage";
import { LoginPage } from "./components/auth/LoginPage";
import { SignupPage } from "./components/auth/SignupPage";
import { UserProfileMenu } from "./components/auth/UserProfileMenu";
import { AppProvider } from "./context/AppContext";

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { id: "assessment-info", label: "Assessment Info", icon: ClipboardList },
  { id: "target-profile", label: "Scope", icon: Target },
  { id: "planning", label: "Schedule", icon: CalendarDays },
  { id: "perform", label: "Perform Assessment", icon: CheckSquare },
  { id: "results", label: "Results", icon: BarChart2 },
  { id: "reports", label: "Generate Report", icon: FileText },
];

function renderPage(activeId: string, isAdmin: boolean) {
  switch (activeId) {
    case "dashboard":
      return <Dashboard />;
    case "assessment-info":
      return <AssessmentInfo />;
    case "target-profile":
      return <DefineTargetProfile />;
    case "planning":
      return <AssessmentPlanning />;
    case "perform":
      return <PerformAssessment />;
    case "results":
      return <ViewResults />;
    case "reports":
      return <GenerateReport />;
    case "admin-users":
      return isAdmin ? <AdminUsersPage /> : <Dashboard />;
    case "admin-audit":
      return isAdmin ? <AdminAuditPage /> : <Dashboard />;
    default:
      return <Dashboard />;
  }
}

function Sidebar({
  active,
  onSelect,
  onClose,
}: {
  active: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <aside
      className="flex flex-col h-full w-full"
      style={{ background: "#0F172A" }}
    >
      {/* Brand */}
      <div
        className="px-5 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/assets/generated/q-insight-logo-icon-transparent.dim_120x120.png"
              alt="Q-Insight"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div>
            <h1
              className="text-lg font-bold font-heading leading-tight tracking-tight"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              Q&#8209;Insight
            </h1>
            <p
              className="text-[10px] font-body leading-tight mt-0.5"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              For Smarter Assessments
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p
          className="text-[10px] uppercase tracking-widest font-heading px-3 mb-3"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                onClose?.();
              }}
              type="button"
              data-ocid={`nav.${item.id.replace(/-/g, "_")}.link`}
              className={cn("sidebar-nav-item", isActive ? "active" : "")}
            >
              {/* .nav-icon class drives icon color via CSS */}
              <Icon className="nav-icon h-4 w-4" />
              <span className="font-body text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile + Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-3 pt-3">
          <UserProfileMenu variant="sidebar" />
        </div>
        <div className="px-5 py-3">
          <p
            className="text-[10px] font-body text-center leading-relaxed"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            © {new Date().getFullYear()} ·{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline transition-colors"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}

function AutosaveIndicator() {
  const { autosaveStatus } = useAppContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (autosaveStatus === "saving" || autosaveStatus === "saved") {
      setVisible(true);
    }
    if (autosaveStatus === "idle") {
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [autosaveStatus]);

  if (!visible && autosaveStatus === "idle") return null;

  return (
    <span
      className={cn(
        "text-xs font-body text-muted-foreground transition-opacity duration-300",
        autosaveStatus === "idle" ? "opacity-0" : "opacity-100",
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {autosaveStatus === "saving" && "Saving…"}
      {autosaveStatus === "saved" && (
        <span className="text-emerald-600">Saved ✓</span>
      )}
    </span>
  );
}

function AssessmentHeaderBar({ active }: { active: string }) {
  const { currentAssessmentId, currentAssessmentTitle, setCurrentAssessment } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );

  const statusStyles: Record<string, string> = {
    Active: "bg-blue-50 text-blue-700 border-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div
      className="flex items-center justify-end gap-3 px-4 py-1.5 shrink-0"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      {/* Autosave indicator */}
      <AutosaveIndicator />

      {active !== "dashboard" && (
        <>
          <Select
            value={currentAssessmentId?.toString() ?? ""}
            onValueChange={(val) => {
              if (!val || !assessments) return;
              const a = assessments.find((x) => x.id.toString() === val);
              if (a) setCurrentAssessment(a.id, a.name);
            }}
          >
            <SelectTrigger
              className="h-8 text-sm w-[220px] font-body"
              data-ocid="header.assessment_select"
            >
              <SelectValue placeholder="Select assessment…">
                {currentAssessmentTitle || "Select assessment…"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {assessments?.map((a) => (
                <SelectItem key={a.id.toString()} value={a.id.toString()}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentAssessment && (
            <Badge
              variant="outline"
              className={`font-body text-xs shrink-0 ${statusStyles[currentAssessment.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
            >
              {currentAssessment.status}
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

function AuthenticatedApp() {
  const { isAdmin } = useAuth();
  const [active, setActive] = useState<string>(
    () => localStorage.getItem("infineon_activePage") ?? "dashboard",
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigateTo(page: string) {
    setActive(page);
    localStorage.setItem("infineon_activePage", page);
    setMobileOpen(false);
  }

  return (
    <AppProvider activePage={active} navigateTo={navigateTo}>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: "#F8FAFC" }}
      >
        {/* Desktop Sidebar */}
        <div
          className="hidden md:flex w-[260px] shrink-0 flex-col"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "#0F172A",
          }}
        >
          <Sidebar active={active} onSelect={navigateTo} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <div className="relative w-[260px] h-full">
              <Sidebar
                active={active}
                onSelect={navigateTo}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header
            className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" style={{ color: "#0F172A" }} />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/generated/q-insight-logo-icon-transparent.dim_120x120.png"
                  alt="Q-Insight"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div>
                <span
                  className="font-bold font-heading"
                  style={{ color: "#0F172A" }}
                >
                  Q&#8209;Insight
                </span>
                <p
                  className="text-[10px] leading-tight"
                  style={{ color: "#475569" }}
                >
                  For Smarter Assessments
                </p>
              </div>
            </div>
          </header>

          {/* Global Assessment Selector + Autosave Header */}
          <AssessmentHeaderBar active={active} />

          {/* Page Content */}
          {active === "perform" ? (
            <main
              className="flex-1 overflow-hidden"
              style={{ height: 0, background: "#F8FAFC" }}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px",
                }}
              >
                {renderPage(active, isAdmin)}
              </div>
            </main>
          ) : active === "results" ? (
            <main
              className="flex-1 overflow-y-auto"
              style={{ background: "#F8FAFC" }}
            >
              <div className="px-6 py-6">{renderPage(active, isAdmin)}</div>
            </main>
          ) : (
            <main
              className="flex-1 overflow-y-auto"
              style={{ background: "#F8FAFC" }}
            >
              <div className="max-w-6xl mx-auto px-6 py-6">
                {renderPage(active, isAdmin)}
              </div>
            </main>
          )}

          {/* Footer */}
          <footer
            className={`hidden md:flex items-center justify-center px-6 py-3 shrink-0 ${active === "perform" ? "!hidden" : ""}`}
            style={{ background: "#FFFFFF", borderTop: "1px solid #E2E8F0" }}
          >
            <p className="text-xs font-body" style={{ color: "#475569" }}>
              © {new Date().getFullYear()}. Built with ♥ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: "#2563EB" }}
              >
                caffeine.ai
              </a>
            </p>
          </footer>
        </div>

        <Toaster richColors position="top-right" />
      </div>
    </AppProvider>
  );
}

function AppRouter() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F8FAFC" }}
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/generated/q-insight-logo-icon-transparent.dim_120x120.png"
            alt="Q-Insight"
            className="h-10 w-auto object-contain opacity-60 animate-pulse"
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignup) {
      return <SignupPage onSwitchToLogin={() => setShowSignup(false)} />;
    }
    return <LoginPage onSwitchToSignup={() => setShowSignup(true)} />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
