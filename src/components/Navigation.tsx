"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, BookOpen, ListTodo, ClipboardCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/report", label: "報告", icon: ClipboardCheck },
    { href: "/classify", label: "分類", icon: ListTodo },
    { href: "/events", label: "予定", icon: Calendar },
    { href: "/weekly", label: "日記", icon: BookOpen },
    { href: "/settings", label: "設定", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-primary/5 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all duration-300",
                isActive ? "text-primary translate-y-[-2px]" : "text-muted-foreground opacity-50 hover:opacity-100"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn("text-[9px] font-bold tracking-tight mt-1", !isActive && "opacity-0 scale-90")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}