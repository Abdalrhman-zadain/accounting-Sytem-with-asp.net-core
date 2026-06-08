"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { RequireAuth } from "@/components/require-auth";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pos/waiter/orders");
  }, [router]);

  return (
    <RequireAuth>
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Redirecting…
      </div>
    </RequireAuth>
  );
}
