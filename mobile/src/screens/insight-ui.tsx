import React from "react";
import { router } from "expo-router";
import { useNekath } from "../store";
import { Button, Card, Note, Txt } from "../ui";
import type { InsightBasis } from "../api/contracts";

export function PremiumGate({
  children,
  feature,
}: {
  children: React.ReactNode;
  feature: string;
}) {
  const { state } = useNekath();
  return state.plan !== "free" ? (
    children
  ) : (
    <Card>
      <Txt heading size={24}>
        {feature}
      </Txt>
      <Txt>This feature is included in Graha and Jyotisha.</Txt>
      <Button
        title="Compare premium plans"
        onPress={() => router.push("/plans")}
      />
    </Card>
  );
}
export function BasisNotice({ basis }: { basis: InsightBasis }) {
  return (
    <Note>
      {basis.method}. {basis.notice}
    </Note>
  );
}
export function ChartBasisButton({
  profileId,
  snapshotId,
}: {
  profileId: string;
  snapshotId: string;
}) {
  return (
    <Button
      title="View saved chart basis"
      secondary
      onPress={() =>
        router.push({
          pathname: "/chart-detail",
          params: { profileId, snapshotId },
        })
      }
    />
  );
}
