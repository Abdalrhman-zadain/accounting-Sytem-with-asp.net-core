"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/providers/auth-provider";
import { Card } from "@/components/ui";
import { canAccessRoute, getDefaultRoute } from "@/lib/auth-access";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isHydrated, user } = useAuth();
  const isAuthorized = canAccessRoute(user, pathname);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (isHydrated && isAuthenticated && !isAuthorized) {
      router.replace(getDefaultRoute(user));
    }
  }, [isAuthenticated, isAuthorized, isHydrated, router, user]);

  if (!isHydrated) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Restoring session…</p>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <p className="text-sm text-slate-700">This section is gated in the frontend for signed-in users.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm text-gray-900">
          Go to login
        </Link>
      </Card>
    );
  }

  if (!isAuthorized) {
    return (
      <Card>
        <p className="text-sm text-slate-700">This route is outside your assigned access scope.</p>
        <Link href={getDefaultRoute(user)} className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm text-gray-900">
          Go to your workspace
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
