import React, { CSSProperties } from 'react';
import '../App.css';

type FlowLoadingOverlayProps = {
	color: string;
	overlayColor: string;
};

const FlowLoadingOverlay = ({
	color,
	overlayColor
}: FlowLoadingOverlayProps) => {
	const overlayStyle = {
		'--flow-loading-color': color,
		'--flow-loading-overlay-color': overlayColor
	} as CSSProperties;

	return (
		<div
			className="flow-loading-overlay"
			style={overlayStyle}
			data-testid="flow-loading-overlay"
			role="status"
			aria-live="polite"
			aria-busy="true"
			aria-label="Loading"
		>
			<div
				className="flow-loading-spinner"
				data-testid="flow-loading-spinner"
				aria-hidden="true"
			/>
		</div>
	);
};

export default FlowLoadingOverlay;
