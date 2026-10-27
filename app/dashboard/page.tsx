
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RouteManager from "./route-manager";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#10100f] px-5 py-8 text-[#f0eee9]">
      <RouteManager />
    </main>
  );
}
