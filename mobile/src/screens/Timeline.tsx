import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useQuery } from "../api/hooks";
import { localDate } from "../dates";
import { c } from "../theme";
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Field,
  Page,
  QueryState,
  Txt,
} from "../ui";
import { BasisNotice, ChartBasisButton, PremiumGate } from "./insight-ui";
import type { TimelineEvent } from "../api/contracts";

export function Timeline() {
  const { state } = useNekath();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  return (
    <Page
      title="Life timeline"
      subtitle="Explore periods across your life"
      back
    >
      <PremiumGate feature="Your life timeline">
        <TimelineContent key={profileId} profileId={profileId} />
      </PremiumGate>
    </Page>
  );
}
function TimelineContent({ profileId }: { profileId: string }) {
  const { api, state } = useNekath();
  const p = state.profiles.find((p) => p.id === profileId);
  const initial = {
    fromDate: p?.dob ?? "1990-01-01",
    toDate: `${Math.min(Number((p?.dob ?? "1990").slice(0, 4)) + 100, 2200)}-12-31`,
  };
  const [draft, setDraft] = useState(initial);
  const [range, setRange] = useState(initial);
  const [filter, setFilter] = useState<TimelineEvent["kind"] | "all">("all");
  const query = useQuery(
    `timeline:${profileId}:${range.fromDate}:${range.toDate}`,
    () => api.call("timeline", { profileId, ...range }),
  );
  const today = localDate("Asia/Colombo");
  return (
    <>
      <Txt heading size={25}>
        {p?.name}
      </Txt>
      <Field
        label="From date (YYYY-MM-DD)"
        value={draft.fromDate}
        onChange={(fromDate) => setDraft({ ...draft, fromDate })}
        numeric
      />
      <Field
        label="To date (YYYY-MM-DD)"
        value={draft.toDate}
        onChange={(toDate) => setDraft({ ...draft, toDate })}
        numeric
      />
      <Button
        title="Explore date range"
        secondary
        onPress={() => {
          setRange({ ...draft });
          if (JSON.stringify(draft) === JSON.stringify(range)) query.reload();
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["all", "dasha", "transit", "eclipse"] as const).map((kind) => (
          <Chip
            key={kind}
            title={
              kind === "all"
                ? "All periods"
                : kind === "dasha"
                  ? "Dasha"
                  : kind === "transit"
                    ? "Transits"
                    : "Eclipses"
            }
            selected={kind === filter}
            onPress={() => setFilter(kind)}
          />
        ))}
      </View>
      <QueryState query={query} label="Loading timeline…">
        {(data) => {
          const events = data.events.filter(
            (e) => filter === "all" || e.kind === filter,
          );
          return (
            <>
              <BasisNotice basis={data.basis} />
              <Txt size={13} muted>
                {data.fromDate} to {data.toDate} · {events.length} periods
              </Txt>
              {!events.length && (
                <EmptyState
                  title="No periods in this range"
                  body="Choose a wider range or a different event filter. The demo contains a limited set of sample events."
                />
              )}
              {events.map((e) => (
                <View
                  key={e.id}
                  style={{
                    paddingVertical: 14,
                    gap: 10,
                    borderBottomWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <Badge
                    text={`${e.kind} · ${e.endDate < today ? "past" : e.startDate > today ? "upcoming" : "current"}`}
                    green={e.startDate <= today && e.endDate >= today}
                  />
                  <Txt heading size={24}>
                    {e.title}
                  </Txt>
                  <Txt size={14} bold>
                    {e.startDate} – {e.endDate}
                  </Txt>
                  <Txt>{e.description}</Txt>
                  <Button
                    title="Explore this date in Daily"
                    secondary
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/daily",
                        params: { date: e.startDate, profileId },
                      })
                    }
                  />
                </View>
              ))}
              <ChartBasisButton
                profileId={profileId}
                snapshotId={data.chartSnapshotId}
              />
            </>
          );
        }}
      </QueryState>
    </>
  );
}
