"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface AvailabilityBlock {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export const AvailabilityEditor = ({ initialBlocks }: { initialBlocks: AvailabilityBlock[] }) => {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(initialBlocks);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return dayLabels.map((label, index) => ({
      label,
      blocks: blocks.filter((block) => block.dayOfWeek === index),
    }));
  }, [blocks]);

  const addBlock = (dayIndex: number) => {
    setBlocks([
      ...blocks,
      {
        dayOfWeek: dayIndex,
        startTime: "09:00",
        endTime: "10:00",
        active: true,
      },
    ]);
  };

  const updateBlock = (index: number, changes: Partial<AvailabilityBlock>) => {
    setBlocks((prev) => prev.map((block, idx) => (idx === index ? { ...block, ...changes } : block)));
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const save = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      if (!response.ok) {
        const data = await response.json();
        setMessage(data.message ?? "Failed to save availability");
        return;
      }
      const data = await response.json();
      setBlocks(data.blocks);
      setMessage("Saved");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {grouped.map((group, dayIndex) => (
        <div key={group.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-slate-900">{group.label}</p>
            <Button variant="ghost" type="button" onClick={() => addBlock(dayIndex)}>
              Add block
            </Button>
          </div>
          {group.blocks.length === 0 ? (
            <p className="text-sm text-slate-500">No availability</p>
          ) : (
            <div className="space-y-3">
              {group.blocks.map((block) => {
                const blockIndex = blocks.indexOf(block);
                return (
                  <div key={`${block.id ?? blockIndex}`} className="grid gap-2 rounded-lg border border-slate-100 p-3 md:grid-cols-[1fr,1fr,80px,80px] md:items-center">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">Start</label>
                      <Input
                        type="time"
                        value={block.startTime}
                        onChange={(event) => updateBlock(blockIndex, { startTime: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">End</label>
                      <Input
                        type="time"
                        value={block.endTime}
                        onChange={(event) => updateBlock(blockIndex, { endTime: event.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={block.active}
                        onChange={(event) => updateBlock(blockIndex, { active: event.target.checked })}
                      />
                      Active
                    </label>
                    <Button variant="ghost" type="button" onClick={() => removeBlock(blockIndex)}>
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button type="button" loading={loading} onClick={save}>
          Save availability
        </Button>
        {message ? <span className="text-sm text-slate-500">{message}</span> : null}
      </div>
    </div>
  );
};
