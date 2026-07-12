"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Something went wrong. Try again.");
        return;
      }
      router.push("/account");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setPending(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/account" });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in is unavailable right now.");
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onGoogle}
        disabled={pending}
        className="border-border-strong bg-surface text-foreground hover:border-foreground flex w-full items-center justify-center gap-3 rounded-[10px] border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-4">
        <span className="bg-border h-px flex-1" />
        <span className="text-faint font-mono text-[11px] tracking-[0.18em] uppercase">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <Field label="Full name">
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Alex Carter"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@dealership.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="At least 8 characters"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-[10px] px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {pending ? "Please wait" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="text-muted mt-6 text-center text-sm">
        {mode === "signin" ? "New to SELECTCARS?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="text-foreground font-medium underline underline-offset-4"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <style>{`
        .input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          padding: 0.7rem 0.85rem;
          font-size: 0.9rem;
          color: var(--foreground);
          outline: none;
        }
        .input:focus { border-color: var(--foreground); box-shadow: 0 0 0 3px rgba(16,16,16,0.08); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted mb-1.5 block font-mono text-[11px] tracking-[0.16em] uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
