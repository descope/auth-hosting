import React, { CSSProperties } from 'react';
import '../App.css';

type FlowLoadingOverlayProps = {
	color: string;
};

const FlowLoadingOverlay = ({ color }: FlowLoadingOverlayProps) => {
	const spinnerStyle = {
		'--flow-loading-color': color
	} as CSSProperties;

	return (
		<div
			className="flow-loading-overlay"
			data-testid="flow-loading-overlay"
			role="status"
			aria-live="polite"
			aria-busy="true"
			aria-label="Loading"
		>
			<div
				className="flow-loading-spinner"
				style={spinnerStyle}
				data-testid="flow-loading-spinner"
				aria-hidden="true"
			/>
		</div>
	);
};

export default FlowLoadingOverlay;
