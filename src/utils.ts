export const parseStyleStr = (containerStyle: string | undefined) => {
	if (!containerStyle) {
		return undefined;
	}

	const style = {} as Record<string, string>;
	const stylePairs = containerStyle.split(';');
	stylePairs.forEach((pair) => {
		const [key, value] = pair.split(':');
		if (key && value) {
			const styleKey = key.trim() as keyof React.CSSProperties;
			style[styleKey] = value.trim();
		}
	});

	return style;
};
