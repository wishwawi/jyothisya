import React, { useState } from "react";
import { View } from "react-native";
import { useNekath } from "../store";
import { useQuery } from "../api/hooks";
import { Button, Card, Field, QueryState, Txt } from "../ui";
import { Chart } from "../chart";
import { BasisNotice } from "./insight-ui";

export function Tathkala({
  profileId,
  date,
  placeId,
}: {
  profileId: string;
  date: string;
  placeId: string;
}) {
  const { api } = useNekath();
  const [draftTime, setDraftTime] = useState("12:00");
  const [time, setTime] = useState("12:00");
  const query = useQuery(
    `tathkala:${profileId}:${date}:${time}:${placeId}`,
    () =>
      api.call("tathkala", {
        profileId,
        localDate: date,
        localTime: time,
        placeId,
      }),
  );
  return (
    <>
      <Txt heading size={26}>
        Daily tathkala
      </Txt>
      <Txt>
        Select a local time to explore the moment chart and its relationship to
        the birth chart.
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <Field
          label="Local time (HH:mm)"
          value={draftTime}
          onChange={setDraftTime}
          placeholder="12:00"
          numeric
        />
        <Button
          title="Show"
          secondary
          onPress={() => {
            setTime(draftTime);
            if (time === draftTime) query.reload();
          }}
        />
      </View>
      <QueryState query={query} label="Loading moment chart…">
        {(data) => (
          <>
            <BasisNotice basis={data.basis} />
            <Txt size={13} muted>
              {data.localDate} · {data.localTime} · {data.timezone}
            </Txt>
            <Chart chart={data.momentChart} />
            {data.factors.map((f) => (
              <Card key={f.name}>
                <Txt bold>{f.name}</Txt>
                <Txt heading size={22}>
                  {f.value}
                </Txt>
                <Txt size={14}>{f.meaning}</Txt>
              </Card>
            ))}
          </>
        )}
      </QueryState>
    </>
  );
}
