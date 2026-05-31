import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, Mail, Shield, FileText, Info } from "lucide-react";
import logo from "@/assets/zulfa-logo.png";

export const ZULFA_PHONE_MAIN = "+967771068888";
export const ZULFA_PHONE_SUPPORT = "+967739988888";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Zulfa" width={48} height={48} className="h-12 w-12" />
            <div>
              <div className="font-black text-xl">زُلفى</div>
              <div className="text-xs text-muted-foreground">السوق العربي الذكي</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            منصة عربية متكاملة للبيع والشراء والمزادات الحية مع نظام ضمان آمن وعمولة 5% فقط.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-3">روابط</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/browse" className="hover:text-foreground">تصفح الإعلانات</Link></li>
            <li><Link to="/auctions" className="hover:text-foreground">المزادات</Link></li>
            <li><Link to="/sell" className="hover:text-foreground">أضف إعلانك</Link></li>
            <li><Link to="/wallet" className="hover:text-foreground">المحفظة</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-3">قانوني</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/legal" hash="about" className="hover:text-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> من نحن</Link></li>
            <li><Link to="/legal" hash="privacy" className="hover:text-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> سياسة الخصوصية</Link></li>
            <li><Link to="/legal" hash="terms" className="hover:text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> شروط الاستخدام</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">اتصل بنا</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-3">تواصل معنا</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={`https://wa.me/${ZULFA_PHONE_MAIN.replace("+", "")}`} className="flex items-center gap-2 hover:text-primary" target="_blank" rel="noopener">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span dir="ltr">{ZULFA_PHONE_MAIN}</span>
                <span className="text-xs text-muted-foreground">واتساب</span>
              </a>
            </li>
            <li>
              <a href={`tel:${ZULFA_PHONE_SUPPORT}`} className="flex items-center gap-2 hover:text-primary">
                <Phone className="h-4 w-4 text-primary" />
                <span dir="ltr">{ZULFA_PHONE_SUPPORT}</span>
                <span className="text-xs text-muted-foreground">دعم فني</span>
              </a>
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              support@zulfa.app
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground space-y-1">
        <div>© 2026 زُلفى — جميع الحقوق محفوظة. منصة عربية رائدة 🇾🇪 🇸🇦</div>
        <div className="font-medium">
          <span dir="rtl">رقم السجل التجاري: 2919</span>
          <span className="mx-2">•</span>
          <span dir="ltr">Commercial Registry No: 2919</span>
        </div>
      </div>
    </footer>
  );
}
