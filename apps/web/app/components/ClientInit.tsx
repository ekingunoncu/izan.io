import { useEffect } from "react";
import { useMCPStore, useModelStore, useUIStore, useAutomationStore } from "~/store";

/**
 * Initializes stores on app load (client-side only).
 * Runs once when the app mounts so Settings and other pages get persisted data.
 */
export function ClientInit() {
  const initMCP = useMCPStore((s) => s.initialize);
  const initModel = useModelStore((s) => s.initialize);
  const isMobileSidebarOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const isAgentEditOpen = useUIStore((s) => s.isAgentEditOpen);
  const isModelSelectorOpen = useUIStore((s) => s.isModelSelectorOpen);
  const isCreateAgentOpen = useUIStore((s) => s.isCreateAgentOpen);

  useEffect(() => {
    void Promise.all([initMCP(), initModel()]);
  }, [initMCP, initModel]);

  // Extension side panel bridge: uses window.postMessage (structured clone)
  // for reliable cross-world communication between ISOLATED content script
  // and MAIN world page. CustomEvent.detail does not cross world boundaries.
  useEffect(() => {
    function respond(requestId: string, type: string, data?: unknown, error?: string) {
      window.postMessage(
        { source: "izan-page", channel: "page-response", requestId, type, data, error },
        "*"
      );
    }

    const handler = async (evt: MessageEvent) => {
      const msg = evt.data;
      if (msg?.source !== "izan-extension" || msg?.channel !== "page-request") return;
      const type = msg?.type as string | undefined;
      const requestId = msg?.requestId as string | undefined;
      if (!type || !requestId) return;

      console.log("[izan-page] Received page-request:", type, "requestId:", requestId);

      if (type === "izan-sync-automation") {
        try {
          const store = useAutomationStore.getState();
          await store.initialize();
          await store.mergeFromExtension(
            (msg.servers as []) ?? [],
            (msg.tools as []) ?? [],
          );
          respond(requestId, type);
          console.log("[izan-page] Merged automation data from extension");
        } catch (err) {
          console.error("[izan-page] Error handling izan-sync-automation:", err);
          respond(requestId, type, undefined, String(err));
        }
        return;
      }
    };
    window.addEventListener("message", handler);
    console.log("[izan-page] postMessage listener registered for page requests");
    return () => window.removeEventListener("message", handler);
  }, []);

  // Scroll lock when modal/sidebar open (especially for iOS)
  useEffect(() => {
    const hasOverlay =
      isMobileSidebarOpen ||
      isAgentEditOpen ||
      isModelSelectorOpen ||
      isCreateAgentOpen;

    if (hasOverlay) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [
    isMobileSidebarOpen,
    isAgentEditOpen,
    isModelSelectorOpen,
    isCreateAgentOpen,
  ]);

  return null;
}
