import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Eclipse, Leaf, Sparkles, Check, Flame, Waves, Snowflake, Zap, Heart, Coffee, Crown, Orbit, BookOpen, Smile, Compass, Feather, Sliders, Award, Shield, Activity, Gamepad2, Settings } from "lucide-react";

const themes = [
  { id: "light", name: "Day Mode", icon: Sun, colorClass: "text-amber-500 bg-amber-500/10" },
  { id: "dark-midnight", name: "Midnight Blue", icon: Moon, colorClass: "text-indigo-400 bg-indigo-400/10" },
  { id: "dark-oled", name: "OLED Black", icon: Eclipse, colorClass: "text-neutral-400 bg-neutral-400/10" },
  { id: "dark-forest", name: "Forest Green", icon: Leaf, colorClass: "text-emerald-400 bg-emerald-400/10" },
  { id: "dark-purple", name: "Royal Purple", icon: Sparkles, colorClass: "text-purple-400 bg-purple-400/10" },
  { id: "dark-sunset", name: "Sunset Terracotta", icon: Flame, colorClass: "text-orange-400 bg-orange-400/10" },
  { id: "dark-ocean", name: "Ocean Wave", icon: Waves, colorClass: "text-cyan-400 bg-cyan-400/10" },
  { id: "dark-nordic", name: "Nordic Frost", icon: Snowflake, colorClass: "text-sky-300 bg-sky-300/10" },
  { id: "dark-neon", name: "Cyberpunk Neon", icon: Zap, colorClass: "text-pink-500 bg-pink-500/10" },
  { id: "dark-sakura", name: "Sakura Rose", icon: Heart, colorClass: "text-rose-400 bg-rose-400/10" },
  { id: "dark-mocha", name: "Chocolate Mocha", icon: Coffee, colorClass: "text-yellow-600 bg-yellow-600/10" },
  { id: "dark-crimson", name: "Crimson Velvet", icon: Crown, colorClass: "text-red-500 bg-red-500/10" },
  { id: "dark-nebula", name: "Nebula Abyss", icon: Orbit, colorClass: "text-fuchsia-400 bg-fuchsia-400/10" },
  { id: "light-blue", name: "Light Royal Blue", icon: BookOpen, colorClass: "text-blue-500 bg-blue-500/10" },
  { id: "light-rose", name: "Light Rose Blossom", icon: Smile, colorClass: "text-rose-500 bg-rose-500/10" },
  { id: "light-amber", name: "Light Amber Sunshine", icon: Compass, colorClass: "text-amber-600 bg-amber-600/10" },
  { id: "light-lavender", name: "Light Lavender Fields", icon: Feather, colorClass: "text-purple-500 bg-purple-500/10" },
  { id: "light-slate", name: "Light Sleek Steel", icon: Sliders, colorClass: "text-slate-500 bg-slate-500/10" },
  { id: "dark-gold", name: "Dark Amber Gold", icon: Award, colorClass: "text-yellow-500 bg-yellow-500/10" },
  { id: "dark-coral", name: "Dark Coral Ember", icon: Shield, colorClass: "text-orange-500 bg-orange-500/10" },
  { id: "dark-mint", name: "Dark Mint Fresh", icon: Activity, colorClass: "text-emerald-400 bg-emerald-400/10" },
  { id: "dark-indigo", name: "Dark Electric Indigo", icon: Gamepad2, colorClass: "text-indigo-400 bg-indigo-400/10" },
  { id: "dark-steel", name: "Dark Charcoal Steel", icon: Settings, colorClass: "text-slate-400 bg-slate-400/10" },
];

interface ThemeSwitcherProps {
  mode?: "desktop" | "mobile";
}

export default function ThemeSwitcher({ mode = "desktop" }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/40" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  if (mode === "mobile") {
    return (
      <div className="flex flex-col gap-2 p-3.5 border rounded-xl bg-secondary/10 border-border/50">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          App Theme
        </span>
        <div className="max-h-60 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            {themes.map((t) => {
              const IconComponent = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-semibold border transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                      : "bg-background hover:bg-secondary/50 text-foreground border-border/40 hover:border-primary/20"
                  }`}
                >
                  <div className={`p-1 rounded-lg ${isActive ? "bg-white/20 text-white" : t.colorClass}`}>
                    <IconComponent className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate flex-1">{t.name}</span>
                  {isActive && <Check className="h-3 w-3 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border-border/50 hover:bg-secondary/80 focus-visible:ring-1 focus-visible:ring-primary relative transition-all duration-300"
          title="Switch Theme"
        >
          <CurrentIcon className="h-4.5 w-4.5 transition-transform duration-300 hover:rotate-12" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/50 p-1.5 shadow-xl">
        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5">
          Select Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-border/40" />
        <div className="max-h-80 overflow-y-auto pr-1">
          {themes.map((t) => {
            const IconComponent = t.icon;
            const isActive = theme === t.id;
            return (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 rounded-md ${isActive ? "bg-primary/25 text-primary" : t.colorClass}`}>
                    <IconComponent className="h-3.5 w-3.5" />
                  </div>
                  <span>{t.name}</span>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
