import type { ScoreCard } from "@/lib/scoring/schema";

export type ChaseStage = {
  day: number;
  type: "polite" | "firm" | "escalation" | "pre-collections";
  tone: string;
  send_at: string; // ISO
  subject: string;
  body: string;
};

export type ChaseInvoice = {
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  amount_gbp: number;
  due_date: string; // ISO date
  sender_name: string;
  sender_company: string;
};

const TONE: Record<ChaseStage["type"], string> = {
  polite: "Friendly. Assumes oversight.",
  firm: "Firmer. Names the amount and due date.",
  escalation: "Sets a deadline. Mentions next steps.",
  "pre-collections":
    "References the Late Payment of Commercial Debts Act 1998 and the Small Business Commissioner.",
};

function templateForStage(
  day: number,
  type: ChaseStage["type"],
  invoice: ChaseInvoice,
): { subject: string; body: string } {
  const amount = `£${invoice.amount_gbp.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const dueDate = new Date(invoice.due_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  switch (type) {
    case "polite":
      return {
        subject: `Quick reminder: invoice ${invoice.invoice_number}`,
        body: `Hi ${invoice.customer_name},\n\nHope all is well at your end. A quick nudge that invoice ${invoice.invoice_number} for ${amount} was due on ${dueDate} and is showing as unpaid on our side.\n\nIf it is already on its way, please ignore this. Otherwise let me know if there is anything you need from us to release it.\n\nMany thanks,\n${invoice.sender_name}\n${invoice.sender_company}`,
      };
    case "firm":
      return {
        subject: `Invoice ${invoice.invoice_number} — ${amount} now ${day} days overdue`,
        body: `Hi ${invoice.customer_name},\n\nFollowing up on invoice ${invoice.invoice_number} for ${amount}, which was due on ${dueDate} and is now ${day} days overdue.\n\nCould you confirm a payment date this week. If there is a query holding it up, please flag it now and we will resolve it the same day.\n\nThanks,\n${invoice.sender_name}\n${invoice.sender_company}`,
      };
    case "escalation":
      return {
        subject: `Action required: invoice ${invoice.invoice_number}`,
        body: `Hi ${invoice.customer_name},\n\nInvoice ${invoice.invoice_number} for ${amount} remains unpaid, ${day} days past the due date of ${dueDate}.\n\nIf payment is not received within seven days, we will pause further work on your account and proceed to formal recovery. We would much rather avoid that. Please reply today with a settlement date.\n\nRegards,\n${invoice.sender_name}\n${invoice.sender_company}`,
      };
    case "pre-collections":
      return {
        subject: `Final notice before recovery: ${invoice.invoice_number}`,
        body: `Dear ${invoice.customer_name},\n\nInvoice ${invoice.invoice_number} for ${amount}, due on ${dueDate}, is now ${day} days overdue. We have written previously and not received payment.\n\nThis is formal notice that, under the Late Payment of Commercial Debts (Interest) Act 1998, we intend to apply statutory interest, debt recovery costs, and refer the matter to the Small Business Commissioner if payment is not settled in full within five working days.\n\nWe would prefer to resolve this directly. Please contact us today.\n\nYours faithfully,\n${invoice.sender_name}\n${invoice.sender_company}`,
      };
  }
}

export function buildSchedule(
  card: ScoreCard,
  invoice: ChaseInvoice,
): ChaseStage[] {
  const dueMs = new Date(invoice.due_date).getTime();
  const offset = (days: number) =>
    new Date(dueMs + days * 24 * 60 * 60 * 1000).toISOString();

  const days =
    card.tier === "critical"
      ? [3, 7, 14, 21]
      : card.tier === "high"
        ? [7, 14, 21, 28]
        : card.tier === "medium"
          ? [14, 21, 28, 35]
          : [35, 49, 60, 75];

  const types: ChaseStage["type"][] = [
    "polite",
    "firm",
    "escalation",
    "pre-collections",
  ];

  return days.map((day, i) => {
    const type = types[i];
    const { subject, body } = templateForStage(day, type, invoice);
    return {
      day,
      type,
      tone: TONE[type],
      send_at: offset(day),
      subject,
      body,
    };
  });
}
