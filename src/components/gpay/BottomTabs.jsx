"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
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
              {/* Active indicator with layout animation */}
              <AnimatePresence>
                {active && (
                  <motion.div 
                    layoutId="activeTab"
                    className={cn(
                      "absolute -top-0.5 -translate-x-1/2 w-12 h-1 rounded-full",
                      "bg-primary dark:bg-accent/60 dark:animate-arc-pulse"
                    )}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1,animationIterationCount: "2" }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
              </motion.div>
              
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
