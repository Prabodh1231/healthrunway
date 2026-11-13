import { AlertTriangle, ArrowDown, BadgeCheck, Info, Plus, Check } from "lucide-react";
import type { MedicineMatch } from "@/lib/types";

const rupee = (n: number) => `₹${n.toFixed(2)}`;

export function MatchCard(props: {
  match: MedicineMatch;
  onAdd?: () => void;
  added?: boolean;
  heading?: React.ReactNode;
}) {
  const { brand, generic, releaseMismatch, savingsPct } = props.match;
  const unit = /capsule/i.test(generic.name) ? "cap" : "tab";

  return (
    <div className="card p-4">
      {props.heading}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {brand ? (
            <>
              <div className="font-semibold">{brand.name}</div>
              <div className="truncate text-xs text-muted">
                {brand.maker} · {rupee(brand.price)} for {brand.units}
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold capitalize">{generic.key}</div>
              <div className="text-xs text-muted">
                {generic.brandCount} brands on sale · typical price {generic.brandMedianPerUnit ? rupee(generic.brandMedianPerUnit) : "n/a"}/{unit}
              </div>
            </>
          )}
        </div>
        <div className="tabular shrink-0 text-right text-sm">
          {brand ? `${rupee(brand.perUnit)}/${unit}` : generic.brandMedianPerUnit ? `~${rupee(generic.brandMedianPerUnit)}/${unit}` : ""}
        </div>
      </div>

      <div className="my-2 flex items-center gap-2 text-xs text-muted">
        <ArrowDown size={14} /> same salt and strength at Jan Aushadhi
      </div>

      <div className="flex items-start justify-between gap-3 rounded-xl bg-brand-soft/60 p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-brand-strong">{generic.name}</div>
          <div className="text-xs text-muted">
            Drug code {generic.code} · MRP {rupee(generic.mrp)} for {generic.units}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tabular text-sm font-semibold text-brand-strong">
            {rupee(generic.perUnit)}/{unit}
          </div>
          {savingsPct !== null && savingsPct > 0 && (
            <div className="tabular text-xs font-semibold text-emerald-700">{Math.round(savingsPct * 100)}% less</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {releaseMismatch ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">
            <Info size={13} /> Release type differs (regular vs extended). Ask your pharmacist.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
            <BadgeCheck size={13} /> Same salts and strengths
          </span>
        )}
        {generic.key.includes("+") && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 font-medium text-muted">
            <Info size={13} /> Combination: check your strip lists only these salts
          </span>
        )}
      </div>
      {generic.caution && (
        <p className="mt-2 flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {generic.caution}
        </p>
      )}

      {props.onAdd && (
        <button className="btn btn-ghost mt-3 w-full py-2 text-sm" onClick={props.onAdd} disabled={props.added}>
          {props.added ? (
            <>
              <Check size={15} /> In my list
            </>
          ) : (
            <>
              <Plus size={15} /> Add to my medicine list
            </>
          )}
        </button>
      )}
    </div>
  );
}
