import type { ScoreCard, ScoreInput } from "@/lib/scoring/schema";

export type DemoCompany = {
  /** What the user types — fuzzy matched. */
  query_aliases: string[];
  /** Companies House style number, even when the company is fictional. */
  number: string;
  name: string;
  registered_office: string;
  sector: string;
  /** Stable URL slug. */
  slug: string;
  input: ScoreInput;
  card: ScoreCard;
};

/* ---------------------------------------------------------------------- *
 *  BrightPlumb Ltd  —  fictional, the live-pitch anchor.                 *
 * ---------------------------------------------------------------------- */

const brightplumb: DemoCompany = {
  query_aliases: ["brightplumb", "bright plumb", "bright plumb ltd"],
  number: "11223344",
  name: "BrightPlumb Ltd",
  registered_office: "Unit 4, Forge Way, Leeds, LS11 5DG",
  sector: "Plumbing & heating contractor",
  slug: "brightplumb-ltd-11223344",
  input: {
    company: {
      name: "BrightPlumb Ltd",
      number: "11223344",
      sic_codes: ["43220"],
      incorporated_on: "2019-08-14",
      status: "active",
      accounts: {
        next_due: "2026-05-30",
        overdue: false,
        last_made_up_to: "2024-08-31",
      },
    },
    payment_practices: [
      {
        period_start: "2025-07-01",
        period_end: "2025-12-31",
        avg_days_to_pay: 71,
        pct_paid_within_30: 22,
        pct_paid_31_to_60: 31,
        pct_paid_over_60: 47,
        pct_paid_late: 47,
      },
      {
        period_start: "2025-01-01",
        period_end: "2025-06-30",
        avg_days_to_pay: 54,
        pct_paid_within_30: 41,
        pct_paid_31_to_60: 35,
        pct_paid_over_60: 24,
        pct_paid_late: 28,
      },
    ],
    officers: [
      {
        name: "Mr James Holdsworth",
        role: "director",
        appointed_on: "2019-08-14",
        resigned_on: null,
      },
      {
        name: "Ms Priya Sharma",
        role: "director / CFO",
        appointed_on: "2026-03-14",
        resigned_on: null,
      },
      {
        name: "Mr Daniel Reece",
        role: "director / CFO",
        appointed_on: "2022-05-02",
        resigned_on: "2026-03-14",
      },
    ],
    charges: [
      {
        classification: "Floating charge",
        status: "outstanding",
        delivered_on: "2026-02-08",
      },
      {
        classification: "Floating charge",
        status: "outstanding",
        delivered_on: "2026-04-02",
      },
    ],
    network: {
      director_churn_12m: 3,
      cfo_changed_recently: true,
      disqualified_in_network: 0,
      insolvent_neighbours: 1,
      phoenix_pattern_score: 1,
    },
  },
  card: {
    score: 78,
    tier: "critical",
    predicted_days_to_pay: 67,
    headline:
      "Multiple distress signals stacking — collapsed payment practices, fresh CFO churn, two new charges in 90 days. Treat as critical.",
    reasoning: [
      {
        signal: "Payment practices worsening H2",
        weight: 9,
        evidence:
          "47% of invoices paid late in H2 2025 vs 28% in H1. Average days to pay rose from 54 to 71.",
      },
      {
        signal: "CFO change filed 14 March 2026",
        weight: 7,
        evidence:
          "Daniel Reece (CFO) resigned, replaced by Priya Sharma the same day. Three director changes in 12 months.",
      },
      {
        signal: "Two floating charges in 90 days",
        weight: 6,
        evidence:
          "Charges register filed 8 February and 2 April 2026 — both still outstanding. Suggests fresh debt or factoring.",
      },
      {
        signal: "Sector benchmark exceeded",
        weight: 5,
        evidence:
          "Construction (SIC 43220) sector benchmark is 67 days; BrightPlumb runs at 71.",
      },
      {
        signal: "One insolvent neighbour in network",
        weight: 3,
        evidence:
          "James Holdsworth also directs Forge Mechanical Ltd, which entered administration in November 2025.",
      },
    ],
    action: {
      deposit_pct: 50,
      terms_days: 7,
      chase_from_day: 3,
      escalation_at_day: 14,
      rationale:
        "Half upfront, weekly terms, or decline the job. Chase from day 3, escalate day 14, Small Business Commissioner referral drafted.",
    },
  },
};

