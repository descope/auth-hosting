declare global {
	interface Window {
		env: any;
	}
}

type EnvType = {
	[key: string]: string | undefined;
};

export const env: EnvType = { ...process.env, ...window.env };
