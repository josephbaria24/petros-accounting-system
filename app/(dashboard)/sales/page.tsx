//app/(dashboard)/sales/page.tsx
import { Suspense } from "react";
import SalesClient from "./SalesClient";
import { createServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function SalesPage() {
  const supabase = await createServer();
  
  // Auth guard - check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="p-6">Loading sales...</div>}>
      <SalesClient />
    </Suspense>
  );
}