/* ---------------------------------------------------------------------- *
 *  Tesco PLC — large blue-chip, low risk.                                 *
 * ---------------------------------------------------------------------- */

const tesco: DemoCompany = {
  query_aliases: ["tesco", "tesco plc", "00445790"],
  number: "00445790",
  name: "Tesco PLC",
  registered_office: "Tesco House, Welwyn Garden City, AL7 1GA",
  sector: "Retail · supermarkets",
  slug: "tesco-plc-00445790",
  input: {
    company: {
      name: "Tesco PLC",
      number: "00445790",
      sic_codes: ["47110"],
      incorporated_on: "1947-11-27",
      status: "active",
      accounts: {
        next_due: "2026-11-30",
        overdue: false,
        last_made_up_to: "2025-02-28",
      },
    },
    payment_practices: [
      {
        period_start: "2025-09-01",
        period_end: "2026-02-28",
        avg_days_to_pay: 28,
        pct_paid_within_30: 81,
        pct_paid_31_to_60: 16,
        pct_paid_over_60: 3,
        pct_paid_late: 9,
      },
      {
        period_start: "2025-03-01",
        period_end: "2025-08-31",
        avg_days_to_pay: 30,
        pct_paid_within_30: 78,
        pct_paid_31_to_60: 18,
        pct_paid_over_60: 4,
        pct_paid_late: 11,
      },
    ],
    officers: [
      {
        name: "Mr Ken Murphy",
        role: "director / CEO",
        appointed_on: "2020-09-01",
        resigned_on: null,
      },
      {
        name: "Mr Imran Nawaz",
        role: "director / CFO",
        appointed_on: "2023-04-12",
        resigned_on: null,
      },
    ],
    charges: [],
    network: {
      director_churn_12m: 0,
      cfo_changed_recently: false,
      disqualified_in_network: 0,
      insolvent_neighbours: 0,
      phoenix_pattern_score: 0,
    },
  },
  card: {
    score: 22,
    tier: "low",
    predicted_days_to_pay: 29,
    headline:
      "Stable practices, payments inside 30 days for 81% of invoices, no governance signals.",
    reasoning: [
      {
        signal: "Strong payment practices",
        weight: 9,
        evidence:
          "81% of invoices paid within 30 days in H2 2025, average 28 days. Trend stable across both periods.",
      },
      {
        signal: "No director churn",
        weight: 6,
        evidence:
          "Stable board. CEO and CFO both in role over 2 years. No disqualifications or insolvency in network.",
      },
      {
        signal: "Accounts current and filed on time",
        weight: 4,
        evidence:
          "Last accounts to 28 February 2025, next due 30 November 2026. No overdue filings.",
      },
    ],
    action: {
      deposit_pct: 0,
      terms_days: 30,
      chase_from_day: 35,
      escalation_at_day: 60,
      rationale:
        "Invoice as standard. Chase sequence dormant, fires only if payment slips past day 35.",
    },
  },
};

/* ---------------------------------------------------------------------- *
 *  Highgate Joinery Ltd — distressed, critical risk.                      *
 * ---------------------------------------------------------------------- */

