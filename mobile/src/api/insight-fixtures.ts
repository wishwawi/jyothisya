import { localDate } from "../dates";
import type {
  BirthTimeSensitivity,
  ChartSnapshot,
  InsightBasis,
  LifeTimeline,
  Place,
  Prediction,
  PredictionJournal,
  Profile,
  Tathkala,
} from "./contracts";

export const insightBasis: InsightBasis = {
  source: "mock",
  method: "Parashari / Lahiri · demonstration v1",
  notice:
    "Illustrative data only. No planetary positions, transits or birth-time uncertainty have been calculated from your details.",
};

export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "1900-01-01" &&
    value <= "2200-12-31" &&
    !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}

export function makeTathkala(
  p: Profile,
  chart: ChartSnapshot,
  day: string,
  time: string,
  place: Place,
): Tathkala {
  return {
    profileId: p.id,
    natalSnapshotId: chart.id,
    localDate: day,
    localTime: time,
    placeId: place.id,
    timezone: place.timezone,
    momentChart: {
      ...chart,
      id: `moment_${p.id}_${p.revision}_${day}_${time}_${place.id}`,
      method: {
        id: "moment_demo",
        label: "Tathkala · sample moment chart",
        version: "1",
      },
    },
    factors: [
      {
        name: "Moon sign",
        value: `${chart.summary.rashi} · sample`,
        meaning: "The Moon’s sign at the selected moment belongs here.",
      },
      {
        name: "Tara bala",
        value: "Sampat · sample",
        meaning:
          "A traditional birth-star to current-star comparison; not calculated in this demo.",
      },
      {
        name: "Chandrashtama",
        value: "Not active · sample",
        meaning:
          "Illustrates whether the Moon occupies the eighth sign from the natal Moon. No alert has been scheduled.",
      },
    ],
    basis: insightBasis,
  };
}

export function makeTimeline(
  p: Profile,
  chart: ChartSnapshot,
  fromDate: string,
  toDate: string,
): LifeTimeline {
  const events: LifeTimeline["events"] = [
    ...chart.dashas.map((d) => ({
      id: `period_${d.id}`,
      kind: "dasha" as const,
      startDate: d.startDate,
      endDate: d.endDate,
      title: `${d.lord} mahadasha`,
      description:
        "Example main-period dates from the saved demo chart. These are not calculated birth-based periods.",
    })),
    {
      id: "saturn_demo",
      kind: "transit",
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      title: "Saturn cycle · sample",
      description:
        "Example transit interval to demonstrate the timeline. It is not a calculated Sade Sati period.",
    },
    {
      id: "eclipse_demo",
      kind: "eclipse",
      startDate: "2029-06-01",
      endDate: "2029-06-01",
      title: "Eclipse marker · sample",
      description:
        "A placeholder event illustrating dated factors. This is not an astronomical eclipse date.",
    },
  ];
  return {
    profileId: p.id,
    chartSnapshotId: chart.id,
    fromDate,
    toDate,
    events: events
      .filter((e) => e.startDate <= toDate && e.endDate >= fromDate)
      .sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
      ),
    basis: insightBasis,
  };
}

export function makeSensitivity(
  p: Profile,
  chart: ChartSnapshot,
  minutes: number,
): BirthTimeSensitivity {
  return {
    profileId: p.id,
    chartSnapshotId: chart.id,
    uncertaintyMinutes: minutes,
    crossesSignBoundary: true,
    samples: [
      {
        offsetMinutes: -minutes,
        ascendant: "Kanya",
        degreeLabel: "29°10′ · sample",
      },
      {
        offsetMinutes: 0,
        ascendant: chart.summary.lagna,
        degreeLabel: "1°40′ · sample",
      },
      {
        offsetMinutes: minutes,
        ascendant: chart.summary.lagna,
        degreeLabel: "4°10′ · sample",
      },
    ],
    basis: insightBasis,
  };
}

export function journalFor(
  profileId: string,
  entries: Prediction[],
  now: number,
): PredictionJournal {
  const own = entries
    .filter((e) => e.profileId === profileId)
    .slice()
    .reverse();
  const hits = own.filter((e) => e.review?.outcome === "hit").length;
  const partials = own.filter((e) => e.review?.outcome === "partial").length;
  const misses = own.filter((e) => e.review?.outcome === "miss").length;
  const reviewed = hits + partials + misses;
  return {
    profileId,
    entries: own,
    summary: {
      total: own.length,
      reviewed,
      hits,
      partials,
      misses,
      due: own.filter(
        (e) => !e.review && localDate(e.timezone, new Date(now)) > e.targetEnd,
      ).length,
      scorePercent: reviewed
        ? Math.round(((hits + partials * 0.5) / reviewed) * 100)
        : null,
    },
  };
}
