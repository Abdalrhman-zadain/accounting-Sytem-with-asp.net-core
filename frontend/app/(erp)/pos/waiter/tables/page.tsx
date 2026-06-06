import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const TablesPage = dynamic(
  () => import("@/app/(erp)/pos/tables/page").then((mod) => mod.default),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <TablesPage />
      </Suspense>
    </RequireAuth>
  );
}
