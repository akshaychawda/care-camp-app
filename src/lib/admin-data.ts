export type CampSession = {
  id: string;
  city: string;
  chapter: string;
  date: string; // ISO
  parents: number;
  cards: number;
};

export type Registration = {
  name: string;
  phone: string;
  area: string;
  cardGenerated: boolean;
};

export const SESSIONS: CampSession[] = [
  {
    id: "pune-deccan-2026-05-02",
    city: "Pune",
    chapter: "Deccan",
    date: "2026-05-02",
    parents: 42,
    cards: 42,
  },
  {
    id: "pune-baner-2026-04-18",
    city: "Pune",
    chapter: "Baner",
    date: "2026-04-18",
    parents: 36,
    cards: 34,
  },
  {
    id: "mumbai-andheri-2026-04-12",
    city: "Mumbai",
    chapter: "Andheri",
    date: "2026-04-12",
    parents: 58,
    cards: 56,
  },
  {
    id: "mumbai-bandra-2026-03-28",
    city: "Mumbai",
    chapter: "Bandra",
    date: "2026-03-28",
    parents: 47,
    cards: 47,
  },
  {
    id: "bengaluru-koramangala-2026-03-21",
    city: "Bengaluru",
    chapter: "Koramangala",
    date: "2026-03-21",
    parents: 51,
    cards: 49,
  },
  {
    id: "delhi-saket-2026-03-14",
    city: "Delhi",
    chapter: "Saket",
    date: "2026-03-14",
    parents: 39,
    cards: 38,
  },
  {
    id: "pune-kothrud-2026-02-28",
    city: "Pune",
    chapter: "Kothrud",
    date: "2026-02-28",
    parents: 44,
    cards: 44,
  },
  {
    id: "hyderabad-jubilee-2026-02-15",
    city: "Hyderabad",
    chapter: "Jubilee Hills",
    date: "2026-02-15",
    parents: 33,
    cards: 31,
  },
];

export const SAMPLE_REGISTRATIONS: Registration[] = [
  { name: "Priya Sharma", phone: "+91 98765 43210", area: "Koregaon Park", cardGenerated: true },
  {
    name: "Rahul Deshpande",
    phone: "+91 98220 11234",
    area: "Deccan Gymkhana",
    cardGenerated: true,
  },
  { name: "Anjali Mehta", phone: "+91 99876 55432", area: "Erandwane", cardGenerated: true },
  { name: "Vikram Patil", phone: "+91 91234 88990", area: "Shivajinagar", cardGenerated: false },
  { name: "Sneha Iyer", phone: "+91 90876 12345", area: "FC Road", cardGenerated: true },
  { name: "Arjun Kulkarni", phone: "+91 98345 67891", area: "Karve Road", cardGenerated: true },
  { name: "Meera Joshi", phone: "+91 97654 23451", area: "Prabhat Road", cardGenerated: false },
  { name: "Karan Nair", phone: "+91 99812 34567", area: "Model Colony", cardGenerated: true },
];

export function sessionLabel(s: CampSession) {
  const d = new Date(s.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${s.city} — ${s.chapter} — ${d}`;
}

export function totals() {
  return {
    camps: SESSIONS.length,
    parents: SESSIONS.reduce((a, s) => a + s.parents, 0),
    cards: SESSIONS.reduce((a, s) => a + s.cards, 0),
  };
}
