"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Send, Users2, Megaphone, Settings, Shield, LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { href: "/admin/request",    label: "Request a report", icon: Send },
  { href: "/admin/teams",      label: "Teams & AMs",      icon: Users2 },
  { href: "/admin/campaigns",  label: "Campaigns",        icon: Megaphone },
  { href: "/admin/settings",   label: "Settings",         icon: Settings },
];

// Paths that should render WITHOUT the shell (full-screen flows).
const BARE_PATH_PREFIXES = ["/admin/onboarding", "/admin/retention/export"];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bare = BARE_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  if (bare) return <>{children}</>;

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const activeIdx = NAV.findIndex((n) => pathname.startsWith(n.href));
  const activeLabel = NAV[activeIdx]?.label ?? "";

  return (
    <>
      {/* Global override: admin pages span the full viewport, not the 430px AM body. */}
      <style>{`
        body { max-width: 100vw !important; }
      `}</style>

      <div className="fixed inset-0 flex flex-col" style={{ background: "var(--color-bg)" }}>
        {/* Top brand bar */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-5 py-3"
          style={{
            background: "linear-gradient(135deg, var(--color-brand-red), var(--color-brand-red-d))",
            color: "white",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.16)", color: "white" }}
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
            <div className="font-black text-[22px]" style={{ letterSpacing: "-0.035em" }}>
              Log<span style={{ color: "var(--color-brand-gold)" }}>It</span>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-black text-[10px]"
              style={{ background: "rgba(255,200,0,0.2)", color: "var(--color-brand-gold)", letterSpacing: "0.12em" }}
            >
              <Shield className="w-3 h-3" /> ADMIN
            </span>
          </div>
          <button
            onClick={signOut}
            className="hidden md:inline-flex font-extrabold text-[12px] items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ background: "rgba(255,255,255,0.14)", border: "1.5px solid rgba(255,255,255,0.18)", color: "white" }}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar — desktop persistent, mobile drawer */}
          <aside
            className="flex-shrink-0 flex-col"
            style={{
              width: 240,
              background: "white",
              borderRight: "1px solid var(--color-line)",
              display: drawerOpen ? "flex" : undefined,
              position: drawerOpen ? "fixed" : undefined,
              top: drawerOpen ? 0 : undefined,
              left: drawerOpen ? 0 : undefined,
              bottom: drawerOpen ? 0 : undefined,
              zIndex: drawerOpen ? 100 : undefined,
            }}
            data-collapsed-on-mobile
          >
            {drawerOpen && (
              <div className="px-5 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-line)" }}>
                <div className="font-black text-[18px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.025em" }}>
                  Log<span style={{ color: "var(--color-brand-red)" }}>It</span> · Admin
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#F1F5F9", color: "var(--color-ink)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-extrabold text-[13px] transition-colors"
                    style={{
                      background: active ? "rgba(206,17,38,0.08)" : "transparent",
                      color: active ? "var(--color-brand-red)" : "var(--color-body)",
                      letterSpacing: "-0.005em",
                      borderLeft: active ? "3px solid var(--color-brand-red)" : "3px solid transparent",
                      paddingLeft: active ? 10 : 13,
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 md:hidden" style={{ borderTop: "1px solid var(--color-line)", paddingTop: 12 }}>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 font-extrabold text-[13px]"
                style={{ background: "transparent", color: "var(--color-brand-red)" }}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} />
                <span>Sign out</span>
              </button>
            </div>
          </aside>

          {/* Backdrop for mobile drawer */}
          {drawerOpen && (
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 99 }}
            />
          )}

          {/* Main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="md:hidden flex items-center justify-center px-4 py-2.5 flex-shrink-0"
              style={{ background: "white", borderBottom: "1px solid var(--color-line)" }}
            >
              <div className="font-black text-[13px]" style={{ color: "var(--color-ink)", letterSpacing: "-0.015em" }}>
                {activeLabel}
              </div>
            </div>

            <main className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
              <div className="mx-auto" style={{ maxWidth: 920, padding: "22px 20px 60px" }}>
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          aside[data-collapsed-on-mobile] {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
