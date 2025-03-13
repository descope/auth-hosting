import React from 'react';
import logo from './assets/logo.svg';

const Error: React.FC = () => {
	let error = 'An error occurred';

	const queryParam = new URLSearchParams(window.location.search);
	error =
		queryParam.get('error') || queryParam.get('err') || 'An error occurred';

	return (
		<div className="app-content">
			<img
				src={logo}
				alt="logo"
				style={{
					marginBottom: '16px'
				}}
			/>
			<h2 className="header-label">Uh-oh, something went wrong</h2>
			<div
				style={{
					marginBottom: '96px'
				}}
			>
				<p
					className="text-body1"
					style={{
						marginTop: '32px'
					}}
				>
					{error}
				</p>
			</div>
		</div>
	);
};

export default Error;
