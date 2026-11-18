import reference from "../reference.json";
import type {
  ChartSnapshot,
  Daily,
  Match,
  Place,
  Product,
  Profile,
  Reading,
  Category,
} from "./contracts";
export const places: Place[] = [
  {
    id: "colombo",
    name: "Colombo",
    country: "Sri Lanka",
    timezone: "Asia/Colombo",
    latitude: 6.9271,
    longitude: 79.8612,
  },
  {
    id: "kandy",
    name: "Kandy",
    country: "Sri Lanka",
    timezone: "Asia/Colombo",
    latitude: 7.2906,
    longitude: 80.6337,
  },
  {
    id: "galle",
    name: "Galle",
    country: "Sri Lanka",
    timezone: "Asia/Colombo",
    latitude: 6.0535,
    longitude: 80.221,
  },
  {
    id: "jaffna",
    name: "Jaffna",
    country: "Sri Lanka",
    timezone: "Asia/Colombo",
    latitude: 9.6615,
    longitude: 80.0255,
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    timezone: "Europe/London",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    id: "melbourne",
    name: "Melbourne",
    country: "Australia",
    timezone: "Australia/Melbourne",
    latitude: -37.8136,
    longitude: 144.9631,
  },
];
export const products: Product[] = [
  {
    id: "graha",
    title: "Graha",
    amountMinor: 99000,
    currency: "LKR",
    credits: 3,
    description: [
      "All four reading categories",
      "Dasha periods and chart details",
      "Life timeline and prediction journal",
      "Create and export PDF reports",
      "3 question credits",
      "Matrimony access after demo verification",
    ],
  },
  {
    id: "jyotisha",
    title: "Jyotisha",
    amountMinor: 249000,
    currency: "LKR",
    credits: 15,
    description: [
      "All Graha reading features",
      "15 question credits",
      "Matrimony access after demo verification",
    ],
  },
  {
    id: "extra_profile",
    title: "Additional profile",
    amountMinor: 49000,
    currency: "LKR",
    credits: 0,
    description: [
      "Create one additional person profile",
      "Save chart views under that person",
    ],
  },
  {
    id: "questions_5",
    title: "5 more questions",
    amountMinor: 49000,
    currency: "LKR",
    credits: 5,
    description: [
      "Add five question credits",
      "Existing charts and readings stay available",
    ],
  },
];
export const categoryInfo: Record<
  Category,
  { title: string; description: string }
