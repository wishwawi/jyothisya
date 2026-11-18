import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform } from "react-native";
import { useNekath } from "../store";
import { useAction, useQuery } from "../api/hooks";
import { exportReport } from "../reports/export";
import {
  ActionState,
  Button,
  Card,
  EmptyState,
  Note,
  Page,
  QueryState,
  Txt,
} from "../ui";
import { BasisNotice, ChartBasisButton, PremiumGate } from "./insight-ui";

export function Reports() {
  const { state } = useNekath();
  const params = useLocalSearchParams<{ profileId?: string; id?: string }>();
  const profileId = params.profileId ?? state.activeId ?? "";
  return params.id ? (
    <ReportPreview key={params.id} id={params.id} />
  ) : (
    <Page title="PDF reports" subtitle="A snapshot you can keep and share" back>
      <ReportList key={profileId} profileId={profileId} />
    </Page>
  );
}
function ReportList({ profileId }: { profileId: string }) {
  const { api, state } = useNekath();
  const query = useQuery(`reports:${profileId}`, () =>
    api.call("reports", { profileId }),
  );
  const action = useAction();
  return (
    <>
      <Txt heading size={24}>
        {state.profiles.find((p) => p.id === profileId)?.name}
      </Txt>
      <Txt>
        Keep the birth chart, sample life timeline and your prediction journal
        together. Existing reports remain unchanged when you edit your profile
        or review a prediction.
      </Txt>
      <PremiumGate feature="Create a personal PDF report">
        <Button
          title={action.busy ? "Preparing report…" : "Create report"}
          icon="document-text-outline"
          disabled={action.busy}
          onPress={() =>
            action.run(
              (key) => api.call("createReport", { profileId }, key),
              (result) =>
                router.push({
                  pathname: "/reports",
                  params: { id: result.data.id, profileId },
                }),
            )
          }
        />
      </PremiumGate>
      <ActionState action={action} />
      <QueryState query={query} label="Loading reports…">
        {(reports) =>
          reports.length ? (
            reports.map((r) => (
              <Card key={r.id}>
                <Txt heading size={22}>
                  {r.title}
                </Txt>
                <Txt>
                  {r.profile.name} · revision {r.profile.revision}
                </Txt>
                <Txt size={13} muted>
                  {new Date(r.createdAt).toLocaleString()}
                </Txt>
                <Button
                  title="Preview and export PDF"
                  secondary
                  onPress={() =>
                    router.push({
                      pathname: "/reports",
                      params: { id: r.id, profileId },
                    })
                  }
                />
              </Card>
            ))
          ) : (
            <EmptyState
              title="No reports yet"
              body="Create a report to preview it, then export a PDF to save or share."
            />
          )
        }
      </QueryState>
    </>
  );
}
function ReportPreview({ id }: { id: string }) {
  const { api } = useNekath();
  const query = useQuery(`report:${id}`, () => api.call("report", { id }));
  const action = useAction();
  return (
    <Page title="Report preview" back>
      <QueryState query={query} label="Loading report…">
        {(r) => (
          <>
            <Txt heading size={26}>
              {r.profile.name}
            </Txt>
            <Txt size={14}>
              {r.profile.dob} · {r.profile.time} · {r.profile.place}
            </Txt>
            <Txt size={13} muted>
              Created {new Date(r.createdAt).toLocaleString()} · revision{" "}
              {r.profile.revision}
            </Txt>
            <BasisNotice basis={r.basis} />
            <Note>
              This report includes personal birth details and journal notes.
              Review the content before sharing.
            </Note>
            <Button
              title={
                action.busy
                  ? "Opening PDF export…"
                  : Platform.OS === "web"
                    ? "Print or save as PDF"
                    : "Export and share PDF"
              }
              icon="share-outline"
              disabled={action.busy}
              onPress={() => action.run(() => exportReport(r))}
            />
            <ActionState action={action} />
            {r.sections.map((s) => (
              <React.Fragment key={s.title}>
                <Txt heading size={23}>
                  {s.title}
                </Txt>
                {s.paragraphs.map((text, i) => (
                  <Txt key={i} size={15}>
                    {text}
                  </Txt>
                ))}
              </React.Fragment>
            ))}
            <ChartBasisButton
              profileId={r.profileId}
              snapshotId={r.chartSnapshotId}
            />
          </>
        )}
      </QueryState>
    </Page>
  );
}
