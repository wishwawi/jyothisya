import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useQuery } from "../api/hooks";
import { Badge, Button, Card, Page, QueryState, Rule, Txt } from "../ui";
export function Reading() {
  const { api } = useNekath(),
    params = useLocalSearchParams<{ id?: string }>();
  const query = useQuery("reading:" + params.id, () =>
    api.call("reading", { id: params.id ?? "" }),
  );
  return (
    <Page title="Your reading" back>
      <QueryState query={query} label="Loading reading…">
        {(reading) => (
          <>
            <Txt heading size={30}>
              {reading.title}
            </Txt>
            <Badge
              text={
                reading.assessment === "supportive"
                  ? "Supportive"
                  : reading.assessment === "care"
                    ? "Use care"
                    : "Mixed factors"
              }
              green={reading.assessment === "supportive"}
            />
            <Txt heading size={25}>
              {reading.headline}
            </Txt>
            <Txt size={17}>{reading.body}</Txt>
            <Txt heading size={22}>
              What supports this reading
            </Txt>
            {reading.factors.map((f) => (
              <Card key={f.id}>
                <Txt bold>{f.term}</Txt>
                <Txt>{f.meaning}</Txt>
              </Card>
            ))}
            {reading.window ? (
              <Card>
                <Txt heading size={22}>
                  {reading.window.label}
                </Txt>
                <Txt bold>
                  {reading.window.startDate} – {reading.window.endDate}
                </Txt>
                <Txt muted size={13}>
                  A traditional interpretation does not guarantee an event.
                </Txt>
              </Card>
            ) : null}
            {reading.checks.length ? (
              <Card>
                {reading.checks.map((check, i) => (
                  <View key={check.name} style={{ gap: 10 }}>
                    {i ? <Rule /> : null}
                    <Txt bold>{check.name}</Txt>
                    <Txt>{check.result}</Txt>
                  </View>
                ))}
              </Card>
            ) : null}
            <Txt size={12} muted>
              Reading language: English · Chart basis preserved
            </Txt>
            <Button
              title="View chart basis"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/chart-detail",
                  params: {
                    profileId: reading.profileId,
                    snapshotId: reading.chartSnapshotId,
                  },
                })
              }
            />
            <Button
              title="Ask about your chart"
              onPress={() =>
                router.push({
                  pathname: "/conversation",
                  params: {
                    profileId: reading.profileId,
                    snapshotId: reading.chartSnapshotId,
                  },
                })
              }
            />
          </>
        )}
      </QueryState>
    </Page>
  );
}
