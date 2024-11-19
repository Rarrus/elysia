export interface ComposerGeneralHandlerOptions {
	/**
	 * optimization for standard internet hostname
	 * this will assume hostname is always use a standard internet hostname
	 * assuming hostname is at minimum of 11 length of string (http://a.bc)
	 *
	 * setting this to true will skip the first 11 character of the hostname
	 *
	 * @default true
	 */
	standardHostname?: boolean;
}
