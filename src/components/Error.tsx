import '../App.css';
import { useCopyToClipboard } from 'usehooks-ts';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

const Error = () => {
	const [value, copy] = useCopyToClipboard();
	const exampleText = `https://auth.descope.io/PROJECT_ID?flow=FLOW_ID&debug=true`;
	return (
		<div className="app-content">
			<h1 className="error-title">Something went wrong...</h1>
			<p className="text-body">
				Please make sure the URL is correctly formatted with a valid{' '}
				<b>project id</b> and <b>flow id</b>.<br />
				For debugging purposes also <b>debug=true</b> can be used.
			</p>
			<p className="example-title">Here's an example: </p>
			<p className="example" onClick={() => copy(exampleText)}>
				{exampleText}
				{value ? (
					<CheckIcon className="copy-icon" />
				) : (
					<ContentCopyIcon className="copy-icon" />
				)}
			</p>
		</div>
	);
};

export default Error;
