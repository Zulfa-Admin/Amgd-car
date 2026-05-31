import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ShoppingBag,
  Gavel,
  Wallet,
  Bot,
  ShieldCheck,
  Smartphone,
  MessagesSquare,
  Search,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import heroImg from "@/assets/zolfa-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "زُلفى — السوق العربي للمزادات والتجارة الذكية" },
      {
        name: "description",
        content:
          "زُلفى منصة عربية متكاملة للبيع والشراء والمزادات الحية، مع محفظة رقمية، وكلاء ذكاء اصطناعي، وضمان آمن للمعاملات.",
      },
      { property: "og:title", content: "زُلفى — منصة التجارة والمزادات الذكية" },
      {
        property: "og:description",
        content: "اكتشف الجيل القادم من الأسواق الرقمية العربية.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ShoppingBag, title: "بيع وشراء متكامل", desc: "سيارات، عقارات، منتجات وخدمات في منصة واحدة." },
  { icon: Gavel, title: "مزادات حية", desc: "نظام مزايدة لحظي بعمولة 5% فقط على البائع." },
  { icon: ShieldCheck, title: "ضمان آمن", desc: "حماية الأموال عبر نظام Escrow حتى اكتمال الصفقة." },
  { icon: Search, title: "بحث ذكي", desc: "فلاتر متقدمة وتصنيفات دقيقة للوصول السريع." },
  { icon: MessagesSquare, title: "مراسلات مباشرة", desc: "تواصل آمن بين البائع والمشتري داخل المنصة." },
  { icon: Sparkles, title: "إعلانات مميزة", desc: "خطط مدفوعة لإبراز إعلانات الأعمال والتجار." },
];

const trust = [
  "توثيق هوية البائعين",
  "نظام تقييمات وسمعة شفاف",
  "حماية المدفوعات حتى التسليم",
  "مراقبة احتيال على مدار الساعة",
];

const roadmap = [
  { icon: Wallet, title: "محفظة رقمية", desc: "إيداع وسحب وتحويلات فورية بأمان مصرفي." },
  { icon: Bot, title: "موظفون بالذكاء الاصطناعي", desc: "وكلاء تسويق ومحتوى وتحليلات يعملون 24/7." },
  { icon: Smartphone, title: "تطبيقات الجوال", desc: "تجربة كاملة على iOS و Android قريبًا." },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6">
        <img
          src={heroImg}
          alt=""
          width={1920}
          height={1280}
          className="absolute inset-0 w-full h-full object-cover opacity-40 -z-10"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/30 to-background" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-xs mb-8">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>الجيل القادم من الأسواق العربية الرقمية</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight">
            <span className="text-gradient">زُلفى</span>
            <br />
            <span className="text-foreground">سوقك. مزادك. مستقبلك.</span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            منصة عربية متكاملة تجمع البيع والشراء والمزادات الحية والمحفظة الرقمية في تجربة واحدة آمنة وذكية.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-14 px-8 text-base">
              <Link to="/browse">
                ابدأ التصفح
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="glass border-border h-14 px-8 text-base">
              <Link to="/auth">إنشاء حساب</Link>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { k: "+10K", v: "إعلان نشط" },
              { k: "5%", v: "عمولة المزادات" },
              { k: "24/7", v: "حماية وضمان" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-2xl p-4">
                <div className="text-2xl sm:text-3xl font-black text-gradient">{s.k}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              كل ما تحتاجه <span className="text-gradient">في منصة واحدة</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              تجربة سلسة من اللحظة الأولى حتى إتمام الصفقة.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group glass rounded-3xl p-7 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-5 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="glass rounded-[2.5rem] p-10 sm:p-16 relative overflow-hidden">
            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

            <div className="relative grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-accent text-sm mb-4">
                  <ShieldCheck className="h-4 w-4" />
                  الأمان والثقة
                </div>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                  بيئة موثوقة <span className="text-gradient">لكل صفقة</span>
                </h2>
                <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                  نظام ضمان متكامل يحمي أموالك ويضمن حقوقك من البداية حتى النهاية.
                </p>
              </div>

              <ul className="space-y-4">
                {trust.map((t) => (
                  <li key={t} className="flex items-center gap-4 glass rounded-2xl p-5">
                    <CheckCircle2 className="h-6 w-6 text-accent shrink-0" />
                    <span className="text-lg font-medium">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-xs mb-5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              قريبًا
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              مستقبل <span className="text-gradient">زُلفى</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {roadmap.map((r, i) => (
              <div key={r.title} className="relative glass rounded-3xl p-8 overflow-hidden">
                <div className="absolute top-4 left-4 text-6xl font-black text-foreground/5">
                  0{i + 1}
                </div>
                <r.icon className="h-10 w-10 text-accent mb-6" />
                <h3 className="text-2xl font-bold mb-3">{r.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center relative">
          <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl -z-10" />
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]">
            انضم إلى <span className="text-gradient">ثورة التجارة</span> العربية
          </h2>
          <p className="mt-6 text-xl text-muted-foreground">
            كن من أوائل المنضمين إلى منصة زُلفى واحصل على مزايا حصرية.
          </p>
          <form
            className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="بريدك الإلكتروني"
              className="flex-1 h-14 rounded-2xl glass px-5 text-right outline-none focus:border-primary transition"
            />
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-14 px-8">
              سجّل اهتمامك
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center font-black text-primary-foreground text-sm">
              ز
            </div>
            <span className="font-bold">زُلفى</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 زُلفى. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
