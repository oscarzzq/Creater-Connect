"use client";

import { useId, useState } from "react";
import { Link2, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { actions } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { shortDate } from "@/lib/domain/format";
import type { Campaign, Post } from "@/lib/domain/types";
import { normalizeUrl, urlExample, validatePostUrl } from "./creator-data";

/** Publish organically, then paste the post link so views can be verified. */
export function PublishDialog({ post, campaign, open, onOpenChange }: { post: Post | null; campaign: Campaign | undefined; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{post && campaign && <PublishForm key={post.id} post={post} campaign={campaign} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function PublishForm({ post, campaign, onDone }: { post: Post; campaign: Campaign; onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const id = useId();
  const errId = useId();
  const error = validatePostUrl(url, post.platform);
  const showError = touched && !!error;
  const handle = creatorById(post.creatorId)?.handle;
  const platform = PLATFORMS[post.platform].label;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    actions.publish(post.id, normalizeUrl(url));
    toast.success("Link received", { description: "We're verifying your post. This takes up to 48 hours, then you're paid once every post is verified." });
    onDone();
  }

  const steps = [
    `Post it on ${platform} from ${handle ?? "your own account"} as a normal organic post${post.dueAt ? ` by ${shortDate(post.dueAt)}` : ""}.`,
    "Turn on the platform's paid-partnership label (or add #ad).",
    "Don't boost or promote it. Only organic views count.",
    campaign.guarantee && `Keep it up for at least ${campaign.guarantee.windowDays} days while views are measured.`,
  ].filter((s): s is string => !!s);

  return (
    <form onSubmit={submit} noValidate className="contents">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} />
          Publish &amp; submit your link
        </DialogTitle>
        <DialogDescription>
          {campaign.businessName} · {campaign.name}
        </DialogDescription>
      </DialogHeader>

      <ol className="space-y-2 text-sm">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">{i + 1}</span>
            <span className="text-foreground/85">{s}</span>
          </li>
        ))}
      </ol>

      <div>
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          Link to your published {PLATFORMS[post.platform].format}
        </Label>
        <div className="relative mt-1.5">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url && setTouched(true)}
            placeholder={urlExample(post.platform)}
            aria-invalid={showError || undefined}
            aria-describedby={errId}
            className="h-10 pl-9"
          />
        </div>
        <p id={errId} className={showError ? "mt-1.5 text-xs text-destructive-text" : "mt-1.5 text-xs text-muted-foreground"} role={showError ? "alert" : undefined}>
          {showError ? error : "We read views from the platform once it's verified. Up to 48 hours."}
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="h-10">
          <Radio />
          Submit link
        </Button>
      </DialogFooter>
    </form>
  );
}
