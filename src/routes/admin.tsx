import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, CheckCircle2, XCircle, Wallet, ShieldCheck, FileImage, RefreshCw, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, CURRENCIES } from "@/lib/currency";
import { timeAgo } from "@/lib/format";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, listings: 0, convs: 0, pending: 0 });
  const [rates, setRates] = useState<any[]>([]);
  const [rateForm, setRateForm] = useState({ base: "USD", quote: "YER", rate: "" });
  const [flagged, setFlagged] = useState<any[]>([]);

  const FLAG_TOKENS = ["[رقم محظور]", "[رابط محظور]", "[بريد محظور]"];
  const isFlagged = (b: string) => FLAG_TOKENS.some((t) => b.includes(t));

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function loadAll() {
    const [{ data: ls }, { data: ds }, { data: tx }, { data: ks }] = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("manual_deposits").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("kyc_documents").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setListings(ls ?? []);
    setDeposits(ds ?? []);
    setTransactions(tx ?? []);
    setKycDocs(ks ?? []);
    const [u, l, c, p] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("manual_deposits").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setStats({ users: u.count ?? 0, listings: l.count ?? 0, convs: c.count ?? 0, pending: p.count ?? 0 });

    const { data: rs } = await supabase.from("exchange_rates").select("*").order("base_code");
    setRates(rs ?? []);

    const orFilter = "body.ilike.%[رقم محظور]%,body.ilike.%[رابط محظور]%,body.ilike.%[بريد محظور]%";
    const [{ data: pm }, { data: lm }] = await Promise.all([
      supabase.from("plaza_messages").select("id, body, user_id, created_at").or(orFilter).order("created_at", { ascending: false }).limit(50),
      supabase.from("listing_messages").select("id, body, user_id, listing_id, created_at").or(orFilter).order("created_at", { ascending: false }).limit(50),
    ]);
    const merged = [
      ...(pm ?? []).map((m: any) => ({ ...m, source: "plaza" as const })),
      ...(lm ?? []).map((m: any) => ({ ...m, source: "listing" as const })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setFlagged(merged);
  }
  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  async function saveRate(e: React.FormEvent) {
    e.preventDefault();
    const r = Number(rateForm.rate);
    if (!r || r <= 0) return toast.error("سعر صرف غير صالح");
    if (rateForm.base === rateForm.quote) return toast.error("اختر عملتين مختلفتين");
    await supabase.from("exchange_rates").delete().eq("base_code", rateForm.base).eq("quote_code", rateForm.quote);
    const { error } = await supabase.from("exchange_rates").insert({
      base_code: rateForm.base, quote_code: rateForm.quote, rate: r,
    });
    if (error) return toast.error(error.message);
    toast.success("تم تحديث سعر الصرف");
    setRateForm({ ...rateForm, rate: "" });
    loadAll();
  }

  async function deleteFlagged(source: "plaza" | "listing", id: string) {
    const table = source === "plaza" ? "plaza_messages" : "listing_messages";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الرسالة"); loadAll();
  }

  async function approveListing(id: string) {
    const { error } = await supabase.from("listings").update({ approval_status: "approved" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تمت الموافقة"); loadAll();
  }
  async function rejectListing(id: string) {
    const reason = prompt("سبب الرفض:") ?? "";
    const { error } = await supabase.from("listings").update({ approval_status: "rejected", rejection_reason: reason }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الرفض"); loadAll();
  }
  async function toggleCommissionExempt(id: string, current: boolean) {
    const { error } = await supabase.from("listings").update({ commission_exempt: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(current ? "تم تفعيل العمولة" : "تم إعفاء الإعلان من العمولة"); loadAll();
  }
  async function delListing(id: string) {
    if (!confirm("حذف الإعلان؟")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); loadAll();
  }
  async function confirmDeposit(id: string) {
    const { error } = await supabase.rpc("confirm_manual_deposit", { _deposit_id: id });
    if (error) return toast.error(error.message);
    toast.success("تم تأكيد الإيداع وشحن المحفظة"); loadAll();
  }
  async function rejectDeposit(id: string) {
    const note = prompt("سبب الرفض:") ?? "";
    const { error } = await supabase.from("manual_deposits").update({ status: "rejected", admin_note: note }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم رفض الطلب"); loadAll();
  }
  async function refundTx(id: string) {
    const reason = prompt("سبب الاسترجاع:") ?? "";
    const { error } = await supabase.rpc("refund_escrow_funds", { _tx_id: id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("تم استرجاع المبلغ للمشتري"); loadAll();
  }
  async function releaseTx(id: string) {
    const { error } = await supabase.rpc("release_escrow_funds", { _tx_id: id });
    if (error) return toast.error(error.message);
    toast.success("تم تحرير المبلغ للبائع"); loadAll();
  }
  async function reviewKyc(id: string, approve: boolean) {
    const note = approve ? undefined : (prompt("سبب الرفض:") ?? undefined);
    const { error } = await supabase.rpc("review_kyc", { _doc_id: id, _approve: approve, _note: note });
    if (error) return toast.error(error.message);
    toast.success(approve ? "تم توثيق الحساب" : "تم رفض الوثيقة"); loadAll();
  }
  async function viewProof(bucket: "deposit-proofs" | "kyc-docs", path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data) return toast.error("تعذر فتح الصورة");
    window.open(data.signedUrl, "_blank");
  }

  if (loading) return <div className="min-h-screen"><SiteHeader /></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col"><SiteHeader />
      <div className="flex-1 mx-auto max-w-md px-4 py-20 text-center glass rounded-3xl">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p>لا تملك صلاحية الوصول لهذه الصفحة.</p>
      </div>
      <SiteFooter />
    </div>
  );

  const pendingListings = listings.filter((l) => l.approval_status === "pending");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 space-y-6 w-full">
        <h1 className="text-3xl font-black text-gradient">مركز التحكم — Zulfa Command</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { k: "المستخدمون", v: stats.users },
            { k: "الإعلانات", v: stats.listings },
            { k: "المحادثات", v: stats.convs },
            { k: "إيداعات معلقة", v: stats.pending },
          ].map((s) => (
            <div key={s.k} className="glass rounded-2xl p-5">
              <div className="text-xs text-muted-foreground">{s.k}</div>
              <div className="text-3xl font-black text-gradient mt-1">{s.v}</div>
            </div>
          ))}
        </div>

        {pendingListings.length > 0 && (
          <div className="glass rounded-3xl p-4">
            <h2 className="text-xl font-bold mb-4">إعلانات بانتظار الموافقة ({pendingListings.length})</h2>
            <div className="space-y-2">
              {pendingListings.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{formatMoney(Number(l.price), l.currency)} · {timeAgo(l.created_at)}</div>
                  </div>
                  <Button size="sm" onClick={() => approveListing(l.id)} className="bg-green-600 text-white"><CheckCircle2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => rejectListing(l.id)} className="text-destructive"><XCircle className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass rounded-3xl p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5" /> طلبات الإيداع اليدوي</h2>
          <div className="space-y-2">
            {deposits.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات</p>}
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{formatMoney(Number(d.amount), d.currency)} <span className="text-xs text-muted-foreground">عبر {d.gateway}</span></div>
                  <div className="text-xs text-muted-foreground">المرجع: {d.reference ?? "—"} · {timeAgo(d.created_at)} · <span className="font-mono">{d.user_id.slice(0, 8)}</span></div>
                </div>
                {d.proof_url && (
                  <Button size="sm" variant="outline" onClick={() => viewProof("deposit-proofs", d.proof_url)}>
                    <FileImage className="h-4 w-4" />
                  </Button>
                )}
                {d.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => confirmDeposit(d.id)} className="bg-green-600 text-white"><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => rejectDeposit(d.id)} className="text-destructive"><XCircle className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${d.status === "confirmed" ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>{d.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> طلبات توثيق الهوية (KYC)</h2>
          <div className="space-y-2">
            {kycDocs.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات</p>}
            {kycDocs.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{k.doc_type} · <span className="font-mono text-xs">{k.user_id.slice(0,8)}</span></div>
                  <div className="text-xs text-muted-foreground">{timeAgo(k.created_at)} {k.admin_note ? `· ${k.admin_note}` : ""}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => viewProof("kyc-docs", k.file_url)}>
                  <FileImage className="h-4 w-4" />
                </Button>
                {k.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => reviewKyc(k.id, true)} className="bg-green-600 text-white"><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => reviewKyc(k.id, false)} className="text-destructive"><XCircle className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full ${k.status === "approved" ? "bg-green-500/20 text-green-700" : "bg-destructive/20 text-destructive"}`}>
                    {k.status === "approved" ? "موثّق" : "مرفوض"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <h2 className="text-xl font-bold mb-4">معاملات الضمان</h2>
          <div className="space-y-2">
            {transactions.length === 0 && <p className="text-sm text-muted-foreground">لا توجد معاملات</p>}
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{formatMoney(Number(t.amount), t.currency)} <span className="text-xs text-muted-foreground">— عمولة {formatMoney(Number(t.commission_amount), t.currency)}</span></div>
                  <div className="text-xs text-muted-foreground">{t.status} · {timeAgo(t.created_at)}</div>
                </div>
                {(t.status === "funded" || t.status === "pending") && (
                  <>
                    <Button size="sm" onClick={() => releaseTx(t.id)} className="bg-green-600 text-white">تحرير</Button>
                    <Button size="sm" variant="outline" onClick={() => refundTx(t.id)} className="text-destructive">استرجاع</Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <h2 className="text-xl font-bold mb-4">جميع الإعلانات</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {listings.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{l.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(Number(l.price), l.currency)} · {l.approval_status} · {l.commission_exempt ? "بدون عمولة" : "5%"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toggleCommissionExempt(l.id, l.commission_exempt)} className="text-xs">
                  {l.commission_exempt ? "تفعيل عمولة" : "إعفاء"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => delListing(l.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><RefreshCw className="h-5 w-5" /> أسعار الصرف اليدوية</h2>
          <form onSubmit={saveRate} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
            <select value={rateForm.base} onChange={(e) => setRateForm({ ...rateForm, base: e.target.value })}
              className="h-11 rounded-md bg-input border border-border px-3">
              {CURRENCIES.map((c) => <option key={c} value={c}>من {c}</option>)}
            </select>
            <select value={rateForm.quote} onChange={(e) => setRateForm({ ...rateForm, quote: e.target.value })}
              className="h-11 rounded-md bg-input border border-border px-3">
              {CURRENCIES.map((c) => <option key={c} value={c}>إلى {c}</option>)}
            </select>
            <Input type="number" step="0.0001" min="0" placeholder="السعر" value={rateForm.rate}
              onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} className="h-11" />
            <Button type="submit" className="h-11 bg-gradient-primary text-primary-foreground">حفظ</Button>
          </form>
          <div className="space-y-1">
            {rates.length === 0 && <p className="text-sm text-muted-foreground">لا توجد أسعار محفوظة بعد.</p>}
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm">
                <span className="font-mono">{r.base_code} → {r.quote_code}</span>
                <span className="font-bold">{Number(r.rate).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.fetched_at)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-destructive" /> رقابة المحادثات (الرسائل المحجوبة)
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            رسائل تحتوي على أرقام تواصل أو روابط أو بريد إلكتروني تم حجبها تلقائياً بواسطة فلتر الخصوصية.
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {flagged.length === 0 && <p className="text-sm text-muted-foreground">لا توجد رسائل محجوبة.</p>}
            {flagged.map((m) => (
              <div key={`${m.source}-${m.id}`} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-secondary">{m.source === "plaza" ? "الساحة" : "إعلان"}</span>
                    <span className="font-mono">{m.user_id?.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{timeAgo(m.created_at)}</span>
                  </div>
                  <div className="text-sm break-words">{m.body}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => deleteFlagged(m.source, m.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
