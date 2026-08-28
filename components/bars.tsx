import { clamp } from "@/lib/utils";
import type { Slice } from "@/types";

interface BarsProps {
  slices: Slice[];
  editable?: boolean;
  onChange?: (slices: Slice[]) => void;
}

function redistribute(slices: Slice[], index: number, value: number): Slice[] {
  const total = 100;
  const next = slices.map((slice) => ({ ...slice }));
  next[index].value = clamp(Math.round(value), 0, total);
  const remaining = total - next[index].value;
  const otherIndexes = next.map((_, i) => i).filter((i) => i !== index);
  const otherSum = otherIndexes.reduce((acc, i) => acc + slices[i].value, 0);

  let used = 0;
  otherIndexes.forEach((i, position) => {
    const isLast = position === otherIndexes.length - 1;
    if (isLast) {
      next[i].value = Math.max(0, remaining - used);
    } else if (otherSum === 0) {
      const share = Math.floor(remaining / otherIndexes.length);
      next[i].value = share;
      used += share;
    } else {
      const allocated = Math.round(remaining * (slices[i].value / otherSum));
      next[i].value = allocated;
      used += allocated;
    }
  });
  return next;
}

export function Bars({ slices, editable = false, onChange }: BarsProps) {
  const total = slices.reduce((acc, slice) => acc + slice.value, 0);

  return (
    <div className="bars">
      {slices.map((slice, index) => (
        <div className="bar-row" key={`${slice.name}-${index}`}>
          <span className="bar-name">{slice.name}</span>
          {editable ? (
            <input
              type="range"
              min={0}
              max={100}
              value={slice.value}
              onChange={(event) => {
                const value = Number(event.target.value);
                onChange?.(redistribute(slices, index, value));
              }}
              style={{ width: "100%" }}
            />
          ) : (
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${slice.value}%` }} />
            </div>
          )}
          <span className="bar-value">{slice.value}%</span>
        </div>
      ))}
      <div className="bar-total" data-ok={total === 100}>
        total {total}%
      </div>
    </div>
  );
}
