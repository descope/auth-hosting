import '../App.css';
import React from 'react';

// Shown when this project may not be served from here. Deliberately says nothing
// about why, about the project, or about who runs the page: the whole point of the
// setting is to stop this surface from advertising anything.
const NotFound = () => (
	<div className="app-content" data-testid="notfound-component">
		<h2 className="header-label">Page not found</h2>
	</div>
);

export default NotFound;
