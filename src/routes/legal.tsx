import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "السياسات والشروط — زُلفى" },
      { name: "description", content: "من نحن، سياسة الخصوصية، وشروط استخدام منصة زُلفى مع تفاصيل الضمان والعمولات." },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl px-4 sm:px-6 py-12 w-full space-y-8">
        <section id="about" className="glass rounded-3xl p-8 scroll-mt-24">
          <h2 className="text-3xl font-black text-gradient mb-4">من نحن</h2>
          <p className="text-foreground/85 leading-relaxed">
            زُلفى منصة عربية رائدة للتجارة الإلكترونية تجمع بين البيع التقليدي والمزادات الحية والمحفظة الرقمية في تجربة واحدة.
            نهدف لتمكين البائعين والمشترين العرب من التجارة بأمان وثقة عبر نظام ضمان مبتكر يحمي حقوق جميع الأطراف.
          </p>
        </section>

        <section id="privacy" className="glass rounded-3xl p-8 scroll-mt-24">
          <h2 className="text-3xl font-black text-gradient mb-4">سياسة الخصوصية</h2>
          <ul className="space-y-3 text-foreground/85 leading-relaxed list-disc pr-5">
            <li>نحمي هويتك: لا يتم عرض رقم الهاتف أو الاسم الكامل في الإعلانات أو المحادثات حتى يتم تأكيد الصفقة عبر الضمان.</li>
            <li>يتم استخدام معرّف بديل (Zulfa-User-XXXX) بدلاً من البيانات الشخصية أثناء التفاوض.</li>
            <li>بياناتك مشفّرة ولا تُشارَك مع أطراف ثالثة دون موافقتك الصريحة.</li>
            <li>يحق لك طلب حذف حسابك وبياناتك في أي وقت عبر الدعم الفني.</li>
          </ul>
        </section>

        <section id="terms" className="glass rounded-3xl p-8 scroll-mt-24">
          <h2 className="text-3xl font-black text-gradient mb-4">شروط الاستخدام</h2>
          <h3 className="font-bold text-lg mt-4 mb-2">نظام الضمان (Zulfa Secure Pay)</h3>
          <p className="text-foreground/85 leading-relaxed mb-3">
            عند إتمام عملية الشراء، تُحجز أموال المشتري في المحفظة الآمنة. لا يستلم البائع المبلغ إلا بعد تأكيد المشتري لاستلام السلعة بحالة سليمة.
            في حال وجود نزاع، يتدخل فريق زُلفى ويصدر قراراً عادلاً (ردّ المبلغ أو التحرير).
          </p>
          <h3 className="font-bold text-lg mt-4 mb-2">العمولات</h3>
          <ul className="space-y-2 text-foreground/85 leading-relaxed list-disc pr-5">
            <li>عمولة المنصة الافتراضية: <strong>5%</strong> من قيمة البيع، تُخصم من البائع عند تحرير الضمان.</li>
            <li>الإعلانات المباشرة (السعر الثابت بدون مزاد) قد تكون <strong>مجانية</strong> حتى 3 إعلانات أسبوعياً للزائر العادي.</li>
            <li>المستخدمون المعتمدون والشركاء يحصلون على إعفاءات مخصصة من العمولة.</li>
          </ul>
          <h3 className="font-bold text-lg mt-4 mb-2">المزادات</h3>
          <p className="text-foreground/85 leading-relaxed">
            المزايدة ملزمة. لا يحق للبائع المزايدة على مزاده الخاص. العمولة 5% على سعر الإغلاق النهائي.
          </p>
          <h3 className="font-bold text-lg mt-4 mb-2">المحظورات</h3>
          <ul className="space-y-2 text-foreground/85 leading-relaxed list-disc pr-5">
            <li>المنتجات المحظورة قانونياً.</li>
            <li>الاحتيال أو التلاعب بالمزادات.</li>
            <li>تبادل بيانات الدفع خارج المنصة لتفادي العمولة (يؤدي للحظر الفوري).</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
