import { useEffect, useRef, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const ACCENT_OPTIONS = [
  { id: "blue", label: "Blue", swatch: "hsl(220 86% 56%)" },
  { id: "green", label: "Green", swatch: "hsl(155 67% 45%)" },
  { id: "purple", label: "Purple", swatch: "hsl(262 83% 58%)" },
  { id: "orange", label: "Orange", swatch: "hsl(24 95% 52%)" },
  { id: "pink", label: "Pink", swatch: "hsl(330 81% 60%)" },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme, accent, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="theme-trigger"
        aria-label="Theme settings"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Palette className="h-4 w-4" />
      </button>

      <div
        className={cn(
          "glass-secondary glass-noise theme-panel",
          open ? "theme-panel-open" : "theme-panel-closed",
        )}
        role="dialog"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-display font-semibold text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">Pick a mode and accent</p>
          </div>
        </div>

        <div className="theme-toggle mb-4">
          <button
            type="button"
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
            className="flex items-center justify-center gap-2"
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
            className="flex items-center justify-center gap-2"
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Accent</p>
          <div className="flex items-center gap-2">
            {ACCENT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn("theme-swatch", accent === option.id && "is-active")}
                style={{ backgroundColor: option.swatch }}
                onClick={() => setColorTheme(option.id)}
                aria-label={`Switch to ${option.label} theme`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
