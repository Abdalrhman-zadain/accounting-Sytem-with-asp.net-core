import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PosPage = dynamic(
  () => import("@/features/pos").then((mod) => mod.PosPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PosPage />
      </Suspense>
    </RequireAuth>
  );
}
