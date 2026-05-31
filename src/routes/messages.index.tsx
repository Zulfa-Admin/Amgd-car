import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/messages/")({
  component: Inbox,
});

function Inbox() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations")
      .select("id, updated_at, listing:listings(id, title, images), buyer:profiles!conversations_buyer_id_fkey(id, full_name), seller:profiles!conversations_seller_id_fkey(id, full_name)")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setConvs(data ?? []));
  }, [user]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-black mb-6">الرسائل</h1>
        {convs.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center text-muted-foreground">لا توجد محادثات بعد.</div>
        ) : (
          <div className="space-y-2">
            {convs.map((c) => {
              const other = c.buyer?.id === user?.id ? c.seller : c.buyer;
              return (
                <Link key={c.id} to="/messages/$id" params={{ id: c.id }}
                  className="glass rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition">
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center font-black text-primary-foreground shrink-0">
                    {(other?.full_name || "؟")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{other?.full_name ?? "مستخدم"}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.listing?.title ?? "—"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{timeAgo(c.updated_at)}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
