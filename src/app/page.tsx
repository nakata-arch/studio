
"use client";

import { useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { LogIn, Sparkles } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      // ログイン後は「報告」ページへ遷移
      router.push("/report");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6">
      <div className="max-w-md w-full space-y-12 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <Sparkles className="text-primary-foreground w-10 h-10" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            MomentumFlow
          </h1>
          <p className="text-muted-foreground text-lg">
            あなたの時間を整え、理想の未来へ導く<br />
            AIパーソナル時間管理コーチ
          </p>
        </div>

        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-48 w-full">
              <Image
                src="https://picsum.photos/seed/momentum-hero/600/400"
                alt="MomentumFlow Hero"
                fill
                className="object-cover"
                data-ai-hint="calm workspace"
              />
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2 text-left">
                <h3 className="font-semibold text-xl">さあ、始めましょう</h3>
                <p className="text-sm text-muted-foreground">
                  Googleカレンダーと連携して、あなたの24時間を価値あるものに変えます。
                </p>
              </div>
              <Button 
                onClick={handleLogin} 
                className="w-full h-14 text-lg font-medium gap-3 shadow-md hover:shadow-lg transition-all"
                size="lg"
              >
                <LogIn className="w-5 h-5" />
                Googleでログイン
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground px-8">
          続行することで、利用規約およびプライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </div>
  );
}
