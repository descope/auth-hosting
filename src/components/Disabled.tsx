import '../App.css';
import React from 'react';
import logo from '../assets/logo.svg';

const Disabled = () => (
	<div className="app-content" data-testid="disabled-component">
		<img src={logo} alt="logo" style={{ marginBottom: '16px' }} />
		<h2 className="header-label">This login page is not available</h2>
		<p className="text-body1" style={{ marginTop: '32px' }}>
			The Descope-hosted login pages are turned off for this project.
		</p>
	</div>
);

export default Disabled;
