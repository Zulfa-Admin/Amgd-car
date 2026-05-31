import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Heart, MessageSquare, Plus, Search, Shield, User as UserIcon, LogOut, Gavel, Wallet, Megaphone } from "lucide-react";
import logo from "@/assets/zulfa-logo.png";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 inset-x-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 my-3 flex items-center justify-between glass rounded-2xl">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Zulfa" width={40} height={40} className="h-10 w-10" />
          <span className="text-xl font-black tracking-tight text-gradient">زُلفى</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/browse" className="hover:text-foreground transition flex items-center gap-1.5">
            <Search className="h-4 w-4" /> تصفح
          </Link>
          <Link to="/auctions" className="hover:text-foreground transition flex items-center gap-1.5">
            <Gavel className="h-4 w-4" /> المزادات
          </Link>
          <Link to="/plaza" className="hover:text-foreground transition flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" /> الساحة
          </Link>
          {user && (
            <>
              <Link to="/wallet" className="hover:text-foreground transition flex items-center gap-1.5">
                <Wallet className="h-4 w-4" /> المحفظة
              </Link>
              <Link to="/favorites" className="hover:text-foreground transition flex items-center gap-1.5">
                <Heart className="h-4 w-4" /> المفضلة
              </Link>
              <Link to="/messages" className="hover:text-foreground transition flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> الرسائل
              </Link>
              <Link to="/profile" className="hover:text-foreground transition flex items-center gap-1.5">
                <UserIcon className="h-4 w-4" /> حسابي
              </Link>
              {isAdmin && (
                <Link to="/admin" className="hover:text-accent transition flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> الإدارة
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                <Link to="/sell">
                  <Plus className="h-4 w-4" /> أضف إعلان
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/auth">دخول / تسجيل</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
