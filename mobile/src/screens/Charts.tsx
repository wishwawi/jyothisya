import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useAction, useQuery } from "../api/hooks";
import type { ChartSnapshot } from "../api/contracts";
import { c } from "../theme";
import {
  ActionState,
  Button,
  Card,
  Chip,
  EmptyState,
  Page,
  ProfileButton,
  QueryState,
  Rule,
  Txt,
} from "../ui";
import { Chart } from "../chart";
export function Charts() {
  const { state, api } = useNekath(),
    params = useLocalSearchParams<{
      profileId?: string;
      snapshotId?: string;
    }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  const [kind, setKind] = useState<ChartSnapshot["kind"]>("rasi");
  const query = useQuery(
    `chart:${profileId}:${kind}:${params.snapshotId ?? ""}`,
    () => api.call("chart", { profileId, kind, snapshotId: params.snapshotId }),
  );
  return (
    <Page
      title={params.snapshotId ? "Saved chart" : "Charts"}
      back={!!params.snapshotId}
      action={<ProfileButton />}
    >
      {!params.snapshotId ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip
            title="Rasi"
            selected={kind === "rasi"}
            onPress={() => setKind("rasi")}
          />
          <Chip
            title="Navamsha"
            selected={kind === "navamsha"}
            onPress={() => setKind("navamsha")}
          />
        </View>
      ) : null}
      <QueryState query={query} label="Loading chart…">
        {(chart) => <ChartContent chart={chart} />}
      </QueryState>
    </Page>
  );
}
function ChartContent({ chart }: { chart: ChartSnapshot }) {
  const { api, state } = useNekath();
  const action = useAction();
  const saved = state.savedCharts.some((s) => s.snapshotId === chart.id);
  return (
    <>
      <Txt heading size={24}>
        {chart.profileName}
      </Txt>
      <Txt muted size={13}>
        {chart.method.label} · revision {chart.profileRevision}
      </Txt>
      <Chart chart={chart} />
      <Button
        title={saved ? "Chart saved" : "Save this chart"}
        secondary
        icon={saved ? "bookmark" : "bookmark-outline"}
        disabled={saved || action.busy}
        onPress={() =>
          action.run((key) =>
            api.call(
              "saveChart",
              {
                profileId: chart.profileId,
                snapshotId: chart.id,
                title: `${chart.kind === "rasi" ? "Rasi" : "Navamsha"} · ${chart.profileName}`,
              },
              key,
            ),
          )
        }
      />
      <ActionState action={action} />
      <Button
        title="Saved charts"
        secondary
        onPress={() =>
          router.push({
            pathname: "/saved-charts",
            params: { profileId: chart.profileId },
          })
        }
      />
      <Txt heading size={23}>
        Planet positions
      </Txt>
      <Card>
        {chart.positions.map((row, index) => (
          <View
            key={row.bodyId}
            accessible
            accessibilityLabel={`${row.label}, ${row.sign}, house ${row.house}, ${row.degreeLabel}, ${row.nakshatra}`}
            style={{ gap: 10 }}
          >
            {index ? <Rule /> : null}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Txt bold>{row.label}</Txt>
                <Txt size={13} muted>
                  {row.sign} · House {row.house}
                </Txt>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Txt size={14}>{row.degreeLabel}</Txt>
                <Txt size={12} muted>
                  {row.nakshatra}
                </Txt>
              </View>
            </View>
          </View>
        ))}
      </Card>
      <Txt heading size={23}>
        Dasha periods
      </Txt>
      {state.plan === "free" ? (
        <Card>
          <Txt>Unlock the full period timeline with a reading plan.</Txt>
          <Button title="See plans" onPress={() => router.push("/plans")} />
        </Card>
      ) : (
        <Card>
          {chart.dashas.map((d) => (
            <View key={d.id} style={{ gap: 5 }}>
              <Txt bold>
                {d.lord} {d.current ? "· current period" : ""}
              </Txt>
              <Txt muted size={13}>
                {d.startDate} – {d.endDate}
              </Txt>
              <View
                style={{
                  height: 7,
                  borderRadius: 5,
                  backgroundColor: d.current ? c.accent : c.sage,
                }}
              />
            </View>
          ))}
        </Card>
      )}
      <Button
        title="Ask about this chart"
        icon="chatbubble-outline"
        onPress={() =>
          router.push({
            pathname: "/conversation",
            params: { profileId: chart.profileId, snapshotId: chart.id },
          })
        }
      />
      <Txt muted size={12}>
        Snapshot {chart.id}
      </Txt>
    </>
  );
}
export function SavedCharts() {
  const { state, api } = useNekath(),
    params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  const query = useQuery("saved:" + profileId, () =>
    api.call("savedCharts", { profileId }),
  );
  const action = useAction();
  return (
    <Page title="Saved charts" back>
      <QueryState query={query}>
        {(rows) =>
          rows.length ? (
            rows.map((row) => (
              <Card key={row.id}>
                <Txt heading size={22}>
                  {row.title}
                </Txt>
                <Txt muted size={12}>
                  Saved {new Date(row.createdAt).toLocaleDateString()}
                </Txt>
                <Button
                  title="Open saved snapshot"
                  onPress={() =>
                    router.push({
                      pathname: "/chart-detail",
                      params: {
                        profileId: row.profileId,
                        snapshotId: row.snapshotId,
                      },
                    })
                  }
                />
                <Button
                  title="Remove saved view"
                  secondary
                  disabled={action.busy}
                  onPress={() =>
                    action.run((key) =>
                      api.call("removeSavedChart", { id: row.id }, key),
                    )
                  }
                />
              </Card>
            ))
          ) : (
            <EmptyState
              title="No saved charts"
              body="Save a chart to return to the same revision later."
            />
          )
        }
      </QueryState>
      <ActionState action={action} />
    </Page>
  );
}
