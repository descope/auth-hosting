import "../App.css";
import { useCopyToClipboard } from "usehooks-ts";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

const Welcome = () => {
  const [value, copy] = useCopyToClipboard();
  const exampleText = `https://auth.descope.io/PROJECT_ID`;
  return (
    <div className="app-content" data-testid="welcome-component">
      <h1 className="welcome-title">Welcome</h1>
      <p className="text-body">
        To display your login flow please specify the Descope's <b>project id</b>.<br />
        <br />
        More info can be found <a href="https://github.com/descope/auth-hosting#readme">here</a>.
      </p>
      <p className="example-title">Here's an example:</p>
      <p
        data-testid="welcome-copy-component"
        className="example"
        onClick={() => {
          return copy(exampleText);
        }}
      >
        {exampleText}
        {value ? (
          <CheckIcon data-testid="welcome-copied-icon" className="copy-icon" />
        ) : (
          <ContentCopyIcon data-testid="welcome-copy-icon" className="copy-icon" />
        )}
      </p>
    </div>
  );
};

export default Welcome;