> = {
  love: {
    title: "Love & Marriage",
    description: "Relationships, communication and shared plans",
  },
  career: {
    title: "Career",
    description: "Work, learning and professional direction",
  },
  health: {
    title: "Wellbeing",
    description: "Reflection and routines; no medical predictions",
  },
  dosha: {
    title: "Graha Dosha",
    description: "Traditional checks and their qualifying factors",
  },
};
export function makeChart(
  p: Profile,
  kind: ChartSnapshot["kind"],
): ChartSnapshot {
  const source = kind === "rasi" ? { ...reference.rasi, Ve: 7 } : reference.nav;
  const lag = source.La;
  const positions = reference.keys.map((key, i) => {
    const signIndex = source[key as keyof typeof source];
    return {
      bodyId: key,
      label: reference.planets[i],
      sign: reference.signs[signIndex],
      signIndex,
      house: ((signIndex - lag + 12) % 12) + 1,
      longitudeDeg: signIndex * 30 + ((i * 3.17 + 4) % 30),
      degreeLabel:
        kind === "rasi" ? reference.degrees[i] : "Divisional allocation",
      nakshatra: kind === "rasi" ? reference.stars[i] : "Not applicable",
      pada: (i % 4) + 1,
      retrograde: ["Sa", "Ra", "Ke"].includes(key),
    };
  });
  return {
    id: `chart_${p.id}_${p.revision}_${kind}`,
    profileId: p.id,
    profileRevision: p.revision,
    profileName: p.name,
    kind,
    createdAt: new Date().toISOString(),
    method: {
      id: "parashari_demo",
      label: "Parashari · Lahiri · demo fixtures",
      version: "1",
    },
    summary: {
      lagna: reference.signs[lag],
      rashi: "Vrishabha",
      nakshatra: "Rohini",
      lagnaLord: "Shukra",
      moonLord: "Chandra",
    },
    positions,
    cells: Array.from({ length: 12 }, (_, signIndex) => ({
      signIndex,
      house: ((signIndex - lag + 12) % 12) + 1,
      bodies: reference.keys.filter(
        (k) => source[k as keyof typeof source] === signIndex,
      ),
    })),
    dashas: [
      {
        id: "budha",
        lord: "Budha",
        startDate: "2011-01-01",
        endDate: "2028-01-01",
        current: true,
      },
      {
        id: "ketu",
        lord: "Ketu",
        startDate: "2028-01-01",
        endDate: "2035-01-01",
        current: false,
      },
      {
        id: "shukra",
        lord: "Shukra",
        startDate: "2035-01-01",
        endDate: "2055-01-01",
        current: false,
      },
    ],
    source: "mock",
  };
}
export function makeReading(
  p: Profile,
  chart: ChartSnapshot,
  category: Category,
): Reading {
  const meanings = {
    love: {
      headline: "Make room for thoughtful conversations",
      body: "Explore what you value in a relationship and how you communicate it. This sample reading brings together relationship themes, life-period context and your chart reference.",
    },
    career: {
      headline: "Prepare for your next step",
      body: "This sample period favours reviewing work plans, building skills and discussing opportunities. Take decisions using your circumstances alongside the interpretation.",
    },
    health: {
      headline: "Give your routines some attention",
      body: "Use this reading as a reflection on rest, time and everyday routines. A horoscope cannot diagnose illness, predict recovery or replace professional healthcare.",
    },
    dosha: {
      headline: "Understand each check in context",
      body: "Traditional dosha checks have conditions and exceptions. The sample report shows each finding with its basis rather than treating an isolated placement as a certain outcome.",
    },
  };
  return {
    id: `reading_${p.id}_${p.revision}_${category}`,
    profileId: p.id,
    chartSnapshotId: chart.id,
    category,
    title: categoryInfo[category].title,
    ...meanings[category],
    assessment: category === "dosha" ? "mixed" : "supportive",
    factors: [
      {
        id: "natal",
        term: "Kendara / natal chart",
        meaning: `The reading refers to ${chart.summary.lagna} Lagna in the selected demo chart.`,
        basisRef: chart.id,
      },
      {
        id: "period",
        term: "Dasha",
        meaning:
          "Budha is the main period in this fixture timeline. A life period is different from a daily planetary hour.",
        basisRef: chart.id,
      },
      {
        id: "transit",
        term: "Gochara",
        meaning:
          "Dated planetary movement contributes to a period interpretation. These factors are supplied fixtures, not calculated positions.",
        basisRef: chart.id,
      },
    ],
    window:
      category === "health"
        ? null
        : {
            startDate: "2027-01-01",
            endDate: "2027-03-31",
            label: "A period to explore and prepare",
          },
    checks:
      category === "dosha"
        ? [
            { name: "Kuja", result: "Review qualifying factors" },
            { name: "Rahu–Ketu", result: "Mixed sample factors" },
            { name: "Kalasarpa", result: "Not indicated in this fixture" },
          ]
        : [],
    localeUsed: "en",
    source: "mock",
  };
}
function localInstant(
  day: string,
  hour: number,
  minute: number,
  timezone: string,
) {
  const target = Date.parse(
    `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const get = (key: string) => parts.find((p) => p.type === key)!.value;
    const shown = Date.parse(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
    );
    instant += target - shown;
  }
  return new Date(instant).toISOString();
}
export function makeDaily(
  p: Profile,
  chart: ChartSnapshot,
  date: string,
  place: Place,
): Daily {
  const n = Number(date.slice(-2)),
    mixed = n % 2 === 0;
  return {
    id: `daily_${p.id}_${p.revision}_${date}_${place.id}`,
    profileId: p.id,
    chartSnapshotId: chart.id,
    localDate: date,
    place,
    headline: mixed
      ? "Balance progress with preparation"
      : "Make space for useful conversations",
    body: "Take time to listen, revisit a plan and prepare for a conversation that matters. This daily reading combines a natal reference, life-period theme and dated timing factors from the demo service.",
    assessment: mixed ? "mixed" : "supportive",
    lifePeriod: { main: "Budha", sub: "Shukra" },
    panchanga: [
      {
        name: "Lunar day",
        term: "Tithi",
        value: n % 2 ? "Shukla Panchami" : "Shukla Shashthi",
      },
      {
        name: "Weekday",
        term: "Vara",
        value: new Intl.DateTimeFormat("en", {
          weekday: "long",
          timeZone: "UTC",
        }).format(new Date(date + "T12:00:00Z")),
      },
      { name: "Lunar mansion", term: "Nakshatra", value: "Rohini" },
      { name: "Calendar combination", term: "Yoga", value: "Siddha" },
      { name: "Half lunar day", term: "Karana", value: "Bava" },
    ],
    intervals: [
      {
        id: "helpful",
        startAt: localInstant(date, 10, 20, place.timezone),
        endAt: localInstant(date, 11, 5, place.timezone),
        assessment: "supportive",
        activity: "Planning and conversations",
        factors: [
          {
            term: "Hora",
            meaning:
              "A planetary-hour factor supports the selected activity in this fixture.",
          },
          {
            term: "Gochara",
            meaning:
              "A second sample factor is supportive; this is not a guarantee of outcome.",
          },
        ],
      },
      {
        id: "care",
        startAt: localInstant(date, 13, 30, place.timezone),
        endAt: localInstant(date, 15, 0, place.timezone),
        assessment: "care",
        activity: "Allow more time before commitments",
        factors: [
          {
            term: "Rahu Kalaya",
            meaning: "A cautionary calendar interval under the demo rule pack.",
          },
        ],
      },
    ],
    source: "mock",
  };
}
export const matchFixtures: Match[] = [
  [
    "m_anushi",
    "Anushi",
    "28",
    "Kandy",
    "Architect",
    "Reading, hiking, family time",
  ],
  [
    "m_dinuka",
    "Dinuka",
    "31",
    "Colombo",
    "Software engineer",
    "Music, travelling, cooking",
  ],
  [
    "m_nethmi",
    "Nethmi",
    "27",
    "Galle",
    "Teacher",
    "Books, gardening, the coast",
  ],
  ["m_kavindu", "Kavindu", "30", "Colombo", "Designer", "Art, running, coffee"],
  [
    "m_tharushi",
    "Tharushi",
    "29",
    "Melbourne",
    "Researcher",
    "Learning, walks, new places",
  ],
  [
    "m_sahan",
    "Sahan",
    "32",
    "London",
    "Accountant",
    "Cricket, food, long walks",
  ],
].map(([id, name, age, city, occupation, hobbies]) => ({
  id,
  name,
  age: Number(age),
  city,
  occupation,
  about: `A synthetic member profile for exploring Nekath. ${name} enjoys ${hobbies.toLowerCase()}. This is not a real applicant.`,
  interests: hobbies.split(", "),
  initials: name[0],
  compatibility: {
    method: "Traditional compatibility · demo",
    checks: [
      {
        name: "Dina",
        result: "Supportive",
        meaning: "The demo inputs pass this check.",
      },
      {
        name: "Gana",
        result: "Review",
        meaning: "Some traditional conditions need consideration.",
      },
      {
        name: "Rajju",
        result: "Review",
        meaning: "This sample outcome should be read with the complete method.",
      },
    ],
  },
  source: "mock",
}));
