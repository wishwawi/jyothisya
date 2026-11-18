import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useAction, useQuery } from "../api/hooks";
import { localDate, shiftDate } from "../dates";
import type { Prediction, PredictionOutcome } from "../api/contracts";
import {
  ActionState,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Note,
  Page,
  QueryState,
  Rule,
  Txt,
} from "../ui";
import { ChartBasisButton, PremiumGate } from "./insight-ui";

export function Journal() {
  const { state } = useNekath();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  return (
    <Page title="Prediction journal" subtitle="Record first. Check later." back>
      <JournalContent key={profileId} profileId={profileId} />
    </Page>
  );
}
function JournalContent({ profileId }: { profileId: string }) {
  const { api, state } = useNekath();
  const query = useQuery(`journal:${profileId}`, () =>
    api.call("journal", { profileId }),
  );
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  return (
    <>
      <Txt heading size={24}>
        {state.profiles.find((p) => p.id === profileId)?.name}
      </Txt>
      <Note>
        Your entries and outcomes are saved on this device. Results are
        self-reported; the score measures your reviews, not scientific validity.
      </Note>
      <PremiumGate feature="Record a new prediction">
        <Button
          title={showForm ? "Close entry form" : "Record a prediction"}
          icon="create-outline"
          onPress={() => setShowForm(!showForm)}
        />
        {showForm && (
          <PredictionForm
            profileId={profileId}
            onSaved={() => setShowForm(false)}
          />
        )}
      </PremiumGate>
      <QueryState query={query} label="Loading journal…">
        {(data) => (
          <>
            <Card>
              <Txt heading size={26}>
                {data.summary.scorePercent === null
                  ? "No score yet"
                  : `${data.summary.scorePercent}% self-reported accuracy`}
              </Txt>
              <Txt>
                {data.summary.reviewed} reviewed of {data.summary.total}{" "}
                recorded · {data.summary.due} ready to review
              </Txt>
              <Txt size={14}>
                {data.summary.hits} hit · {data.summary.partials} partial ·{" "}
                {data.summary.misses} miss
              </Txt>
              <Txt size={13} muted>
                Hits count as 1, partials as ½ and misses as 0. Unreviewed
                entries are excluded.
              </Txt>
            </Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["all", "due", "reviewed"].map((f) => (
                <Chip
                  key={f}
                  title={
                    f === "all"
                      ? "All entries"
                      : f === "due"
                        ? "Ready to review"
                        : "Reviewed"
                  }
                  selected={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </View>
            {data.entries
              .filter(
                (e) =>
                  filter === "all" ||
                  (filter === "reviewed"
                    ? !!e.review
                    : !e.review && localDate(e.timezone) > e.targetEnd),
              )
              .map((e) => (
                <PredictionRow key={e.id} entry={e} />
              ))}
            {!data.entries.some(
              (e) =>
                filter === "all" ||
                (filter === "reviewed"
                  ? !!e.review
                  : !e.review && localDate(e.timezone) > e.targetEnd),
            ) && (
              <EmptyState
                title={
                  data.entries.length
                    ? "No entries in this view"
                    : "Your first prediction starts here"
                }
                body="Write a specific statement, define what would count as success, and choose a future date window."
              />
            )}
            <Button
              title="Refresh review availability"
              secondary
              onPress={query.reload}
            />
          </>
        )}
      </QueryState>
    </>
  );
}
function PredictionForm({
  profileId,
  onSaved,
}: {
  profileId: string;
  onSaved: () => void;
}) {
  const { api } = useNekath();
  const action = useAction();
  const [statement, setStatement] = useState("");
  const [criteria, setCriteria] = useState("");
  const [targetStart, setStart] = useState(() =>
    shiftDate(localDate("Asia/Colombo"), 2),
  );
  const [targetEnd, setEnd] = useState(() =>
    shiftDate(localDate("Asia/Colombo"), 9),
  );
  return (
    <View style={{ gap: 14 }}>
      <Field
        label="What do you predict?"
        value={statement}
        onChange={setStatement}
        placeholder="A specific, observable outcome"
        multiline
      />
      <Field
        label="What would count as a hit?"
        value={criteria}
        onChange={setCriteria}
        placeholder="Define the evidence before the event"
        multiline
      />
      <Field
        label="Window starts (YYYY-MM-DD)"
        value={targetStart}
        onChange={setStart}
        numeric
      />
      <Field
        label="Window ends (YYYY-MM-DD)"
        value={targetEnd}
        onChange={setEnd}
        numeric
      />
      <Note>
        Saving locks the wording, criteria, dates and current chart basis. You
        can record one outcome after the entire window ends.
      </Note>
      <ActionState action={action} />
      <Button
        title={action.busy ? "Saving prediction…" : "Save and lock prediction"}
        disabled={action.busy || !statement.trim() || !criteria.trim()}
        onPress={() =>
          action.run(
            (key) =>
              api.call(
                "createPrediction",
                { profileId, statement, criteria, targetStart, targetEnd },
                key,
              ),
            onSaved,
          )
        }
      />
    </View>
  );
}
function PredictionRow({ entry }: { entry: Prediction }) {
  const { api } = useNekath();
  const action = useAction();
  const [reviewing, setReviewing] = useState(false);
  const [outcome, setOutcome] = useState<PredictionOutcome>("hit");
  const [notes, setNotes] = useState("");
  const due = localDate(entry.timezone) > entry.targetEnd;
  return (
    <Card>
      <Badge
        text={
          entry.review
            ? entry.review.outcome
            : due
              ? "Ready to review"
              : "Locked · awaiting outcome"
        }
        green={entry.review?.outcome === "hit"}
      />
      <Txt size={20} bold>
        {entry.statement}
      </Txt>
      <Txt size={14}>
        {entry.targetStart} – {entry.targetEnd} · {entry.timezone}
      </Txt>
      <Txt size={13} muted>
        Recorded {new Date(entry.createdAt).toLocaleString()}
      </Txt>
      <Rule />
      <Txt bold>Success criteria</Txt>
      <Txt>{entry.criteria}</Txt>
      {entry.review ? (
        <>
          <Txt bold>Recorded outcome</Txt>
          <Txt>{entry.review.notes}</Txt>
          <Txt size={13} muted>
            Reviewed {new Date(entry.review.reviewedAt).toLocaleString()} ·
            outcome locked
          </Txt>
        </>
      ) : due ? (
        <>
          <Button
            title={reviewing ? "Close review" : "Review this prediction"}
            secondary
            onPress={() => setReviewing(!reviewing)}
          />
          {reviewing && (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["hit", "partial", "miss"] as const).map((o) => (
                  <Chip
                    key={o}
                    title={
                      o === "hit" ? "Hit" : o === "partial" ? "Partial" : "Miss"
                    }
                    selected={outcome === o}
                    onPress={() => setOutcome(o)}
                  />
                ))}
              </View>
              <Field
                label="What actually happened?"
                value={notes}
                onChange={setNotes}
                placeholder="Describe the evidence and dates"
                multiline
              />
              <Txt size={13} muted>
                This outcome cannot be changed after saving.
              </Txt>
              <Button
                title={action.busy ? "Saving outcome…" : "Save locked outcome"}
                disabled={action.busy || !notes.trim()}
                onPress={() =>
                  action.run(
                    (key) =>
                      api.call(
                        "reviewPrediction",
                        { id: entry.id, outcome, notes },
                        key,
                      ),
                    () => setReviewing(false),
                  )
                }
              />
            </>
          )}
          <ActionState action={action} />
        </>
      ) : (
        <Txt size={13} muted>
          Review becomes available after {entry.targetEnd} ends in{" "}
          {entry.timezone}.
        </Txt>
      )}
      <ChartBasisButton
        profileId={entry.profileId}
        snapshotId={entry.chartSnapshotId}
      />
    </Card>
  );
}
