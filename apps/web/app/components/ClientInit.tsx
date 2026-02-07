import { useEffect } from "react";
import { useMCPStore, useModelStore, useUIStore } from "~/store";

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
