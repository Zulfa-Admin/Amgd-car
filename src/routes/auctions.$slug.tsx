import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { formatCountdown } from "@/lib/countdown";
import { Gavel, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/auctions/$slug")({
  component: AuctionsByCategory,
});

function AuctionsByCategory() {
  const { slug } = Route.useParams();
  const [cat, setCat] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      setCat(c);
      if (!c) return;
      const { data } = await supabase
        .from("auctions")
        .select("*, listings(title, images, city)")
        .eq("category_id", c.id)
        .eq("status", "active")
        .order("ends_at", { ascending: true });
      setItems(data ?? []);
    })();

    const ch = supabase.channel(`auctions-${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => {
        // refresh on any change
        supabase.from("auctions").select("*, listings(title, images, city)")
          .eq("status", "active").order("ends_at", { ascending: true })
          .then(({ data }) => data && setItems(data.filter((a: any) => !cat || a.category_id === cat.id)));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <Link to="/auctions" className="text-sm text-muted-foreground hover:text-foreground">← كل المزادات</Link>
        <h1 className="text-3xl font-black mt-3 mb-6">مزادات {cat?.name_ar ?? "..."}</h1>

        {items.length === 0 && (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground">لا توجد مزادات نشطة في هذه الفئة حالياً.</div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((a) => {
            const cd = formatCountdown(a.ends_at);
            return (
              <Link key={a.id} to="/auction/$id" params={{ id: a.id }}
                className="glass rounded-3xl overflow-hidden hover:shadow-glow transition group">
                <div className="aspect-video bg-muted overflow-hidden">
                  {a.listings?.images?.[0] ? (
                    <img src={a.listings.images[0]} alt={a.listings.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="w-full h-full grid place-items-center"><Gavel className="h-10 w-10 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-bold line-clamp-1">{a.listings?.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">السعر الحالي</span>
                    <span className="font-black text-gradient">{formatPrice(a.current_price, a.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="h-3 w-3" /> {a.bid_count} مزايدة</span>
                    <span className={`flex items-center gap-1 ${cd.ended ? "text-destructive" : "text-accent"}`}>
                      <Clock className="h-3 w-3" /> {cd.text}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
