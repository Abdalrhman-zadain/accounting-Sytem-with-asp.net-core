import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PosDeliveryPage = dynamic(
  () => import("@/features/pos").then((mod) => mod.PosDeliveryPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PosDeliveryPage />
      </Suspense>
    </RequireAuth>
  );
}
