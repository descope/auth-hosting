import { useLayoutEffect } from 'react';

// public/index.html paints `bg` on <html> before the bundle loads. Once React
// renders, the page owns the background, so drop the early one before the first
// paint (otherwise translucent colors stack and error pages get the bg too).
const useClearPrePaintBg = () => {
	useLayoutEffect(() => {
		document.documentElement.style.removeProperty('background-color');
	}, []);
};

export default useClearPrePaintBg;
