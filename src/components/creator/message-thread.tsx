"use client";

import { useId, useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { actions } from "@/lib/store";
import { shortDate } from "@/lib/domain/format";
import type { Activation, Campaign } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

const TOPICS_OFFER = ["Question about the brief", "Can I film it differently?", "Timeline question"];
const TOPICS_ACTIVE = ["Product hasn't arrived", "Question about the brief", "I need more time", "Problem posting"];

function time(iso: string) {
  const [, t] = iso.split("T");
  const [h, m] = (t ?? "00:00").split(":").map(Number);
  return `${shortDate(iso)}, ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Messages on an activation: questions before accepting, issues during production. */
export function MessageThread({ activation, campaign, readOnly = false, className }: { activation: Activation; campaign: Campaign; readOnly?: boolean; className?: string }) {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const id = useId();
  const brand = campaign.businessName;
  const topics = activation.status === "accepted" ? TOPICS_ACTIVE : TOPICS_OFFER;

  function send() {
    const body = text.trim();
    if (!body) return;
    actions.reply(activation.id, topic ? `${topic}: ${body}` : body, "creator");
    toast.success(`Sent to ${brand}`, { description: "You'll see their reply here." });
    setText("");
    setTopic(null);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {activation.messages.length > 0 ? (
        <ol className="space-y-2.5" aria-label={`Messages with ${brand}`}>
          {activation.messages.map((m) => {
            const mine = m.from === "creator";
            return (
              <li key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                {!mine && <BrandMark campaign={campaign} size="sm" className="mt-0.5" />}
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md bg-muted")}>
                  <span className="sr-only">{mine ? "You" : brand}: </span>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <div className={cn("mt-1 text-[10px] tabular-nums", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{time(m.at)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          {readOnly ? "No messages." : `No messages yet. Ask ${brand} anything about the brief, or tell them if something's wrong.`}
        </p>
      )}

      {!readOnly && (
        <div className="space-y-2">
          <div role="group" aria-label="Topic (optional)" className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={topic === t}
                onClick={() => setTopic(topic === t ? null : t)}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-2.5 text-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  topic === t && "border-primary/40 bg-brand-subtle text-brand-subtle-foreground hover:bg-brand-subtle"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <label htmlFor={id} className="sr-only">
            Message to {brand}
          </label>
          <Textarea
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            rows={2}
            placeholder={activation.status === "accepted" ? "Describe the question or issue…" : "e.g. Can I film this as part of my night routine?"}
            className="resize-none"
          />
          <Button variant="outline" className="h-9 w-full" disabled={!text.trim()} onClick={send}>
            <Send />
            Send to {brand}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AskDialog({ activation, campaign, open, onOpenChange }: { activation: Activation; campaign: Campaign; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="size-4 text-muted-foreground" />
            Ask a question or report an issue
          </DialogTitle>
          <DialogDescription>
            {campaign.businessName} · {campaign.name}. The offer stays as is; this doesn&apos;t change the fee.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <MessageThread activation={activation} campaign={campaign} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
