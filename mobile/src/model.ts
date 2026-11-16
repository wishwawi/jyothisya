export type Language = "en" | "si" | "ta";
export type Category = "love" | "career" | "health" | "dosha";
export type BirthDraft = {
  name: string;
  dob: string;
  time: string;
  place: string;
  isExample: boolean;
};
export type Profile = BirthDraft & {
  id: string;
  freeCategory?: Category;
  previewCreation: boolean;
};
export type Question = {
  id: string;
  profileId: string;
  text: string;
  answer: string;
  createdAt: string;
};
export type State = {
  version: 1;
  language: Language;
  profiles: Profile[];
  activeId: string | null;
  previewPlan: 0 | 1 | 2;
  questions: Question[];
};
export const emptyDraft: BirthDraft = {
  name: "",
  dob: "",
  time: "",
  place: "",
  isExample: false,
};
export const sampleDraft: BirthDraft = {
  name: "Nimali Perera",
  dob: "1994-08-19",
  time: "06:42",
  place: "Kandy",
  isExample: true,
};
export const initialState: State = {
  version: 1,
  language: "en",
  profiles: [],
  activeId: null,
  previewPlan: 0,
  questions: [],
};
export function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
export function validateBirth(
  d: BirthDraft,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (!d.name.trim()) return "Enter a name for this chart.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dob))
    return "Use YYYY-MM-DD for the birth date.";
  const date = new Date(`${d.dob}T12:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== d.dob ||
    d.dob > today ||
    d.dob < "1900-01-01"
  )
    return "Enter a valid birth date between 1900 and today.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time))
    return "Enter the birth time as HH:MM (24-hour clock).";
  if (!d.place.trim()) return "Choose or enter the town and country of birth.";
  return null;
}
export function addProfile(s: State, d: BirthDraft): State {
  const error = validateBirth(d);
  if (error) throw Error(error);
  const p: Profile = {
    ...d,
    name: d.name.trim(),
    place: d.place.trim(),
    id: id(),
    previewCreation: s.profiles.length > 0,
  };
  return { ...s, profiles: [...s.profiles, p], activeId: p.id };
}
export function locked(s: State, p: Profile, category: Category) {
  return s.previewPlan === 0 && !!p.freeCategory && p.freeCategory !== category;
}
export function openReading(
  s: State,
  profileId: string,
  category: Category,
): State {
  const p = s.profiles.find((p) => p.id === profileId);
  if (!p) throw Error("Choose a saved chart.");
  if (!p.isExample) throw Error("Personal calculations are not connected.");
  if (locked(s, p, category))
    throw Error("Choose a preview plan to explore this reading.");
  return s.previewPlan === 0 && !p.freeCategory
    ? {
        ...s,
        profiles: s.profiles.map((v) =>
          v.id === p.id ? { ...v, freeCategory: category } : v,
        ),
      }
    : s;
}
export function addQuestion(s: State, profileId: string, text: string): State {
  const p = s.profiles.find((p) => p.id === profileId);
  if (!p) throw Error("Choose a saved chart.");
  if (!s.previewPlan) throw Error("Questions are part of the preview plans.");
  if (!text.trim()) throw Error("Type a question first.");
  if (text.trim().length > 2000)
    throw Error("Keep your question within 2000 characters.");
  const answer = p.isExample
    ? "This is a prepared example, not a live chart reading. A full interpretation considers the natal chart, life periods and transits together. The sample chart shows how those supporting factors will appear here."
    : "Your birth details are saved. Personal chart calculations and live answers are not connected yet. No prediction has been calculated for your question.";
  return {
    ...s,
    questions: [
      ...s.questions,
      {
        id: id(),
        profileId,
        text: text.trim(),
        answer,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
export function decodeState(raw: string): State {
  const s = JSON.parse(raw);
  if (
    !s ||
    s.version !== 1 ||
    !["en", "si", "ta"].includes(s.language) ||
    ![0, 1, 2].includes(s.previewPlan) ||
    !Array.isArray(s.profiles) ||
    !Array.isArray(s.questions)
  )
    throw Error("Saved Nekath data could not be read.");
  const seen = new Set();
  for (const p of s.profiles) {
    if (
      !p ||
      typeof p.id !== "string" ||
      seen.has(p.id) ||
      typeof p.name !== "string" ||
      typeof p.place !== "string" ||
      typeof p.isExample !== "boolean" ||
      typeof p.previewCreation !== "boolean" ||
      typeof p.dob !== "string" ||
      typeof p.time !== "string" ||
      validateBirth(p) ||
      (p.freeCategory !== undefined &&
        !["love", "career", "health", "dosha"].includes(p.freeCategory))
    )
      throw Error("Saved chart details could not be read.");
    seen.add(p.id);
  }
  for (const q of s.questions) {
    if (
      !q ||
      typeof q.id !== "string" ||
      !seen.has(q.profileId) ||
      typeof q.text !== "string" ||
      typeof q.answer !== "string" ||
      typeof q.createdAt !== "string"
    )
      throw Error("Saved questions could not be read.");
  }
  return {
    ...s,
    activeId: seen.has(s.activeId) ? s.activeId : (s.profiles[0]?.id ?? null),
  };
}
