export type Role =
  | "super_admin"
  | "studio_admin"
  | "studio_manager"
  | "freelance_photographer"
  | "studio_photographer";


export type SectionKey =
  | "dashboard"
  | "events"
  | "enquiry"
  | "users"
  | "studio"
  | "review"
  | "subscription"
  | "availability"
  | "templates"
  | "transactions"
  | "invoices";

const SECTION_ROLES: Record<SectionKey, Role[]> = {
  dashboard: ["studio_admin", "studio_manager", "freelance_photographer", "studio_photographer"],
  events: ["studio_admin", "studio_manager", "freelance_photographer", "studio_photographer"],
  enquiry: ["studio_admin", "studio_manager"],
  users: ["studio_admin", "studio_manager", "freelance_photographer", "studio_photographer"],
  studio: ["studio_admin", "studio_manager"],
  review: ["studio_admin", "studio_manager", "freelance_photographer", "studio_photographer"],
  subscription: ["studio_admin", "freelance_photographer", "studio_photographer"],
  templates: ["studio_admin", "studio_manager"],
  availability: ["freelance_photographer", "studio_photographer"],
  transactions: ["studio_admin"],
  invoices: ["studio_admin"],
};


const SECTION_ROUTES: Record<SectionKey, string[]> = {
  dashboard: ["/dashboard"],
  events: ["/events"], 
  enquiry: ["/enquiry"],
  users: ["/users"],
  studio: ["/studio"],
  review: ["/review"],
  subscription: ["/subscription"],
  templates: ["/templates"],
  availability: ["/availability"],
  transactions: ["/transactions"],
  invoices: ["/invoices"],
};

export function canAccessSection(role: string | undefined, section: SectionKey): boolean {
  if (role === "super_admin") return true;
  if (!role) return false;
  return SECTION_ROLES[section]?.includes(role as Role) ?? false;
}


export function findSectionForPath(pathname: string): SectionKey | null {
  const entries = Object.entries(SECTION_ROUTES) as [SectionKey, string[]][];
  for (const [section, prefixes] of entries) {
    if (prefixes.some((prefix) => pathname.startsWith(prefix))) {
      return section;
    }
  }
  return null;
}

export function hasRouteAccess(role: string | undefined, pathname: string): boolean {
  const section = findSectionForPath(pathname);
  if (!section) return true; 
  return canAccessSection(role, section);
}