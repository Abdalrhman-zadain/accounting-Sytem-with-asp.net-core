import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PosWaiterOrdersPage = dynamic(
  () =>
    import("@/features/pos/pos-waiter-orders-page").then((mod) => mod.PosWaiterOrdersPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PosWaiterOrdersPage />
      </Suspense>
    </RequireAuth>
  );
}
