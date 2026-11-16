import React from "react";
import { View, useWindowDimensions } from "react-native";
import type { ChartSnapshot } from "./api/contracts";
import { c } from "./theme";
import { Txt } from "./ui";
const layout = [11, 0, 1, 2, 10, -1, -1, 3, 9, -1, -1, 4, 8, 7, 6, 5];
export function Chart({
  chart,
  highlight = -1,
  compact = false,
}: {
  chart: ChartSnapshot;
  highlight?: number;
  compact?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  const size = Math.min(width - (compact ? 80 : 44), 440);
  return (
    <View
      accessible
      accessibilityLabel={`${chart.kind === "navamsha" ? "Navamsha" : "Rasi"}, ${chart.profileName}, revision ${chart.profileRevision}. Full positions are listed below.`}
      style={{
        width: size,
        height: size,
        alignSelf: "center",
        borderWidth: 2,
        borderColor: c.accentDark,
        borderRadius: 16,
        overflow: "hidden",
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: c.bg,
      }}
    >
      {layout.map((sign, index) => {
        const cell = chart.cells.find((c) => c.signIndex === sign);
        return (
          <View
            key={index}
            style={{
              width: "25%",
              height: "25%",
              padding: 5,
              borderWidth: sign < 0 ? 0 : 0.5,
              borderColor: c.accentDark,
              justifyContent: "space-between",
              backgroundColor:
                sign === highlight
                  ? c.peach
                  : cell?.house === 1
                    ? c.pale
                    : "transparent",
            }}
          >
            {cell ? (
              <>
                <Txt size={10} muted>
                  {cell.house}
                </Txt>
                <Txt size={fontScale > 1.3 ? 11 : 14} color={c.accentDark} bold>
                  {cell.bodies.join(" ")}
                </Txt>
              </>
            ) : null}
          </View>
        );
      })}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: "25%",
          top: "25%",
          width: "50%",
          height: "50%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.bg,
        }}
      >
        <Txt heading size={compact ? 19 : 23} color={c.accentDark}>
          {chart.kind === "navamsha" ? "Navamsha" : "Rasi"}
        </Txt>
        <Txt size={11} muted>
          Revision {chart.profileRevision}
        </Txt>
      </View>
    </View>
  );
}
