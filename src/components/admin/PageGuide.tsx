import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import type { UserRole } from "@/lib/supabase";

type GuideItem = { heading: string; body: string };
type GuideContent = Partial<Record<UserRole, GuideItem[]>>;

const GUIDES: Record<string, GuideContent> = {
  overview: {
    super_admin: [
      {
        heading: "What you're looking at",
        body: "All camps across every city and area. Stats at the top update as camps run. Use the filters to narrow by city, area, status, or owner.",
      },
      {
        heading: "Creating a camp",
        body: "Hit + New Camp (top right). Set the city, area, venue, and date. Once created, open the camp detail to get the QR code to share with your team.",
      },
      {
        heading: "On camp day",
        body: "Open the camp session. Share the QR link with your CHO. Watch registrations come in live — the table auto-refreshes every 30 seconds.",
      },
      {
        heading: "After camp",
        body: "Close the camp session when done. The session stays in the list for historical reference.",
      },
    ],
    mad_employee: [
      {
        heading: "What you're looking at",
        body: "All camps across every city and area. Use filters to narrow by city, area, status, or owner.",
      },
      {
        heading: "Creating a camp",
        body: "Hit + New Camp (top right). Set the city, area, venue, and date. Open the camp detail to get the QR code.",
      },
      {
        heading: "On camp day",
        body: "Open the camp, share the QR with your CHO, and watch registrations come in live.",
      },
    ],
    co: [
      {
        heading: "What you're looking at",
        body: "Camps you created or that were shared with you. Camps shared with your CHOs also appear here.",
      },
      {
        heading: "Creating a camp",
        body: "Hit + New Camp (top right). After creating it, open the camp detail and share the QR link with your CHO before the event.",
      },
      {
        heading: "On camp day",
        body: "Open the camp session. Share the QR with your CHO — or use the fullscreen QR button yourself. Registrations update live.",
      },
      {
        heading: "After camp",
        body: "Close the camp when the event ends. It stays visible for your records.",
      },
    ],
    cho: [
      {
        heading: "What you're looking at",
        body: "Camps that your CO has shared with you. You can view but not create camps.",
      },
      {
        heading: "On camp day",
        body: "Open the camp and tap the fullscreen QR button. Show the QR to each parent — they scan it to start the registration flow on their phone.",
      },
      {
        heading: "Watching it happen",
        body: "The registrations table below updates every 30 seconds. You can see each family as they complete the flow.",
      },
    ],
  },

  camps: {
    super_admin: [
      {
        heading: "Browse all camps",
        body: "Every camp across all cities and owners. Use + New Camp to create one. Open camps are live — click in to see registrations in real time.",
      },
      {
        heading: "Filters",
        body: "Filter by Open/Closed status, city, or owner. The two cards at the top always show a live count of open and closed camps.",
      },
    ],
    mad_employee: [
      {
        heading: "Browse all camps",
        body: "All camps across all cities. Click + New Camp to create one, then share the QR with your CHO before the event.",
      },
    ],
    co: [
      {
        heading: "Your camps",
        body: "Camps you created or that were shared with you. Create a new camp and share the QR link with your CHO before the event.",
      },
      {
        heading: "On camp day",
        body: "Open the camp session. The fullscreen QR button lets you show the QR directly to parents.",
      },
    ],
    cho: [
      {
        heading: "Camps shared with you",
        body: "Your CO has shared these camps with you. On camp day, open the camp and use the fullscreen QR button to show parents.",
      },
    ],
  },

  users: {
    super_admin: [
      {
        heading: "Two ways people get access",
        body: "You can invite MAD employees directly using the Invite button. COs and CHOs request access themselves via the login page (mad-care-camps.vercel.app/login) — they appear in Pending Requests.",
      },
      {
        heading: "Approving requests",
        body: "In Pending Requests, confirm their role and hit Approve. Check the email domain — MAD staff should have @makeadiff.in addresses. Non-MAD emails show an amber warning.",
      },
      {
        heading: "Managing existing users",
        body: "In All Users, you can change roles, disable access, or reinvite someone who was rejected by mistake.",
      },
    ],
    mad_employee: [
      {
        heading: "Approving access requests",
        body: "COs and CHOs request access via the login page and appear in Pending Requests. Confirm their role and hit Approve. Check the email domain — @makeadiff.in addresses are MAD staff.",
      },
      {
        heading: "All Users tab",
        body: "Shows everyone with access. You can view their role and status here.",
      },
    ],
  },

  "session-detail": {
    super_admin: [
      {
        heading: "Before camp day",
        body: "Share the camp link or QR code with your CHO. They'll use it on the day to show parents. The camp must be open for parents to register.",
      },
      {
        heading: "On camp day",
        body: "Keep this page open. Registrations appear in real-time (auto-refresh every 30s). Use the Refresh button to update immediately.",
      },
      {
        heading: "Closing the camp",
        body: "Toggle the camp to Closed when the event ends. Parents with the link will see a 'camp has ended' screen. You can still view all registrations.",
      },
    ],
    mad_employee: [
      {
        heading: "Before camp day",
        body: "Share the QR or link with your CHO before the event. The camp must be open for parents to register.",
      },
      {
        heading: "On camp day",
        body: "Watch registrations come in live. Hit Refresh or wait for the 30s auto-refresh.",
      },
    ],
    co: [
      {
        heading: "Before camp day",
        body: "Copy the camp link or show the QR to your CHO. They'll display it to parents on the day.",
      },
      {
        heading: "On camp day",
        body: "Registrations update every 30 seconds. You can also use the fullscreen QR button yourself if you're at the venue.",
      },
      {
        heading: "Closing the camp",
        body: "Toggle to Closed when done. Parents with the link will see it's ended.",
      },
    ],
    cho: [
      {
        heading: "On camp day",
        body: "Tap the fullscreen QR button and show it to each parent. They scan it on their phone and go through the registration flow themselves.",
      },
      {
        heading: "Watching in real time",
        body: "The list below shows each family as they register. It updates every 30 seconds automatically.",
      },
    ],
  },
};

function getRoleContent(pageKey: string, role: UserRole): GuideItem[] | null {
  const page = GUIDES[pageKey];
  if (!page) return null;
  return page[role] ?? page["mad_employee"] ?? null;
}

export function PageGuide({ pageKey, role }: { pageKey: string; role: UserRole }) {
  const storageKey = `guide-collapsed-${pageKey}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(storageKey, String(!c));
      } catch {}
      return !c;
    });
  };

  const items = getRoleContent(pageKey, role);
  if (!items) return null;

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-primary/10 transition"
      >
        <HelpCircle className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-sm font-semibold text-primary">How this works</span>
        <ChevronDown
          className={`h-4 w-4 text-primary transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
        />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.heading} className="space-y-1">
              <p className="text-xs font-semibold text-primary">{item.heading}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