const highgate: DemoCompany = {
  query_aliases: ["highgate", "highgate joinery", "highgate joinery ltd"],
  number: "09887766",
  name: "Highgate Joinery Ltd",
  registered_office: "12 Grange Lane, Sheffield, S2 4SU",
  sector: "Joinery · construction subcontractor",
  slug: "highgate-joinery-09887766",
  input: {
    company: {
      name: "Highgate Joinery Ltd",
      number: "09887766",
      sic_codes: ["43320"],
      incorporated_on: "2015-11-02",
      status: "active",
      accounts: {
        next_due: "2025-11-30",
        overdue: true,
        last_made_up_to: "2024-02-29",
      },
    },
    payment_practices: [
      {
        period_start: "2025-07-01",
        period_end: "2025-12-31",
        avg_days_to_pay: 92,
        pct_paid_within_30: 11,
        pct_paid_31_to_60: 24,
        pct_paid_over_60: 65,
        pct_paid_late: 71,
      },
      {
        period_start: "2025-01-01",
        period_end: "2025-06-30",
        avg_days_to_pay: 76,
        pct_paid_within_30: 19,
        pct_paid_31_to_60: 32,
        pct_paid_over_60: 49,
        pct_paid_late: 58,
      },
    ],
    officers: [
      {
        name: "Mr Robert Vance",
        role: "director",
        appointed_on: "2015-11-02",
        resigned_on: null,
      },
      {
        name: "Mrs Ann Vance",
        role: "director / CFO",
        appointed_on: "2026-01-22",
        resigned_on: null,
      },
      {
        name: "Mr Liam Spencer",
        role: "director / CFO",
        appointed_on: "2024-08-01",
        resigned_on: "2026-01-22",
      },
      {
        name: "Mr Carl Fenton",
        role: "director",
        appointed_on: "2025-03-12",
        resigned_on: "2025-09-04",
      },
    ],
    charges: [
      {
        classification: "Fixed and floating charge",
        status: "outstanding",
        delivered_on: "2025-10-15",
      },
      {
        classification: "Floating charge",
        status: "outstanding",
        delivered_on: "2026-02-01",
      },
      {
        classification: "Floating charge",
        status: "outstanding",
        delivered_on: "2026-03-30",
      },
    ],
    network: {
      director_churn_12m: 4,
      cfo_changed_recently: true,
      disqualified_in_network: 1,
      insolvent_neighbours: 2,
      // Highgate was incorporated in 2015 — too old to match the v1.1
      // Phoenix-pattern fingerprint (under-18-months trigger). One mild
      // structural-overlap signal only.
      phoenix_pattern_score: 1,
    },
  },
  card: {
    score: 87,
    tier: "critical",
    predicted_days_to_pay: 104,
    headline:
      "Overdue accounts, three new charges, and a disqualified director in the network. Treat as critical.",
    reasoning: [
      {
        signal: "Overdue accounts at Companies House",
        weight: 9,
        evidence:
          "Annual accounts due 30 November 2025 not yet filed. Last made up to 29 February 2024 — almost 14 months overdue.",
      },
      {
        signal: "71% of invoices paid late H2 2025",
        weight: 9,
        evidence:
          "Average days to pay rose from 76 to 92 between H1 and H2 2025. Sector benchmark is 67.",
      },
      {
        signal: "Three new charges registered in six months",
        weight: 7,
        evidence:
          "Two floating charges and one fixed-and-floating filed since October 2025, all outstanding. Suggests refinancing under pressure.",
      },
      {
        signal: "Director churn and CFO change",
        weight: 6,
        evidence:
          "Four officer changes in twelve months including a CFO swap on 22 January 2026 and a director resigning after six months.",
      },
      {
        signal: "Disqualified officer in 2-hop network",
        weight: 5,
        evidence:
          "Robert Vance previously co-directed Highgate Building Co Ltd with Mr Brian Naylor, currently disqualified until 2027.",
      },
      {
        signal: "Two insolvent neighbours",
        weight: 4,
        evidence:
          "Two companies in the director network entered insolvency proceedings in 2024-2025.",
      },
    ],
    action: {
      deposit_pct: 50,
      terms_days: 7,
      chase_from_day: 3,
      escalation_at_day: 14,
      rationale:
        "Half upfront, weekly terms, or decline the job. Chase from day 3, escalate day 14, Small Business Commissioner referral drafted.",
    },
  },
};

/* ---------------------------------------------------------------------- *
 *  Meadow & Vale Architects LLP — healthy mid-cap, medium risk.           *
 * ---------------------------------------------------------------------- */

