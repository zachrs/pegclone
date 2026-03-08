"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
} from "lucide-react";
import type { CampaignTemplateStep } from "@/drizzle/schema";

interface TemplateEditorProps {
  initialName?: string;
  initialDescription?: string;
  initialSteps?: CampaignTemplateStep[];
  onSave: (data: {
    name: string;
    description: string;
    steps: CampaignTemplateStep[];
  }) => Promise<void>;
  saveLabel?: string;
}

const DEFAULT_STEP: () => CampaignTemplateStep = () => ({
  stepNumber: 1,
  name: "",
  delayDays: 0,
  contentItemIds: [],
  reminderEnabled: false,
  maxReminders: 2,
  reminderIntervalHours: 48,
});

export function TemplateEditor({
  initialName = "",
  initialDescription = "",
  initialSteps,
  onSave,
  saveLabel = "Save Template",
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [steps, setSteps] = useState<CampaignTemplateStep[]>(
    initialSteps && initialSteps.length > 0
      ? initialSteps
      : [DEFAULT_STEP()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    const lastStep = steps[steps.length - 1];
    const newDelay = lastStep ? lastStep.delayDays + 30 : 0;
    setSteps([
      ...steps,
      {
        ...DEFAULT_STEP(),
        stepNumber: steps.length + 1,
        delayDays: newDelay,
      },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    const updated = steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  }

  function moveStep(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    const temp = updated[index]!;
    updated[index] = updated[newIndex]!;
    updated[newIndex] = temp;
    setSteps(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  }

  function updateStep(index: number, patch: Partial<CampaignTemplateStep>) {
    setSteps(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    const emptySteps = steps.filter((s) => !s.name.trim());
    if (emptySteps.length > 0) {
      setError("All steps must have a name");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        steps: steps.map((s, i) => ({ ...s, stepNumber: i + 1 })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Template info */}
      <div className="rounded-xl border bg-card p-6 shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Template Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g. Pregnancy Education"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              placeholder="Brief description of the campaign..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl border bg-card p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Steps</h3>
            <p className="text-sm text-muted-foreground">
              Define when each message is sent relative to enrollment.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        </div>

        {/* Timeline visualization */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg bg-muted/50 px-4 py-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && (
                <div className="mx-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-px w-6 bg-border" />
                  <span className="whitespace-nowrap">
                    {step.delayDays - (steps[i - 1]?.delayDays ?? 0)}d
                  </span>
                  <div className="h-px w-6 bg-border" />
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                  {step.name || `Step ${i + 1}`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Day {step.delayDays}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Step cards */}
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-lg border bg-background p-4 transition-shadow hover:shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <span className="text-sm font-medium">
                  Step {i + 1}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveStep(i, "up")}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => moveStep(i, "down")}
                    disabled={i === steps.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeStep(i)}
                    disabled={steps.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Step Name</Label>
                  <Input
                    placeholder="e.g. First Trimester"
                    value={step.name}
                    onChange={(e) =>
                      updateStep(i, { name: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Delay (days from enrollment)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={step.delayDays}
                    onChange={(e) =>
                      updateStep(i, {
                        delayDays: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Content Item IDs (comma-separated)
                  </Label>
                  <Input
                    placeholder="uuid1, uuid2, ..."
                    value={step.contentItemIds.join(", ")}
                    onChange={(e) =>
                      updateStep(i, {
                        contentItemIds: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="h-9"
                  />
                </div>
              </div>

              {/* Reminder settings */}
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={step.reminderEnabled}
                    onCheckedChange={(checked) =>
                      updateStep(i, { reminderEnabled: !!checked })
                    }
                  />
                  <Label
                    className="text-xs cursor-pointer"
                    onClick={() =>
                      updateStep(i, { reminderEnabled: !step.reminderEnabled })
                    }
                  >
                    Enable reminders
                  </Label>
                </div>
                {step.reminderEnabled && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs whitespace-nowrap">
                        Max:
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={step.maxReminders}
                        onChange={(e) =>
                          updateStep(i, {
                            maxReminders: Math.min(
                              5,
                              Math.max(1, parseInt(e.target.value) || 1)
                            ),
                          })
                        }
                        className="h-7 w-16 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs whitespace-nowrap">
                        Every:
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={step.reminderIntervalHours}
                        onChange={(e) =>
                          updateStep(i, {
                            reminderIntervalHours: Math.min(
                              168,
                              Math.max(1, parseInt(e.target.value) || 24)
                            ),
                          })
                        }
                        className="h-7 w-16 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">hrs</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error + Save */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
