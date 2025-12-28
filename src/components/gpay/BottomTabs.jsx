"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    href: "/",
  },
  {
    id: "history",
    label: "History",
    icon: History,
    href: "/history",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function BottomTabs() {
  const pathname = usePathname();
  
  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/person");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "bottom-nav-item relative",
                active && "active"
              )}
            >
              {/* Active indicator - theme aware */}
              {active && (
                <div className={cn(
                  "absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full",
                  "bg-primary dark:bg-accent dark:animate-arc-pulse"
                )} />
              )}
              
              <Icon className={cn(
                "h-6 w-6 transition-all duration-200",
                active && "scale-110"
              )} strokeWidth={active ? 2.5 : 2} />
              
              <span className={cn(
                "text-[10px] font-medium",
                active && "font-bold"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabs;
