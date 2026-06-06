import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PosWaiterOrderPage = dynamic(
  () => import("@/features/pos").then((mod) => mod.PosWaiterOrderPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PosWaiterOrderPage />
      </Suspense>
    </RequireAuth>
  );
}
