import { Outlet } from "react-router";

/**
 * Layout wrapper for chat routes. Renders /chat and /chat/:agentSlug with the same chat UI.
 */
export default function ChatLayout() {
  return <Outlet />;
}