const meadow: DemoCompany = {
  query_aliases: ["meadow", "meadow vale", "meadow & vale", "meadow and vale"],
  number: "OC382211",
  name: "Meadow & Vale Architects LLP",
  registered_office: "44 Cheapside, Bristol, BS1 4ES",
  sector: "Architectural services",
  slug: "meadow-vale-architects-OC382211",
  input: {
    company: {
      name: "Meadow & Vale Architects LLP",
      number: "OC382211",
      sic_codes: ["71111"],
      incorporated_on: "2012-04-22",
      status: "active",
      accounts: {
        next_due: "2026-09-30",
        overdue: false,
        last_made_up_to: "2025-03-31",
      },
    },
    payment_practices: [
      {
        period_start: "2025-04-01",
        period_end: "2025-09-30",
        avg_days_to_pay: 47,
        pct_paid_within_30: 52,
        pct_paid_31_to_60: 33,
        pct_paid_over_60: 15,
        pct_paid_late: 22,
      },
      {
        period_start: "2024-10-01",
        period_end: "2025-03-31",
        avg_days_to_pay: 44,
        pct_paid_within_30: 56,
        pct_paid_31_to_60: 31,
        pct_paid_over_60: 13,
        pct_paid_late: 19,
      },
    ],
    officers: [
      {
        name: "Ms Helen Vale",
        role: "designated member",
        appointed_on: "2012-04-22",
        resigned_on: null,
      },
      {
        name: "Mr Tomasz Meadow",
        role: "designated member",
        appointed_on: "2012-04-22",
        resigned_on: null,
      },
    ],
    charges: [
      {
        classification: "Floating charge",
        status: "satisfied",
        delivered_on: "2022-06-04",
      },
    ],
    network: {
      director_churn_12m: 0,
      cfo_changed_recently: false,
      disqualified_in_network: 0,
      insolvent_neighbours: 0,
      phoenix_pattern_score: 0,
    },
  },
  card: {
    score: 38,
    tier: "medium",
    predicted_days_to_pay: 48,
    headline:
      "Slightly above sector benchmark with 22% paid late, otherwise a clean record.",
    reasoning: [
      {
        signal: "Average days to pay above benchmark",
        weight: 6,
        evidence:
          "47 days versus a professional services benchmark of 42. Practice has been consistent across H1 and H2.",
      },
      {
        signal: "22% of invoices paid late H2",
        weight: 5,
        evidence:
          "Up from 19% in H1 2024-25. Mostly the 31-60 day band rather than severe lateness.",
      },
      {
        signal: "Stable governance",
        weight: 5,
        evidence:
          "Two original designated members still in role since 2012. No officer changes in twelve months.",
      },
      {
        signal: "No active charges",
        weight: 3,
        evidence:
          "Single 2022 floating charge already satisfied. No insolvency or disqualifications in the network.",
      },
    ],
    action: {
      deposit_pct: 20,
      terms_days: 21,
      chase_from_day: 14,
      escalation_at_day: 21,
      rationale:
        "Take a small deposit, tighten terms. Friendly chase from day 14, firmer reminder at day 21.",
    },
  },
};

/* ---------------------------------------------------------------------- *
 *  Halford Bros (Builders) Ltd — late payer with PPR data, high risk.     *
 * ---------------------------------------------------------------------- */

