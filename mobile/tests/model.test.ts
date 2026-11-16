import test from "node:test";
import assert from "node:assert/strict";
import {
  addProfile,
  addQuestion,
  decodeState,
  initialState,
  locked,
  openReading,
  sampleDraft,
  validateBirth,
} from "../src/model";
test("birth validation rejects invalid dates, missing place and impossible times", () => {
  assert.equal(validateBirth(sampleDraft), null);
  for (const dob of ["2025-02-29", "2099-01-01", "not a date"])
    assert.ok(validateBirth({ ...sampleDraft, dob }));
  assert.ok(validateBirth({ ...sampleDraft, time: "24:05" }));
  assert.ok(validateBirth({ ...sampleDraft, place: "" }));
});
test("sample and personal records stay distinct and existing charts are retained", () => {
  const first = addProfile(initialState, sampleDraft);
  const next = addProfile(first, {
    ...sampleDraft,
    name: "Personal example",
    isExample: false,
  });
  assert.equal(next.profiles.length, 2);
  assert.equal(next.profiles[1].isExample, false);
  assert.equal(next.profiles[1].previewCreation, true);
  assert.throws(
    () => openReading(next, next.activeId!, "love"),
    /not connected/,
  );
});
test("first reading selection is owned per profile and preview plan does not imply real payment", () => {
  let state = addProfile(initialState, sampleDraft);
  const first = state.activeId!;
  state = openReading(state, first, "love");
  assert.equal(state.profiles[0].freeCategory, "love");
  assert.equal(locked(state, state.profiles[0], "career"), true);
  assert.throws(() => openReading(state, first, "career"), /preview plan/);
  const second = addProfile(state, sampleDraft);
  assert.equal(locked(second, second.profiles[1], "career"), false);
  const upgraded = openReading({ ...second, previewPlan: 1 }, first, "career");
  assert.equal(upgraded.profiles[0].freeCategory, "love");
});
test("questions remain with their person and do not become live predictions", () => {
  const free = addProfile(initialState, sampleDraft);
  assert.throws(
    () => addQuestion(free, free.activeId!, "A question"),
    /preview plans/,
  );
  const state = addQuestion(
    { ...free, previewPlan: 1 },
    free.activeId!,
    " Question ",
  );
  const other = addProfile(state, { ...sampleDraft, name: "Second" });
  assert.equal(
    other.questions.filter((q) => q.profileId === other.activeId).length,
    0,
  );
  assert.equal(state.questions[0].text, "Question");
  assert.match(state.questions[0].answer, /prepared example/);
  assert.throws(() => addQuestion(state, "missing", "Question"), /saved chart/);
});
test("persistence round-trip preserves plans, profiles, questions and free selection", () => {
  const p = addProfile(initialState, sampleDraft);
  const state = addQuestion(
    { ...openReading(p, p.activeId!, "dosha"), language: "si", previewPlan: 2 },
    p.activeId!,
    "Example",
  );
  assert.deepEqual(decodeState(JSON.stringify(state)), state);
  assert.equal(
    decodeState(JSON.stringify({ ...state, activeId: "missing" })).activeId,
    p.activeId,
  );
  assert.throws(() => decodeState("{invalid"));
  assert.throws(() =>
    decodeState(
      JSON.stringify({ ...state, questions: [{ profileId: "missing" }] }),
    ),
  );
  assert.throws(() =>
    decodeState(
      JSON.stringify({
        ...state,
        profiles: [...state.profiles, ...state.profiles],
      }),
    ),
  );
});
