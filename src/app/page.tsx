"use client";

import { useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/report");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      console.error("Login failed:", error);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-16 text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center border border-primary/10">
              <Sparkles className="text-primary w-10 h-10 opacity-70" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold font-headline text-foreground">
              MomentumFlow
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              時間を整え、自分をいたわる。<br />
              静かに振り返るための場所。
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Button 
            onClick={handleLogin} 
            className="w-full h-14 rounded-2xl text-base font-medium gap-3 bg-primary/90 hover:bg-primary"
          >
            <LogIn className="w-5 h-5 opacity-70" />
            Googleではじめる
          </Button>
          <p className="text-[10px] text-muted-foreground opacity-60">
            Googleカレンダーの予定を優しく整理します。
          </p>
        </div>
      </div>
    </div>
  );
}