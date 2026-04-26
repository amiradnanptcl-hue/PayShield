"use server";

import { redirect } from "next/navigation";
import { findDemoCompany } from "@/lib/demo/companies";

export async function scoreFromSearchAction(formData: FormData) {
  const query = String(formData.get("q") ?? "").trim();
  if (!query) {
    redirect("/?empty=1");
  }

  const match = findDemoCompany(query);
  if (!match) {
    redirect(`/?notfound=${encodeURIComponent(query)}`);
  }

  redirect(`/score/${match.slug}`);
}
