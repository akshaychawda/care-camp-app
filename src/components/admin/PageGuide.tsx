import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import type { UserRole } from "@/lib/supabase";

type GuideItem = { heading: string; body: string };
type GuideContent = Partial<Record<UserRole, GuideItem[]>>;

const GUIDES: Record<string, GuideContent> = {
  overview: {
    super_admin: [
      {
        heading: "What is this page?",
        body: "Programme-wide stats — families reached, cards generated, camp counts, and efficiency trends. Use the city or owner filters at the top right to narrow the data.",
      },
      {
        heading: "Want to create or manage camps?",
        body: "Go to the Camps page in the sidebar.",
      },
    ],
    mad_employee: [
      {
        heading: "What is this page?",
        body: "Programme-wide stats — families reached, cards generated, and camp activity. Use the city filter to narrow the view.",
      },
      {
        heading: "Want to create or manage camps?",
        body: "Go to the Camps page in the sidebar.",
      },
    ],
    co: [
      {
        heading: "What is this page?",
        body: "Stats for your camps — families reached, cards generated, and how long your camps run on average.",
      },
      {
        heading: "Want to create or manage camps?",
        body: "Go to the Camps page in the sidebar.",
      },
    ],
    cho: [
      {
        heading: "What is this page?",
        body: "A summary of the camps shared with you and the families who've registered.",
      },
      {
        heading: "Looking for your camp?",
        body: "Go to the Camps page in the sidebar.",
      },
    ],
  },

  camps: {
    super_admin: [
      {
        heading: "What is this page?",
        body: "Every camp across all cities. Open = parents can still register. Closed = event has ended.",
      },
      {
        heading: "Creating a camp",
        body: "Hit + New Camp. Fill in the city, area, venue, and date. Once created, open the camp to get the QR code to share with your team.",
      },
      {
        heading: "On camp day",
        body: "Click into the camp → tap Open → share the QR with your CHO. They show it to each parent to scan.",
      },
    ],
    mad_employee: [
      {
        heading: "What is this page?",
        body: "Every camp across all cities. Open = parents can still register. Closed = event has ended.",
      },
      {
        heading: "Creating a camp",
        body: "Hit + New Camp. Fill in the city, area, venue, and date. Open the camp and share the QR with your CHO before the event.",
      },
    ],
    co: [
      {
        heading: "What is this page?",
        body: "Camps you created, plus camps another CO or admin shared with you.",
      },
      {
        heading: "Creating a camp",
        body: "Hit + New Camp. After creating it, open the camp and share the QR link with your CHO so they're ready on the day.",
      },
      {
        heading: "On camp day",
        body: "Open the camp → it goes live. Your CHO shows the QR to parents. Registrations update every 30 seconds.",
      },
    ],
    cho: [
      {
        heading: "What is this page?",
        body: "Camps your CO has shared with you. You can view them but not create new ones.",
      },
      {
        heading: "On camp day",
        body: "Your CO opens the camp. Once it's live, tap into it, tap 'Show QR fullscreen', and hold your phone up for each parent to scan. That's it.",
      },
    ],
  },

  users: {
    super_admin: [
      {
        heading: "Pending",
        body: "Someone requested access from the login page. Pick their role (CHO, CO, or MAD Employee) and hit Approve — or Reject if you don't recognise them. Non-MAD emails show an amber warning.",
      },
      {
        heading: "Invited",
        body: "You sent them a magic link but they haven't signed in yet. Hit Resend if they missed it, or Cancel to revoke.",
      },
      {
        heading: "Active",
        body: "People with access. You can change their role or disable them if they should no longer have access.",
      },
      {
        heading: "Inviting someone directly",
        body: "Use the Invite button (top right) to send a magic link to a MAD employee's email.",
      },
    ],
    mad_employee: [
      {
        heading: "Pending",
        body: "Someone requested access from the login page. Pick their role and hit Approve — or Reject if you don't recognise them.",
      },
      {
        heading: "Active",
        body: "People who currently have access. You can see their role and status here.",
      },
    ],
  },

  "session-detail": {
    super_admin: [
      {
        heading: "Before the event",
        body: "Copy the camp link or QR and share it with your CHO. The camp must be Open for parents to register.",
      },
      {
        heading: "On camp day",
        body: "Keep this page open. Each registration appears automatically. Hit Refresh for an instant update.",
      },
      {
        heading: "After the event",
        body: "Toggle the camp to Closed. Parents who try the link will see it's ended. All registrations stay saved.",
      },
    ],
    mad_employee: [
      {
        heading: "Before the event",
        body: "Share the QR or camp link with your CHO. The camp must be Open for parents to register.",
      },
      {
        heading: "On camp day",
        body: "Registrations appear live. Hit Refresh or wait for the 30-second auto-refresh.",
      },
    ],
    co: [
      {
        heading: "Before the event",
        body: "Copy the camp link or QR and send it to your CHO. The camp must be Open for parents to register.",
      },
      {
        heading: "On camp day",
        body: "Registrations update every 30 seconds. You can also use the fullscreen QR button if you're at the venue.",
      },
      {
        heading: "After the event",
        body: "Toggle the camp to Closed when done.",
      },
    ],
    cho: [
      {
        heading: "On camp day",
        body: "Tap 'Show QR fullscreen'. Hold your phone up and let each parent scan the QR. They fill in their details on their own phone — you don't need to touch it.",
      },
      {
        heading: "Watching it happen",
        body: "Each family appears in the list below as they finish. It updates every 30 seconds.",
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
      const stored = localStorage.getItem(storageKey);
      // Default to collapsed — only expand if user explicitly opened it before
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(storageKey, String(!c));
      } catch {
        // localStorage unavailable (private mode / blocked) — ignore, state still toggles
      }
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
