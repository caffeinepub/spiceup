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
import { useState } from "react";
import { AssessmentInfo } from "./components/AssessmentInfo";
import { AssessmentPlanning } from "./components/AssessmentPlanning";
import { Dashboard } from "./components/Dashboard";
import { DefineTargetProfile } from "./components/DefineTargetProfile";
import { GenerateReport } from "./components/GenerateReport";
import { PerformAssessment } from "./components/PerformAssessment";
import { ViewResults } from "./components/ViewResults";
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

function renderPage(activeId: string) {
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
    <aside className="flex flex-col h-full bg-sidebar w-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/assets/generated/infineon-logo.png"
              alt="Infineon"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground font-heading leading-tight tracking-tight">
              Infineon
            </h1>
            <p className="text-[10px] text-sidebar-foreground/50 font-body leading-tight mt-0.5">
              For Smart Assessments
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] text-sidebar-foreground/30 uppercase tracking-widest font-heading px-3 mb-3">
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
              className={cn(
                "sidebar-nav-item w-full text-left",
                isActive
                  ? "active"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-accent" : "text-sidebar-foreground/50",
                )}
              />
              <span className="font-body text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/30 font-body text-center leading-relaxed">
          © {new Date().getFullYear()} ·{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sidebar-foreground/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}

function AssessmentHeaderBar({ active }: { active: string }) {
  const { currentAssessmentId, currentAssessmentTitle, setCurrentAssessment } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();

  if (active === "dashboard") return null;

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );

  const statusStyles: Record<string, string> = {
    Active: "bg-blue-50 text-blue-700 border-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className="flex items-center justify-end gap-3 px-6 py-2.5 border-b border-border bg-background shrink-0">
      <span className="text-xs text-muted-foreground font-body">
        Assessment:
      </span>
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
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigateTo(page: string) {
    setActive(page);
    setMobileOpen(false);
  }

  return (
    <AppProvider activePage={active} navigateTo={navigateTo}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-sidebar-border">
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
          <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/generated/infineon-logo.png"
                  alt="Infineon"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <span className="font-bold font-heading text-foreground">
                Infineon
              </span>
            </div>
          </header>

          {/* Global Assessment Selector Header */}
          <AssessmentHeaderBar active={active} />

          {/* Page Content */}
          {active === "perform" ? (
            <main className="flex-1 overflow-hidden" style={{ height: 0 }}>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                }}
              >
                {renderPage(active)}
              </div>
            </main>
          ) : active === "results" ? (
            <main className="flex-1 overflow-y-auto">
              <div className="px-6 py-6">{renderPage(active)}</div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-8">
                {renderPage(active)}
              </div>
            </main>
          )}

          {/* Footer — hidden on perform page to allow full-height panel layout */}
          <footer
            className={`hidden md:flex items-center justify-center px-6 py-3 border-t border-border bg-background shrink-0 ${active === "perform" ? "!hidden" : ""}`}
          >
            <p className="text-xs text-muted-foreground font-body">
              © {new Date().getFullYear()}. Built with ♥ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
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
