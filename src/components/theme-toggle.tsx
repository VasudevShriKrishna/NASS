"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Stateless theme toggle: icon visibility is driven purely by the `.dark`
 * class on <html>, so there is no mounted-state / hydration mismatch. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle light / dark theme"
      title="Toggle light / dark theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
    >
      {/* dark theme active → offer light */}
      <Sun className="hidden h-4 w-4 dark:block" />
      {/* light theme active → offer dark */}
      <Moon className="block h-4 w-4 dark:hidden" />
    </Button>
  );
}
