import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// On Replit, the frontend and API were routed under the same origin by the
// platform itself, so relative "/api/..." calls just worked. Hosts that serve
// the frontend and API as separate services (e.g. separate subdomains) need
// this to point requests at the API's own origin.
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
}

createRoot(document.getElementById("root")!).render(<App />);
