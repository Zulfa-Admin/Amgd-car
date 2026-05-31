import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/browse")({
  head: () => ({ meta: [{ title: "تصفح الإعلانات — زُلفى" }] }),
  component: Browse,
});

interface Cat { id: string; slug: string; name_ar: string }
interface Listing {
  id: string; title: string; price: number; currency: string; city: string | null;
  images: string[]; created_at: string; category_id: string;
}

function Browse() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("id, slug, name_ar").is("parent_id", null).order("sort_order")
      .then(({ data }) => setCats(data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase.from("listings").select("id, title, price, currency, city, images, created_at, category_id")
      .eq("status", "active").order("created_at", { ascending: false }).limit(60);
    if (active) query = query.eq("category_id", active);
    if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
    query.then(({ data }) => { setListings(data ?? []); setLoading(false); });
  }, [active, q]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="glass rounded-3xl p-6 mb-6">
          <h1 className="text-3xl font-black mb-4">تصفح الإعلانات</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن سيارة، عقار، خدمة..." className="h-12 pr-10" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" variant={!active ? "default" : "outline"} onClick={() => setActive(null)}
              className={!active ? "bg-gradient-primary text-primary-foreground" : ""}>الكل</Button>
            {cats.map((c) => (
              <Button key={c.id} size="sm" variant={active === c.id ? "default" : "outline"} onClick={() => setActive(c.id)}
                className={active === c.id ? "bg-gradient-primary text-primary-foreground" : ""}>
                {c.name_ar}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جارٍ التحميل...</div>
        ) : listings.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <p className="text-muted-foreground mb-4">لا توجد إعلانات بعد.</p>
            <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/sell">كن أول من ينشر</Link></Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
