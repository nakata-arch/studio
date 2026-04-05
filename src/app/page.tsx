
"use client";

import { useEffect, useState } from "react";
import { signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  LogIn, 
  LayoutGrid, 
  History, 
  BookOpen, 
  CheckCircle2, 
  Heart, 
  MessageCircle,
  AlertTriangle
} from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isPreviewEnv, setIsPreviewEnv] = useState(false);

  useEffect(() => {
    // Check if running in preview environment
    if (typeof window !== "undefined") {
      setIsPreviewEnv(window.location.hostname.includes("cloudworkstations.dev"));
    }

    // Handle redirect result on mount
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login failed:", error);
      if (error.code === "auth/operation-not-allowed") {
        toast({
          variant: "destructive",
          title: "ログインが許可されていません",
          description: "Firebase ConsoleでGoogleログインを有効にしてください。",
        });
      } else if (error.code === "auth/unauthorized-domain") {
        toast({
          variant: "destructive",
          title: "未承認のドメインです",
          description: "Firebase Consoleで現在のドメインを承認済みドメインに追加してください。",
        });
      }
    });
  }, [auth, toast]);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/report");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = () => {
    if (isPreviewEnv) {
      toast({
        variant: "destructive",
        title: "プレビュー環境制限",
        description: "Googleログインは本番ドメイン（web.app）でのみ動作します。デプロイ後に確認してください。",
      });
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    // Ensure no async/await before calling redirect
    signInWithRedirect(auth, provider).catch((error) => {
      console.error("Redirect login trigger failed:", error);
    });
  };

  const heroImage = PlaceHolderImages.find(img => img.id === "landing-hero");

  if (isUserLoading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background font-body text-foreground/80 overflow-x-hidden">
      {/* Hero Section */}
      <section className="px-8 pt-24 pb-20 flex flex-col items-center text-center space-y-12">
        <div className="space-y-6 max-w-sm">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/5 rounded-2rem flex items-center justify-center border border-primary/10">
              <Sparkles className="text-primary w-8 h-8 opacity-60" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold font-headline leading-tight tracking-tight text-foreground">
              本当に大切なことに、<br />時間を使えていますか
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              DAYSは、予定を振り返り、<br />
              時間の使い方を優しく整えるための場所です。
            </p>
          </div>
        </div>

        {isPreviewEnv && (
          <div className="max-w-sm w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-left">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">プレビュー環境での制限</p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Google ログインはセキュリティ制限のためプレビュー環境では動作しません。ログインを試すには、`firebase deploy` でホスティングドメイン（.web.app）に公開してください。
              </p>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm space-y-4">
          <Button 
            type="button"
            onClick={handleLogin} 
            className="w-full h-14 rounded-2xl text-base font-medium gap-3 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/10 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5 opacity-70" />
            Googleでログイン
          </Button>
          <p className="text-[10px] text-muted-foreground opacity-50">
            Googleカレンダーの予定を優しく整理します
          </p>
        </div>

        {heroImage && (
          <div className="relative w-full max-w-md aspect-[4/3] rounded-3rem overflow-hidden shadow-2xl mt-8">
             <Image 
              src={heroImage.imageUrl} 
              alt={heroImage.description}
              fill
              className="object-cover opacity-90"
              data-ai-hint={heroImage.imageHint}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          </div>
        )}
      </section>

      {/* Concept Section */}
      <section className="px-8 py-24 bg-primary/5 flex flex-col items-center text-center space-y-8">
        <div className="max-w-xs space-y-6">
          <h2 className="text-xl font-headline font-bold text-foreground/70">
            予定に追われるのではなく、<br />
            時間の質を見つめ直す
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ただタスクをこなすだけではなく、「緊急ではないけれど、あなたにとって大切なこと」に気づくためのお手伝いをします。
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-8 py-24 space-y-16 max-w-md mx-auto">
        <div className="space-y-12">
          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
              <LayoutGrid className="text-indigo-400 w-6 h-6" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="font-bold text-base text-foreground/80">未来の予定を整理する</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                4つの象限を使って、予定の意味を分類。本当に集中すべきことが、自然と見えてきます。
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center shrink-0">
              <History className="text-rose-400 w-6 h-6" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="font-bold text-base text-foreground/80">過去の予定を振り返る</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                一日の終わりに、できたこと・できなかったことを静かに記録。自分を責めない振り返り。
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
              <BookOpen className="text-emerald-400 w-6 h-6" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="font-bold text-base text-foreground/80">週単位で見直す</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                日々の歩みをAIが優しく要約。あなたの努力を肯定し、次の一歩をそっと支えます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Persistence Section */}
      <section className="px-8 py-24 bg-white/40 border-y border-primary/5">
        <div className="max-w-xs mx-auto text-center space-y-12">
          <h2 className="text-xl font-headline font-bold text-foreground/70">
            無理なく、心地よく
          </h2>
          <div className="grid grid-cols-1 gap-8">
            <div className="flex flex-col items-center space-y-3">
              <CheckCircle2 className="w-6 h-6 text-primary/30" />
              <p className="text-xs font-medium">直感的な操作</p>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <MessageCircle className="w-6 h-6 text-primary/30" />
              <p className="text-xs font-medium">心に響くことばと問いかけ</p>
            </div>
            <div className="flex flex-col items-center space-y-3">
              <Heart className="w-6 h-6 text-primary/30" />
              <p className="text-xs font-medium">自分を責めない設計</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-32 flex flex-col items-center text-center space-y-12">
        <div className="space-y-4 max-w-xs">
          <h2 className="text-2xl font-bold font-headline text-foreground">
            まずは、今日の予定を<br />振り返ってみませんか
          </h2>
          <p className="text-xs text-muted-foreground">
            あなたの時間を、もっと愛おしいものに。
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <Button 
            type="button"
            onClick={handleLogin} 
            className="w-full h-14 rounded-2xl text-base font-medium gap-3 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/10 transition-all active:scale-95"
          >
            <LogIn className="w-5 h-5 opacity-70" />
            Googleではじめる
          </Button>
          <p className="text-[10px] text-muted-foreground opacity-50">
            いつでも、あなたのペースで始められます
          </p>
        </div>
      </section>

      <footer className="py-12 text-center border-t border-primary/5">
        <p className="text-[10px] text-muted-foreground opacity-40 uppercase tracking-widest">
          © 2024 DAYS
        </p>
      </footer>
    </div>
  );
}
