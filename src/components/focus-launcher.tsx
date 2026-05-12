import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOCUS_PRESETS,
  loadFocusPrefs,
  saveActiveSprint,
  saveFocusPrefs,
} from "@/lib/focus-store";

export function FocusLauncher({ moduleNames }: { moduleNames: string[] }) {
  const navigate = useNavigate();
  const prefs = loadFocusPrefs();
  const [presetId, setPresetId] = useState<string>(prefs.lastPresetId);
  const [module, setModule] = useState<string>(prefs.lastModule ?? "");
  const [topic, setTopic] = useState<string>("");
  const [customFocus, setCustomFocus] = useState<number>(prefs.customFocusMin);
  const [customBreak, setCustomBreak] = useState<number>(prefs.customBreakMin);

  const isCustom = presetId === "custom";
  const focusMin = isCustom
    ? Math.max(1, Math.min(180, customFocus || 25))
    : FOCUS_PRESETS.find((p) => p.id === presetId)?.focusMin ?? 25;
  const breakMin = isCustom
    ? Math.max(0, Math.min(60, customBreak || 5))
    : FOCUS_PRESETS.find((p) => p.id === presetId)?.breakMin ?? 5;

  const handleStart = () => {
    const now = Date.now();
    saveActiveSprint({
      startedAt: now,
      focusMs: focusMin * 60 * 1000,
      breakMs: breakMin * 60 * 1000,
      module: module || undefined,
      topic: topic.trim() || undefined,
      presetId,
      pausedTotalMs: 0,
      phase: "focus",
      phaseStartedAt: now,
    });
    saveFocusPrefs({
      lastPresetId: presetId,
      lastModule: module || undefined,
      customFocusMin: customFocus,
      customBreakMin: customBreak,
    });
    navigate({ to: "/focus/sprint" });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pink">
          <Sparkles className="h-3 w-3" /> Focus sprint
        </div>
        <h3 className="mt-2 text-2xl font-normal text-foreground">
          Ready for some{" "}
          <span className="italic text-gradient-tentra">deep work?</span>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a preset, name your topic, and we'll do the rest.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FOCUS_PRESETS.map((p) => {
            const active = presetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-pink/60 bg-gradient-pink-blue/10 shadow-glow"
                    : "border-border bg-background/40 hover:border-pink/40 hover:bg-card"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-pink">
                  {p.label.split(" ")[0]}
                </div>
                <div className="mt-1 font-display text-2xl text-foreground">
                  {p.focusMin}
                  <span className="text-base text-muted-foreground"> / {p.breakMin}m</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {p.focusMin}m focus · {p.breakMin}m break
                </div>
              </button>
            );
          })}

          <button
            onClick={() => setPresetId("custom")}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all sm:col-span-2 ${
              isCustom
                ? "border-pink/60 bg-gradient-pink-blue/10 shadow-glow"
                : "border-dashed border-border bg-background/40 hover:border-pink/40"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-pink">
              Custom
            </div>
            {isCustom ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cf">Focus (min)</Label>
                  <Input
                    id="cf"
                    type="number"
                    min={1}
                    max={180}
                    value={customFocus}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCustomFocus(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cb">Break (min)</Label>
                  <Input
                    id="cb"
                    type="number"
                    min={0}
                    max={60}
                    value={customBreak}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCustomBreak(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Set your own focus & break lengths.
              </div>
            )}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={module || "__none"}
              onValueChange={(v) => setModule(v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">General study</SelectItem>
                {moduleNames.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Consideration in contract"
              maxLength={120}
            />
          </div>
        </div>

        <Button
          onClick={handleStart}
          className="mt-6 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
          size="lg"
        >
          <Play className="mr-2 h-4 w-4" />
          Start {focusMin}m focus sprint
        </Button>
      </div>
    </div>
  );
}
