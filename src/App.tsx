import "./App.css";
import { useState } from "react";
import { AuthProvider, Descope } from "@descope/react-sdk";
import Error from "./components/Welcome";

const projectRegex = /^[a-zA-Z0-9]{28}$/;

const App = () => {
  let pathname = window.location.pathname;
  if (pathname.startsWith("/")) {
    pathname = pathname.substring(1);
  }
  const isValid = projectRegex.test(pathname);
  const urlParams = new URLSearchParams(window.location.search);
  let projectId = "";
  if (isValid) {
    projectId = pathname;
  } else {
    console.log(`Invalid projectId ${pathname}`);
  }
  const flowId = urlParams.get("flow") || "sign-up-or-in";
  const debug = urlParams.get("debug") === "true";
  const [error, setError] = useState(false);

  const baseUrl = process.env.REACT_APP_DESCOPE_BASE_URL || "";

  return (
    <AuthProvider projectId={projectId} baseUrl={baseUrl}>
      <div className="app">
        {projectId && flowId && !error ? (
          <div className="descope-container" data-testid="descope-component">
            <Descope flowId={flowId} debug={debug} onError={() => setError(true)} />
          </div>
        ) : (
          <Error />
        )}
      </div>
    </AuthProvider>
  );
};

export default App;
