import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type AuditEvent,
  type AuditEventType,
  getAuditLog,
} from "@/utils/auditLog";
import { Activity, ClipboardList, RefreshCw, Shield, User } from "lucide-react";
import { useState } from "react";

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm}`;
}

const EVENT_TYPE_STYLES: Record<
  AuditEventType,
  { label: string; className: string }
> = {
  user_registered: {
    label: "Registered",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  user_login: {
    label: "Login",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  assessment_created: {
    label: "Created",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  assessment_deleted: {
    label: "Deleted",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  access_granted: {
    label: "Access Granted",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  access_revoked: {
    label: "Access Revoked",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  admin_action: {
    label: "Admin Action",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

const USER_TYPES: AuditEventType[] = ["user_registered", "user_login"];
const ASSESSMENT_TYPES: AuditEventType[] = [
  "assessment_created",
  "assessment_deleted",
  "access_granted",
  "access_revoked",
];

type FilterTab = "all" | "users" | "assessments" | "admin";

function filterEvents(events: AuditEvent[], tab: FilterTab): AuditEvent[] {
  switch (tab) {
    case "users":
      return events.filter((e) => USER_TYPES.includes(e.type));
    case "assessments":
      return events.filter((e) => ASSESSMENT_TYPES.includes(e.type));
    case "admin":
      return events.filter((e) => e.type === "admin_action");
    default:
      return events;
  }
}

interface EventRowProps {
  event: AuditEvent;
  index: number;
}

function EventRow({ event, index }: EventRowProps) {
  const style = EVENT_TYPE_STYLES[event.type] ?? EVENT_TYPE_STYLES.admin_action;
  return (
    <div
      className="flex items-start gap-4 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
      data-ocid={`audit.row.${index + 1}`}
    >
      {/* Timestamp */}
      <div className="shrink-0 w-36 pt-0.5">
        <span className="text-xs text-muted-foreground font-body tabular-nums">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>

      {/* Actor */}
      <div className="shrink-0 w-28 pt-0.5">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-accent font-heading">
              {event.actorUsername.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium font-body text-foreground truncate">
            {event.actorUsername}
          </span>
        </div>
      </div>

      {/* Badge */}
      <div className="shrink-0 pt-0.5">
        <Badge
          variant="outline"
          className={`text-[11px] font-body px-2 py-0.5 whitespace-nowrap ${style.className}`}
        >
          {style.label}
        </Badge>
      </div>

      {/* Description */}
      <p className="flex-1 text-sm font-body text-foreground/80 leading-relaxed pt-0.5">
        {event.description}
      </p>
    </div>
  );
}

export function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>(() => getAuditLog());
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  function handleRefresh() {
    setEvents(getAuditLog());
  }

  const filtered = filterEvents(events, activeTab);

  const countByTab: Record<FilterTab, number> = {
    all: events.length,
    users: filterEvents(events, "users").length,
    assessments: filterEvents(events, "assessments").length,
    admin: filterEvents(events, "admin").length,
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent" />
            Activity Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Audit trail of all user and system actions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2 font-body"
          data-ocid="audit.refresh_button"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs + Event List */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
      >
        <TabsList className="mb-4" data-ocid="audit.filter.tab">
          <TabsTrigger
            value="all"
            className="gap-1.5 font-body text-sm"
            data-ocid="audit.filter_all.tab"
          >
            <Activity className="h-3.5 w-3.5" />
            All
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] h-4 px-1.5 font-body"
            >
              {countByTab.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="gap-1.5 font-body text-sm"
            data-ocid="audit.filter_users.tab"
          >
            <User className="h-3.5 w-3.5" />
            Users
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] h-4 px-1.5 font-body"
            >
              {countByTab.users}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="assessments"
            className="gap-1.5 font-body text-sm"
            data-ocid="audit.filter_assessments.tab"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Assessments
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] h-4 px-1.5 font-body"
            >
              {countByTab.assessments}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="admin"
            className="gap-1.5 font-body text-sm"
            data-ocid="audit.filter_admin.tab"
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Actions
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] h-4 px-1.5 font-body"
            >
              {countByTab.admin}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {(["all", "users", "assessments", "admin"] as FilterTab[]).map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
                {/* Column Headers */}
                <div className="flex items-center gap-4 px-4 py-2 bg-muted/20 border-b border-border/40">
                  <div className="shrink-0 w-36">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Timestamp
                    </span>
                  </div>
                  <div className="shrink-0 w-28">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Actor
                    </span>
                  </div>
                  <div className="shrink-0 w-28">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Event Type
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Description
                    </span>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div
                    className="flex flex-col items-center py-16 text-center"
                    data-ocid="audit.empty_state"
                  >
                    <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground font-body">
                      No activity logged yet.
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-body mt-1">
                      Actions will appear here as users interact with the app.
                    </p>
                  </div>
                ) : (
                  <div>
                    {filtered.map((event, idx) => (
                      <EventRow key={event.id} event={event} index={idx} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          ),
        )}
      </Tabs>
    </div>
  );
}
