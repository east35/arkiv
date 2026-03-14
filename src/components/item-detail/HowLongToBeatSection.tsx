import { cn } from "@/lib/utils";
import {
  formatHowLongToBeatHours,
  getHowLongToBeatMetrics,
  hasHowLongToBeatData,
  type HowLongToBeatFields,
} from "@/lib/howlongtobeat";

interface HowLongToBeatSectionProps {
  value: Partial<HowLongToBeatFields> | null | undefined;
  isLoading?: boolean;
  className?: string;
}

export function HowLongToBeatSection({
  value,
  isLoading,
  className,
}: HowLongToBeatSectionProps) {
  if (!isLoading && !hasHowLongToBeatData(value)) return null;

  const metrics = getHowLongToBeatMetrics(value);

  return (
    <section className={cn("space-y-5 md:space-y-6", className)}>
      <div className="text-foreground tx-sm mb-3">How Long To Beat</div>
      <div className="grid grid-cols-2 overflow-hidden  md:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            // className={cn(
            //   index % 2 === 0 && "border-r border-border/55 md:border-r",
            //   index < 2 && "border-b border-border/55 md:border-b-0",
            //   index === 1 && "md:border-r",
            //   index === 2 && "md:border-r  px-2",
            //   index === 3 && "border-r-0  px-2",
            // )}
          >
            <div className="text-muted-foreground tx-sm">{metric.label}</div>
            <div className="flex items-end gap-1.5 tracking-[-0.05em] pb-4 md:pb-0">
              {isLoading ? (
                <span className="text-3xl font-bold tracking-tight text-muted-foreground/30 animate-pulse">
                  ––
                </span>
              ) : (
                <>
                  <span className="text-3xl font-bold tracking-tight">
                    {formatHowLongToBeatHours(metric.value).replace(/h$/, "")}
                  </span>
                  {metric.value != null && !Number.isNaN(metric.value) && (
                    <span className="text-sm text-muted-foreground font-normal">
                      h
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
