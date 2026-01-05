import { Suspense } from "react";
import SalesClient from "./SalesClient";

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading sales...</div>}>
      <SalesClient />
    </Suspense>
  );
}
