"use client";

import { useActionState, useRef, useState, useSyncExternalStore, useTransition, type KeyboardEvent } from "react";
import Link from "next/link";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import {
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  type AuthError,
  type AuthResult,
} from "@/app/actions/auth";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { NICHE_OPTIONS } from "@/lib/types";

type Mode = "signin" | "signup";
type Role = "business" | "creator";
type FieldName = "name" | "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Errors handed back by /auth/callback via ?error= */
const URL_ERRORS: Record<string, AuthError> = {
  oauth: { title: "Google sign-in didn't finish", message: "Try again, or sign in with your email and password." },
  profile: {
    title: "We couldn't set up your profile",
    message: "You're signed in with Google, but saving your profile failed. Try again in a moment.",
  },
};

const COPY = {
  business: {
    signin: "Sign in to launch campaigns and track verified views.",
    signup: "Launch your first creator campaign in minutes.",
    emailLabel: "Work email",
    emailPlaceholder: "name@brand.com",
    nameLabel: "Business name",
    namePlaceholder: "Lumen Skin",
  },
  creator: {
    signin: "Sign in to review offers and get paid.",
    signup: "Get offers from brands that fit your audience.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    nameLabel: "Your name",
    namePlaceholder: "Maya Chen",
  },
} as const;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function FormAlert({ error }: { error: AuthError }) {
  return (
    <div role="alert" className="flex gap-2.5 rounded-md border border-destructive/35 bg-destructive-subtle p-3 text-destructive-text">
      <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{error.title}</p>
        <p className="text-xs">{error.message}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-xs text-destructive-text">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

function RoleToggle({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const options: { value: Role; label: string }[] = [
    { value: "business", label: "I'm a brand" },
    { value: "creator", label: "I'm a creator" },
  ];
  const refs = useRef<Record<Role, HTMLButtonElement | null>>({ business: null, creator: null });
  // Radio-group keyboard pattern: arrows move + select, one tab stop.
  const onKeyDown = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next: Role = role === "business" ? "creator" : "business";
    onChange(next);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Account type" onKeyDown={onKeyDown} className="grid grid-cols-2 border border-input-strong">
      {options.map((o) => {
        const selected = role === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[o.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "py-2.5 text-sm font-medium transition-colors outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50",
              selected ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function LoginView({ urlError, initialRole = "business" }: { urlError?: AuthError; initialRole?: Role }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>(initialRole);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showUrlError, setShowUrlError] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const copy = COPY[role];

  const [state, formAction, pending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => (mode === "signin" ? signIn(formData) : signUp(formData)),
    undefined
  );
  const [googleState, googleAction, googlePending] = useActionState(
    async (_prev: AuthResult, formData: FormData) => signInWithGoogle(formData),
    undefined
  );
  const [resetPending, startReset] = useTransition();
  const busy = pending || googlePending;

  const alert = state?.error ?? googleState?.error ?? (showUrlError ? urlError : undefined);

  const focusField = (name: FieldName) => formRef.current?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.focus();

  const clearError = (name: FieldName) => {
    if (!errors[name]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  function validate(form: HTMLFormElement): FieldErrors {
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const next: FieldErrors = {};
    if (mode === "signup" && !String(fd.get("name") ?? "").trim())
      next.name = role === "business" ? "Enter your business name." : "Enter your name.";
    if (!email) next.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email)) next.email = `Enter a full email address, like ${copy.emailPlaceholder}`;
    if (!password) next.password = "Enter your password to continue.";
    else if (mode === "signup" && password.length < 6) next.password = "Use at least 6 characters.";
    return next;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setShowUrlError(false);
    const next = validate(e.currentTarget);
    setErrors(next);
    const first = (["name", "email", "password"] as const).find((f) => next[f]);
    if (first) {
      e.preventDefault();
      focusField(first);
    }
  }

  function onForgot() {
    const email = formRef.current?.querySelector<HTMLInputElement>('[name="email"]')?.value.trim() ?? "";
    if (!EMAIL_RE.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Enter your email above, then select Forgot password." }));
      focusField("email");
      return;
    }
    startReset(async () => {
      const res = await requestPasswordReset(email);
      if (res?.error) toast.error(res.error.title, { description: res.error.message });
      else toast.success("Check your inbox", { description: res?.notice });
    });
  }

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setErrors({});
    setShowUrlError(false);
  }

  const fieldProps = (name: FieldName) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onChange: () => clearError(name),
    className: "h-10 rounded-md bg-background",
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <section className="flex flex-col gap-10 px-6 py-6 sm:px-12 sm:py-10 lg:min-h-screen lg:w-[560px] lg:shrink-0 lg:justify-between lg:px-16 lg:py-12 xl:w-[640px] xl:px-20">
        <Link href="/" aria-label="Creator Connect home" className="w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 lg:mx-0">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-sm text-muted-foreground">{copy[mode]}</p>
          </div>

          {alert && <FormAlert error={alert} />}

          <RoleToggle role={role} onChange={setRole} />

          <form action={googleAction} onSubmit={() => setShowUrlError(false)}>
            <input type="hidden" name="role" value={role} />
            <Button type="submit" variant="outline" disabled={busy} className="h-10 w-full gap-2 border-input-strong">
              {googlePending ? <LoaderCircle className="animate-spin" aria-hidden /> : <GoogleIcon />}
              {googlePending ? "Redirecting to Google…" : "Continue with Google"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or {mode === "signin" ? "sign in" : "sign up"} with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate>
            <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
              <input type="hidden" name="role" value={role} />

              {mode === "signup" && (
                <>
                  <Field id="name" label={copy.nameLabel} error={errors.name}>
                    <Input {...fieldProps("name")} autoComplete={role === "business" ? "organization" : "name"} placeholder={copy.namePlaceholder} />
                  </Field>
                  {role === "creator" && (
                    <Field id="niche" label="Niche">
                      <select
                        id="niche"
                        name="niche"
                        defaultValue="lifestyle"
                        className="h-10 w-full rounded-md border border-input-strong bg-background px-3 text-sm capitalize outline-none hover:border-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                      >
                        {NICHE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </>
              )}

              <Field id="email" label={copy.emailLabel} error={errors.email}>
                <Input {...fieldProps("email")} type="email" autoComplete="email" placeholder={copy.emailPlaceholder} />
              </Field>

              <Field
                id="password"
                label="Password"
                error={errors.password}
                action={
                  mode === "signin" && (
                    <button
                      type="button"
                      onClick={onForgot}
                      disabled={resetPending}
                      className="rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      {resetPending ? "Sending…" : "Forgot password?"}
                    </button>
                  )
                }
              >
                <Input
                  {...fieldProps("password")}
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder={mode === "signin" ? "Enter your password" : "At least 6 characters"}
                />
              </Field>

              <Button type="submit" className="mt-1 h-10 w-full gap-2">
                {pending && <LoaderCircle className="animate-spin" aria-hidden />}
                {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </fieldset>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to Creator Connect? " : "Already have an account? "}
            <button
              type="button"
              onClick={switchMode}
              className="rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <footer className="flex flex-col gap-2 text-xs text-muted-foreground">
          <p>
            Just exploring? Try the demo as{" "}
            <Link href="/business" className="rounded-sm text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              a brand
            </Link>{" "}
            or{" "}
            <Link href="/creator" className="rounded-sm text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              a creator
            </Link>
            .
          </p>
          <p>By continuing, you agree to the Terms of Service and Privacy Policy.</p>
        </footer>
      </section>

      <AuthShowcase />
    </div>
  );
}

const noopSubscribe = () => () => {};

/**
 * Reads ?error= from /auth/callback on the client only. useSyncExternalStore's
 * server snapshot keeps the prerendered shell static, so no Suspense is needed.
 */
export function LoginWithParams() {
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const code = params.get("error");
  const role: Role = params.get("role") === "creator" ? "creator" : "business";
  // key: remount once the client snapshot arrives so ?role= preselects the toggle
  return <LoginView key={role} initialRole={role} urlError={code ? (URL_ERRORS[code] ?? URL_ERRORS.oauth) : undefined} />;
}
