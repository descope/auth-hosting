import '../App.css';
import React from 'react';

const Done = () => (
	<div className="done-page" data-testid="done-component">
		<div className="done-card">
			<div className="done-check" aria-hidden="true">
				✓
			</div>
			<h1 className="done-title">Authentication complete</h1>
			<p className="done-subtitle">
				You&apos;re authenticated. You can close this window now.
			</p>
		</div>
	</div>
);

export default Done;
