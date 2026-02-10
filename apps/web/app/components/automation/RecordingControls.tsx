/**
 * RecordingControls - Floating indicator shown during active recording.
 * Displays in the chat window when a recording session is active.
 */

import { useTranslation } from "react-i18next";
import { Square, Circle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAutomationStore } from "~/store/automation.store";

export function RecordingControls() {
  const { t } = useTranslation("common");
  const { isRecording, recordingSteps, stopRecording } = useAutomationStore();

  if (!isRecording) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
      <Circle className="h-3 w-3 fill-current animate-pulse" />
      <span className="text-sm font-medium">
        {t("automation.recording", "Recording")} · {recordingSteps.length}{" "}
        {t("automation.steps", "steps")}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs gap-1"
        onClick={stopRecording}
      >
        <Square className="h-3 w-3" />
        {t("automation.stop", "Stop")}
      </Button>
    </div>
  );
}
