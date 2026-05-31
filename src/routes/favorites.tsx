import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/favorites")({
  component: Favs,
});

function Favs() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);
  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("listing:listings(id, title, price, currency, city, images, created_at)")
      .eq("user_id", user.id).then(({ data }) => setItems((data ?? []).map((r: any) => r.listing).filter(Boolean)));
  }, [user]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-black mb-6">المفضلة</h1>
        {items.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center text-muted-foreground">لم تحفظ أي إعلان بعد.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
