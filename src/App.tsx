import "./App.css";
import { AuthProvider, Descope } from "@descope/react-sdk";
import Error from "./components/Error";

function App() {
  const urlParams = new URLSearchParams(window.location.search);

  const projectId = window.location.pathname.replaceAll("/", "") || "";
  const flowId = urlParams.get("flow") || "sign-up-or-in";
  const debug = urlParams.get("debug") === "true";
  const baseUrl = `${window.location.protocol}//api.${window.location.host}`;

  return (
    <>
      {projectId && flowId ? (
        <>
          <AuthProvider projectId={projectId} baseUrl={baseUrl}>
            <Descope flowId={flowId} debug={debug} onError={(e) => console.log("Could not logged in!")}></Descope>
          </AuthProvider>
        </>
      ) : (
        <Error />
      )}
    </>
  );
}

export default App;
