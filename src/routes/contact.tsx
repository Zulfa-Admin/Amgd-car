import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Phone, MessageCircle, Mail, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZULFA_PHONE_MAIN, ZULFA_PHONE_SUPPORT } from "@/components/SiteFooter";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "اتصل بنا — زُلفى" },
      { name: "description", content: "تواصل مع فريق دعم زُلفى عبر الواتساب أو الهاتف. نخدمك على مدار الساعة." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 py-12 w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-gradient mb-3">تواصل معنا</h1>
          <p className="text-muted-foreground">فريق زُلفى جاهز لخدمتك على مدار الساعة</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <a
            href={`https://wa.me/${ZULFA_PHONE_MAIN.replace("+", "")}`}
            target="_blank"
            rel="noopener"
            className="glass rounded-3xl p-7 hover:shadow-glow transition group"
          >
            <div className="h-14 w-14 rounded-2xl bg-[#25D366] grid place-items-center mb-4 group-hover:scale-110 transition">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <div className="text-xs text-muted-foreground mb-1">واتساب — الخط الرئيسي</div>
            <div className="text-2xl font-black" dir="ltr">{ZULFA_PHONE_MAIN}</div>
            <div className="text-sm text-muted-foreground mt-2">للاستفسارات والمبيعات والشراكات</div>
          </a>

          <a
            href={`tel:${ZULFA_PHONE_SUPPORT}`}
            className="glass rounded-3xl p-7 hover:shadow-glow transition group"
          >
            <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center mb-4 group-hover:scale-110 transition">
              <Phone className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-xs text-muted-foreground mb-1">الدعم الفني — Hotline</div>
            <div className="text-2xl font-black" dir="ltr">{ZULFA_PHONE_SUPPORT}</div>
            <div className="text-sm text-muted-foreground mt-2">دعم العملاء والمساعدة التقنية</div>
          </a>

          <div className="glass rounded-3xl p-7">
            <div className="h-14 w-14 rounded-2xl bg-secondary grid place-items-center mb-4">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground mb-1">البريد الإلكتروني</div>
            <div className="text-xl font-bold">support@zulfa.app</div>
          </div>

          <div className="glass rounded-3xl p-7">
            <div className="h-14 w-14 rounded-2xl bg-secondary grid place-items-center mb-4">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground mb-1">ساعات العمل</div>
            <div className="text-xl font-bold">24/7 — على مدار الساعة</div>
            <div className="text-sm text-muted-foreground mt-2">شامل أيام العطل والإجازات</div>
          </div>
        </div>

        <div className="glass rounded-3xl p-7 mt-6 flex items-center gap-4 flex-wrap">
          <MapPin className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <div className="font-bold">المقر الرئيسي</div>
            <div className="text-sm text-muted-foreground">صنعاء — اليمن · نخدم الشرق الأوسط والعالم</div>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/">العودة للرئيسية</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
