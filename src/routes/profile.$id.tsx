import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ListingCard } from "@/components/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { User as UserIcon, MapPin } from "lucide-react";

export const Route = createFileRoute("/profile/$id")({
  component: PublicProfile,
});

function PublicProfile() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("listings").select("*").eq("user_id", id).eq("status", "active").order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setListings(l ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="min-h-screen"><SiteHeader /><div className="text-center py-20 text-muted-foreground">جاري التحميل...</div></div>;
  if (!profile) return <div className="min-h-screen"><SiteHeader /><div className="text-center py-20 text-muted-foreground">المستخدم غير موجود</div></div>;

  const name = profile.full_name || profile.username || "مستخدم";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="glass rounded-3xl p-6 flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-primary grid place-items-center text-3xl font-black text-primary-foreground shadow-glow">
            {name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black">{name}</h1>
            {profile.username && <div className="text-sm text-muted-foreground">@{profile.username}</div>}
            {profile.city && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{profile.city}</div>}
            {profile.bio && <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>}
          </div>
        </div>

        <h2 className="text-xl font-black mt-8 mb-4">إعلانات {name}</h2>
        {listings.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-muted-foreground">لا توجد إعلانات نشطة.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
