import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PosMarketPage = dynamic(
  () => import("@/features/pos-market").then((mod) => mod.PosMarketPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PosMarketPage />
      </Suspense>
    </RequireAuth>
  );
}
