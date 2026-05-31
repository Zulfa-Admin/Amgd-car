import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { Gavel } from "lucide-react";

export const Route = createFileRoute("/auctions/")({
  component: AuctionsHub,
  head: () => ({
    meta: [
      { title: "المزادات المباشرة — زُلفى" },
      { name: "description", content: "تصفح المزادات الحية حسب الفئة وشارك في المزايدة لحظياً." },
    ],
  }),
});

function AuctionsHub() {
  const [cats, setCats] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("categories").select("*").order("sort_order");
      setCats(c ?? []);
      const { data: a } = await supabase.from("auctions").select("category_id").eq("status", "active");
      const map: Record<string, number> = {};
      (a ?? []).forEach((r: any) => { map[r.category_id] = (map[r.category_id] ?? 0) + 1; });
      setCounts(map);
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2"><span className="text-gradient">المزادات المباشرة</span></h1>
          <p className="text-muted-foreground">شارك في مزايدات لحظية على السيارات والعقارات والمنتجات والخدمات.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cats.map((c) => (
            <Link key={c.id} to="/auctions/$slug" params={{ slug: c.slug }}
              className="glass rounded-3xl p-6 hover:shadow-glow transition group">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center mb-4 shadow-glow">
                <Gavel className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-xl font-black mb-1">{c.name_ar}</div>
              <div className="text-sm text-muted-foreground">{counts[c.id] ?? 0} مزاد نشط</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
