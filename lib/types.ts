export type Division = {
  id: string;
  name: string;
};

export type Pc = {
  id: string;
  division_id: string;
  name: string;
  pc_code: string;
};

export type AM = {
  id: string;
  pc_id: string;
  full_name: string;
  am_code: string;
  initials: string;
  color: string;
  daily_goal: number;
  archived_at: string | null;
};

export type DailyReport = {
  id: string;
  am_id: string;
  report_date: string; // ISO date
  acquired: number;
  opened_same_day: number;
  total_opened: number;
  type_t1: number;
  type_t3: number;
  type_gt: number;
  type_sm: number;
  type_sk: number;
  submitted_at: string;
  edited_at: string | null;
};

export type SessionShape = {
  am?: AM & { pc: Pc; division: Division };
  role: "am" | "admin";
  pc?: Pc;
};

export const ACCOUNT_TYPES = [
  { key: "t1", code: "T1", label: "Tier 1",   desc: "Standard savings" },
  { key: "gt", code: "GT", label: "GTCREATE", desc: "Creator account" },
  { key: "t3", code: "T3", label: "Tier 3",   desc: "Full KYC current" },
  { key: "sm", code: "SM", label: "SME",      desc: "Business account" },
  { key: "sk", code: "SK", label: "SKS",      desc: "School fees scheme" },
] as const;

export type TypeKey = (typeof ACCOUNT_TYPES)[number]["key"];