const halford: DemoCompany = {
  query_aliases: ["halford", "halford bros", "halford brothers"],
  number: "08765432",
  name: "Halford Bros (Builders) Ltd",
  registered_office: "Unit 22, Aire Valley Estate, Bradford, BD4 8RU",
  sector: "Construction · main contractor",
  slug: "halford-bros-builders-08765432",
  input: {
    company: {
      name: "Halford Bros (Builders) Ltd",
      number: "08765432",
      sic_codes: ["41201"],
      incorporated_on: "2013-09-16",
      status: "active",
      accounts: {
        next_due: "2026-06-30",
        overdue: false,
        last_made_up_to: "2024-09-30",
      },
    },
    payment_practices: [
      {
        period_start: "2025-04-01",
        period_end: "2025-09-30",
        avg_days_to_pay: 81,
        pct_paid_within_30: 18,
        pct_paid_31_to_60: 30,
        pct_paid_over_60: 52,
        pct_paid_late: 55,
      },
      {
        period_start: "2024-10-01",
        period_end: "2025-03-31",
        avg_days_to_pay: 73,
        pct_paid_within_30: 24,
        pct_paid_31_to_60: 33,
        pct_paid_over_60: 43,
        pct_paid_late: 49,
      },
    ],
    officers: [
      {
        name: "Mr Stephen Halford",
        role: "director",
        appointed_on: "2013-09-16",
        resigned_on: null,
      },
      {
        name: "Mr Patrick Halford",
        role: "director",
        appointed_on: "2013-09-16",
        resigned_on: null,
      },
      {
        name: "Ms Olivia Burgess",
        role: "director / Finance",
        appointed_on: "2024-11-04",
        resigned_on: null,
      },
    ],
    charges: [
      {
        classification: "Fixed charge",
        status: "outstanding",
        delivered_on: "2024-02-12",
      },
      {
        classification: "Floating charge",
        status: "outstanding",
        delivered_on: "2025-08-19",
      },
    ],
    network: {
      director_churn_12m: 1,
      cfo_changed_recently: false,
      disqualified_in_network: 0,
      insolvent_neighbours: 0,
      phoenix_pattern_score: 0,
    },
  },
  card: {
    score: 71,
    tier: "high",
    predicted_days_to_pay: 79,
    headline:
      "Construction late payer. 55% paid late and worsening; sector benchmark already breached.",
    reasoning: [
      {
        signal: "55% of invoices paid late H2",
        weight: 9,
        evidence:
          "Up from 49% in H1. Average days to pay rose from 73 to 81 across the same period.",
      },
      {
        signal: "Sector benchmark exceeded",
        weight: 7,
        evidence:
          "Construction (SIC 41201) benchmark is 67 days; Halford runs at 81 — fourteen days slower.",
      },
      {
        signal: "Active fixed and floating charges",
        weight: 5,
        evidence:
          "Two outstanding charges, the most recent filed August 2025. Consistent with leveraged operation.",
      },
      {
        signal: "Governance stable but small finance team",
        weight: 3,
        evidence:
          "Founders Stephen and Patrick Halford still in place since 2013. Olivia Burgess joined finance in November 2024.",
      },
    ],
    action: {
      deposit_pct: 40,
      terms_days: 14,
      chase_from_day: 7,
      escalation_at_day: 14,
      rationale:
        "Substantial deposit, short window. Chase from day 7, escalation tone at day 14, recovery prep at day 28.",
    },
  },
};

/* ---------------------------------------------------------------------- */

export const DEMO_COMPANIES: DemoCompany[] = [
  brightplumb,
  tesco,
  highgate,
  meadow,
  halford,
];

export function findDemoCompany(query: string): DemoCompany | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  for (const c of DEMO_COMPANIES) {
    if (c.number.toLowerCase() === q) return c;
    if (c.slug === q) return c;
    if (c.name.toLowerCase() === q) return c;
    if (c.query_aliases.some((a) => a.toLowerCase() === q)) return c;
  }

  for (const c of DEMO_COMPANIES) {
    if (c.name.toLowerCase().includes(q)) return c;
    if (c.query_aliases.some((a) => a.toLowerCase().includes(q))) return c;
  }

  return null;
}

export function findDemoCompanyById(id: string): DemoCompany | null {
  return DEMO_COMPANIES.find((c) => c.slug === id || c.number === id) ?? null;
}

/** Surface candidates for the autocomplete dropdown. */
export function searchDemoCompanies(query: string, limit = 6): DemoCompany[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = DEMO_COMPANIES.map((c) => {
    const fields = [
      c.name.toLowerCase(),
      c.number.toLowerCase(),
      c.sector.toLowerCase(),
      ...c.query_aliases.map((a) => a.toLowerCase()),
    ];
    let score = 0;
    for (const f of fields) {
      if (f === q) score = Math.max(score, 1000);
      else if (f.startsWith(q)) score = Math.max(score, 500);
      else if (f.includes(q)) score = Math.max(score, 200);
    }
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);

  return scored;
}
