export interface HowLongToBeatFields {
  hltb_average: number | null;
  hltb_main: number | null;
  hltb_main_extra: number | null;
  hltb_completionist: number | null;
}

export interface HowLongToBeatMetric {
  key: keyof HowLongToBeatFields;
  label: string;
  value: number | null;
}

export function getHowLongToBeatMetrics(
  value: Partial<HowLongToBeatFields> | null | undefined,
): HowLongToBeatMetric[] {
  return [
    {
      key: "hltb_average",
      label: "Average",
      value: value?.hltb_average ?? null,
    },
    { key: "hltb_main", label: "Main Story", value: value?.hltb_main ?? null },
    {
      key: "hltb_main_extra",
      label: "+ Extras",
      value: value?.hltb_main_extra ?? null,
    },
    {
      key: "hltb_completionist",
      label: "100%",
      value: value?.hltb_completionist ?? null,
    },
  ];
}

export function hasHowLongToBeatData(
  value: Partial<HowLongToBeatFields> | null | undefined,
): boolean {
  return getHowLongToBeatMetrics(value).some((metric) => metric.value != null);
}

export function formatHowLongToBeatHours(
  hours: number | null | undefined,
): string {
  if (hours == null || Number.isNaN(hours)) return "—";

  const rounded = Math.round(hours * 10) / 10;
  const display = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
  return `${display}h`;
}
