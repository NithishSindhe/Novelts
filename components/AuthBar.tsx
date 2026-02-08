"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useUser
} from "@clerk/nextjs";

export function AuthBar() {
  const { user } = useUser();
  const displayName = user?.username || user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="safe-top-inset sticky top-0 z-40 border-b border-cyan-100/20 bg-[#0f1425]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 text-amber-50">
        <p className="font-atlas text-lg">Novelts</p>
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-2xl border border-amber-100/60 bg-amber-200/10 px-3 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-200/20">
                Login
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-2xl border border-cyan-100/40 bg-cyan-200/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-200/20">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            {displayName ? <p className="hidden text-xs text-cyan-100/90 sm:block">{displayName}</p> : null}
            <SignOutButton>
              <button className="rounded-2xl border border-amber-100/60 bg-amber-200/10 px-3 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-200/20">
                Logout
              </button>
            </SignOutButton>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
