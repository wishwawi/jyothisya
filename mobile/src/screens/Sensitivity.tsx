import React, { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useQuery } from "../api/hooks";
import { Badge, Card, Chip, Page, QueryState, Txt } from "../ui";
import { BasisNotice, ChartBasisButton } from "./insight-ui";

export function Sensitivity() {
  const { state, api } = useNekath();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  const [minutes, setMinutes] = useState(15);
  const query = useQuery(`sensitivity:${profileId}:${minutes}`, () =>
    api.call("birthTimeSensitivity", {
      profileId,
      uncertaintyMinutes: minutes,
    }),
  );
  const p = state.profiles.find((p) => p.id === profileId);
  return (
    <Page title="Birth-time sensitivity" subtitle={p?.name} back>
      <Txt>
        Your recorded time: {p?.time}. Choose how far either side of it to
        compare.
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[5, 15, 30].map((n) => (
          <Chip
            key={n}
            title={`±${n} minutes`}
            selected={minutes === n}
            onPress={() => setMinutes(n)}
          />
        ))}
      </View>
      <QueryState query={query} label="Checking sensitivity…">
        {(data) => (
          <>
            <BasisNotice basis={data.basis} />
            <Card>
              <Badge
                text={
                  data.crossesSignBoundary
                    ? "Sign change · sample warning"
                    : "Same sign · sample"
                }
                green={!data.crossesSignBoundary}
              />
              <Txt heading size={24}>
                {data.crossesSignBoundary
                  ? "A nearby time can change the ascendant"
                  : "Ascendant remains in the same sign"}
              </Txt>
              <Txt>
                This example shows how a warning will appear. It does not
                establish whether your actual chart is near a sign boundary.
              </Txt>
            </Card>
            {data.samples.map((s) => (
              <View
                key={s.offsetMinutes}
                style={{ gap: 5, paddingVertical: 8 }}
              >
                <Txt bold>
                  {s.offsetMinutes === 0
                    ? "Recorded time"
                    : `${Math.abs(s.offsetMinutes)} minutes ${s.offsetMinutes < 0 ? "earlier" : "later"}`}
                </Txt>
                <Txt size={22}>
                  {s.ascendant} · {s.degreeLabel}
                </Txt>
              </View>
            ))}
            <Txt size={14} muted>
              A sensitivity check compares possible charts. It cannot confirm
              the correct birth time.
            </Txt>
            <ChartBasisButton
              profileId={profileId}
              snapshotId={data.chartSnapshotId}
            />
          </>
        )}
      </QueryState>
    </Page>
  );
}
