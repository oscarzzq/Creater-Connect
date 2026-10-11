"use client";

import { Check } from "lucide-react";
import { shortDate, usd } from "@/lib/domain/format";
import type { Post, PostStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { needsReceipt, type CreatorItem } from "./creator-data";

export type StepState = "done" | "current" | "waiting" | "upcoming";

export interface Step {
  key: string;
  label: string;
  state: StepState;
  detail: string;
}

const AFTER_SUBMIT: PostStatus[] = ["draft_submitted", "revision_requested", "approved", "published", "verified"];
const AFTER_REVIEW: PostStatus[] = ["approved", "published", "verified"];
const LIVE: PostStatus[] = ["published", "verified"];

function count(posts: Post[], statuses: PostStatus[]) {
  return posts.filter((p) => statuses.includes(p.status)).length;
}

/** The 9-step production process, collapsed to the steps that apply to this brief. */
export function productionSteps(item: CreatorItem): Step[] {
  const { activation: a, campaign: c, posts } = item;
  const brand = c.businessName;
  const n = posts.length;
  const of = (k: number) => (n > 1 ? `${k} of ${n} posts` : "");
  const review = c.brief.review.required;
  const steps: (Omit<Step, "state"> & { done: boolean; blockedBy?: "brand" | "platform" })[] = [];

  steps.push({ key: "accept", label: "Accept the offer", done: true, detail: a.respondedAt ? `Accepted ${shortDate(a.respondedAt)}` : "Accepted" });

  if (c.brief.fulfillment.kind !== "none") {
    const kind = c.brief.fulfillment.kind === "ship" ? "product" : "access";
    const done = !needsReceipt(a, c);
    steps.push({
      key: "receive",
      label: c.brief.fulfillment.kind === "ship" ? "Receive the product" : "Get access",
      done,
      blockedBy: !done && a.fulfillment === "pending" ? "brand" : undefined,
      detail: done
        ? `${kind === "product" ? "Product" : "Access"} received`
        : a.fulfillment === "shipped"
          ? `${brand} shipped it. Confirm once it arrives.`
          : `${brand} is preparing your ${kind}. You can confirm as soon as you have it.`,
    });
  }

  const submitted = count(posts, AFTER_SUBMIT);
  steps.push({
    key: "create",
    label: "Create your content",
    done: n > 0 && submitted === n,
    detail: submitted === n && n ? "Done" : `Film to the brief: ${c.brief.videoLength}${c.brief.mandatoryDemo ? `, including the required demo` : ""}.`,
  });

  if (review) {
    steps.push({
      key: "submit",
      label: "Submit your draft",
      done: n > 0 && submitted === n,
      detail: submitted === n && n ? `Sent to ${brand}` : n > 1 ? `${of(submitted)} submitted` : `${brand} approves it before you post.`,
    });
    const revising = posts.filter((p) => p.status === "revision_requested");
    const approved = count(posts, AFTER_REVIEW);
    const inReview = count(posts, ["draft_submitted"]);
    steps.push({
      key: "revise",
      label: "Revisions",
      done: n > 0 && approved === n,
      blockedBy: !revising.length && inReview > 0 ? "brand" : undefined,
      detail: revising.length
        ? `${brand} asked for changes${n > 1 ? ` on ${revising.length} ${revising.length === 1 ? "post" : "posts"}` : ""}.`
        : approved === n && n
          ? posts.some((p) => p.version > 1)
            ? "Approved after changes"
            : "Approved, no changes needed"
          : inReview
            ? `In review with ${brand}${c.brief.review.turnaroundDays ? ` · reply within ${c.brief.review.turnaroundDays}d` : ""}`
            : `Up to ${c.brief.review.revisionRounds} ${c.brief.review.revisionRounds === 1 ? "round" : "rounds"} if ${brand} needs changes.`,
    });
  }

  const live = count(posts, LIVE);
  const nextDue = posts.filter((p) => !LIVE.includes(p.status)).map((p) => p.dueAt).sort()[0];
  steps.push({
    key: "publish",
    label: "Publish organically",
    done: n > 0 && live === n,
    detail: live === n && n ? "Live on your account" : `Post from your own account, no boosting${nextDue ? ` · by ${shortDate(nextDue)}` : ""}.`,
  });
  steps.push({
    key: "link",
    label: "Submit the post link",
    done: n > 0 && live === n,
    detail: live === n && n ? "Link received" : n > 1 ? `${of(live)} linked` : "Paste the link so we can verify views.",
  });

  const verified = count(posts, ["verified"]);
  steps.push({
    key: "verify",
    label: "Verification",
    done: n > 0 && verified === n,
    blockedBy: live > verified ? "platform" : undefined,
    detail: verified === n && n ? "Verified via platform API" : live > verified ? "Checking your post · up to 48h" : "We confirm the post is live and organic, up to 48h.",
  });

  steps.push({
    key: "payment",
    label: "Get paid",
    done: !!item.paidAt,
    detail: item.paidAt ? `${usd(a.fee)} paid ${shortDate(item.paidAt)}` : `${usd(a.fee)} once every post is verified`,
  });

  let currentFound = false;
  return steps.map(({ done, blockedBy, ...s }): Step => {
    if (done) return { ...s, state: "done" };
    if (!currentFound) {
      currentFound = true;
      return { ...s, state: blockedBy ? "waiting" : "current" };
    }
    return { ...s, state: "upcoming" };
  });
}

export function StepTracker({ steps, className }: { steps: Step[]; className?: string }) {
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <div className={className}>
      <div className="flex items-center gap-2" aria-hidden>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {done}/{steps.length}
        </span>
      </div>
      <ol className="mt-4" aria-label={`Production steps, ${done} of ${steps.length} done`}>
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0" aria-current={s.state === "current" || s.state === "waiting" ? "step" : undefined}>
            {i < steps.length - 1 && (
              <span className={cn("absolute top-6 bottom-0 left-[11px] w-px", s.state === "done" ? "bg-success/50" : "bg-border")} aria-hidden />
            )}
            <span
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                s.state === "done" && "bg-success text-white",
                s.state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                s.state === "waiting" && "bg-warning-subtle text-warning-text ring-1 ring-warning/40",
                s.state === "upcoming" && "border bg-card text-muted-foreground"
              )}
              aria-hidden
            >
              {s.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className={cn("text-[13px] font-medium", s.state === "upcoming" && "text-muted-foreground")}>
                {s.label}
                <span className="sr-only">
                  {s.state === "done" ? " (done)" : s.state === "current" ? " (your next step)" : s.state === "waiting" ? " (in progress, nothing needed from you)" : " (upcoming)"}
                </span>
                {s.state === "current" && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase">You</span>}
                {s.state === "waiting" && <span className="ml-2 rounded bg-warning-subtle px-1.5 py-0.5 text-[10px] font-semibold text-warning-text uppercase">In progress</span>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
