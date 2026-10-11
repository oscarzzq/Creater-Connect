"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ActivationSheet } from "./activation-sheet";
import { CreatorSheet } from "./creator-sheet";
import { PostReview } from "./post-review";

interface Overlays {
  openCreator: (creatorId: string, setId?: string) => void;
  openActivation: (activationId: string) => void;
  openPost: (postId: string) => void;
}

const Ctx = createContext<Overlays | null>(null);

export function useOverlays() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOverlays must be used inside <OverlayProvider>");
  return ctx;
}

/** Hosts the creator profile, activation sheet and post review for the business app. */
export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [creator, setCreator] = useState<{ id: string; setId?: string } | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [activationId, setActivationId] = useState<string | null>(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);

  const openCreator = useCallback((id: string, setId?: string) => {
    setActivationOpen(false);
    setCreator({ id, setId });
    setCreatorOpen(true);
  }, []);
  const openActivation = useCallback((id: string) => {
    setCreatorOpen(false);
    setPostOpen(false);
    setActivationId(id);
    setActivationOpen(true);
  }, []);
  const openPost = useCallback((id: string) => {
    setActivationOpen(false);
    setPostId(id);
    setPostOpen(true);
  }, []);
  const value = useMemo(() => ({ openCreator, openActivation, openPost }), [openCreator, openActivation, openPost]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CreatorSheet key={`creator-${creator?.id ?? "none"}`} creatorId={creator?.id ?? null} setId={creator?.setId} open={creatorOpen} onOpenChange={setCreatorOpen} onOpenActivation={openActivation} />
      <ActivationSheet key={`act-${activationId ?? "none"}`} activationId={activationId} open={activationOpen} onOpenChange={setActivationOpen} onOpenPost={openPost} onOpenCreator={openCreator} />
      <PostReview key={`post-${postId ?? "none"}`} postId={postId} open={postOpen} onOpenChange={setPostOpen} onOpenActivation={openActivation} />
    </Ctx.Provider>
  );
}
