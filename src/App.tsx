import './App.css';
import { AuthProvider, Descope } from "@descope/react-sdk";
import Error from './components/Error';


function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const projectId = urlParams.get("project") || ""; 
  const flowId = urlParams.get("flow") || "sign-up-or-in";
  const debug = urlParams.get("debug") === "true";

  return (
    <>
      {projectId && flowId ? 
        <>
        <AuthProvider projectId={projectId}>
          <Descope
            flowId={flowId}
            debug={debug}
            onError={(e) => console.log('Could not logged in!')}
          ></Descope>
        </AuthProvider>
        </>
        :
        <Error />
      }
    </>
  )
}


export default App;