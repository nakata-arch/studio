
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
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6 mb-1", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
