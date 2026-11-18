import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { ReportDocument } from "../api/contracts";
import { reportHtml } from "./html";

export async function exportReport(report: ReportDocument): Promise<void> {
  const html = reportHtml(report);
  if (Platform.OS === "web") {
    // Print an isolated document, never the surrounding app and its controls.
    const frame = document.createElement("iframe");
    frame.title = "Nekath report print preview";
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.opacity = "0";
    document.body.appendChild(frame);
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => frame.remove();
      frame.onload = () => {
        try {
          const target = frame.contentWindow;
          if (!target) throw Error("The report preview could not be opened.");
          target.addEventListener("afterprint", cleanup, { once: true });
          target.focus();
          target.print();
          // Some browsers do not emit afterprint; leave time for their dialog.
          setTimeout(cleanup, 60000);
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      frame.onerror = () => {
        cleanup();
        reject(Error("The report preview could not be loaded."));
      };
      frame.srcdoc = html;
    });
    return;
  }
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: ".pdf",
      dialogTitle: "Save or share your Nekath report",
    });
  } else {
    await Print.printAsync({ uri });
  }
}
