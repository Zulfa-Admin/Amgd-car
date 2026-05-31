import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ListingCard } from "@/components/ListingCard";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState<any>(null);
  const [my, setMy] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => setP(data ?? { id: user.id, full_name: "", username: "", bio: "", city: "", phone: "" }));
    supabase.from("listings").select("id, title, price, currency, city, images, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setMy(data ?? []));
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, full_name: p.full_name, username: p.username, bio: p.bio, city: p.city, phone: p.phone,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
  }

  if (!p) return <div className="min-h-screen"><SiteHeader /></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="glass rounded-3xl p-6">
          <h1 className="text-3xl font-black mb-6 text-gradient">حسابي</h1>
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>الاسم الكامل</Label>
              <Input value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} className="h-11" /></div>
            <div className="space-y-2"><Label>اسم المستخدم</Label>
              <Input value={p.username ?? ""} onChange={(e) => setP({ ...p, username: e.target.value })} className="h-11" /></div>
            <div className="space-y-2"><Label>المدينة</Label>
              <Input value={p.city ?? ""} onChange={(e) => setP({ ...p, city: e.target.value })} className="h-11" /></div>
            <div className="space-y-2"><Label>الهاتف</Label>
              <Input value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} className="h-11" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>نبذة</Label>
              <Textarea value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} rows={3} /></div>
            <Button type="submit" disabled={saving} className="sm:col-span-2 h-12 bg-gradient-primary text-primary-foreground shadow-glow">
              {saving ? "..." : "حفظ"}
            </Button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-black mb-4">إعلاناتي ({my.length})</h2>
          {my.length === 0 ? (
            <div className="glass rounded-3xl p-10 text-center text-muted-foreground">لم تنشر أي إعلان بعد.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {my.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
