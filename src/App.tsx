import "./App.css";
import { useState } from "react";
import { AuthProvider, Descope } from "@descope/react-sdk";
import Welcome from "./components/Welcome";

const projectRegex = /^[a-zA-Z0-9]{28}$/;

const App = () => {
  const [error, setError] = useState(false);

  const baseUrl = process.env.REACT_APP_DESCOPE_BASE_URL || "";

  let projectId = "";

  // first, take project id from env
  const envProjectId = process.env.DESCOPE_PROJECT_ID;
  if (envProjectId && projectRegex.test(envProjectId)) {
    projectId = envProjectId;
  }

  // if no project id, try to take it from URI
  if (!projectId) {
    let pathname = window.location.pathname;
    if (pathname.startsWith("/")) {
      pathname = pathname.substring(1);
      if (projectRegex.test(pathname)) {
        projectId = pathname;
      } else {
        console.log(`Invalid projectId ${pathname}`);
      }
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const flowId = urlParams.get("flow") || "sign-up-or-in";
  const debug = urlParams.get("debug") === "true";

  return (
    <AuthProvider projectId={projectId} baseUrl={baseUrl}>
      <div className="app">
        {projectId && flowId && !error ? (
          <div className="descope-container" data-testid="descope-component">
            <Descope
              flowId={flowId}
              debug={debug}
              onError={() => setError(true)}
            />
          </div>
        ) : (
          <Welcome />
        )}
      </div>
    </AuthProvider>
  );
};

export default App;
