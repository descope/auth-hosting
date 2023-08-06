import '../App.css';
import React, { useCallback } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import packageJson from '../../package.json';

const Welcome = () => {
	const baseUrl = window.location.origin;
	const exampleText = `${baseUrl}/${packageJson.homepage}/PROJECT_ID`;

	const [value, copy] = useCopyToClipboard();
	const onCopy = useCallback(async () => {
		copy(exampleText);
	}, [copy, exampleText]);

	return (
		<div className="app-content" data-testid="welcome-component">
			<h1 className="welcome-title">Welcome</h1>
			<p className="text-body">
				To display your login flow please specify the Descope&apos;s{' '}
				<b>project id</b>.<br />
				<br />
				More info can be found{' '}
				<a href="https://github.com/descope/auth-hosting#readme">here</a>.
			</p>
			<p className="example-title">Here&apos;s an example:</p>
			<p
				data-testid="welcome-copy-component"
				className="example"
				onClick={onCopy}
				aria-hidden="true"
			>
				{exampleText}
				{value ? (
					<CheckIcon data-testid="welcome-copied-icon" className="copy-icon" />
				) : (
					<ContentCopyIcon
						data-testid="welcome-copy-icon"
						className="copy-icon"
					/>
				)}
			</p>
		</div>
	);
};

export default Welcome;
