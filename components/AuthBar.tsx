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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/leetcode", label: "LeetCode" }
];

export function AuthBar() {
  const { user } = useUser();
  const pathname = usePathname();
  const displayName = user?.username || user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="safe-top-inset sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 text-fg">
        <div className="flex items-center gap-4">
          <p className="font-atlas text-lg">Novelts</p>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-fg-muted hover:bg-accent-soft hover:text-fg"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-2xl border border-accent-border bg-accent-soft px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-accent hover:text-accent-fg">
                Login
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-2xl border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-fg-muted transition hover:border-accent-border hover:text-accent">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            {displayName ? <p className="hidden text-xs text-fg-muted sm:block">{displayName}</p> : null}
            <SignOutButton>
              <button className="rounded-2xl border border-accent-border bg-accent-soft px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-accent hover:text-accent-fg">
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
