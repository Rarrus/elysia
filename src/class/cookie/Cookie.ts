export class Cookie<T> implements ElysiaCookie {
	constructor(
		private name: string,
		private jar: Record<string, ElysiaCookie>,
		private initial: Partial<ElysiaCookie> = {},
	) {}

	get cookie() {
		return this.jar[this.name] ?? this.initial;
	}

	set cookie(jar: ElysiaCookie) {
		if (!(this.name in this.jar)) this.jar[this.name] = this.initial;

		this.jar[this.name] = jar;
	}

	protected get setCookie() {
		if (!(this.name in this.jar)) this.jar[this.name] = this.initial;

		return this.jar[this.name];
	}

	protected set setCookie(jar: ElysiaCookie) {
		this.cookie = jar;
	}

	get value(): T {
		return this.cookie.value as T;
	}

	set value(value: T) {
		this.setCookie.value = value;
	}

	get expires() {
		return this.cookie.expires;
	}

	set expires(expires) {
		this.setCookie.expires = expires;
	}

	get maxAge() {
		return this.cookie.maxAge;
	}

	set maxAge(maxAge) {
		this.setCookie.maxAge = maxAge;
	}

	get domain() {
		return this.cookie.domain;
	}

	set domain(domain) {
		this.setCookie.domain = domain;
	}

	get path() {
		return this.cookie.path;
	}

	set path(path) {
		this.setCookie.path = path;
	}

	get secure() {
		return this.cookie.secure;
	}

	set secure(secure) {
		this.setCookie.secure = secure;
	}

	get httpOnly() {
		return this.cookie.httpOnly;
	}

	set httpOnly(httpOnly) {
		this.setCookie.httpOnly = httpOnly;
	}

	get sameSite() {
		return this.cookie.sameSite;
	}

	set sameSite(sameSite) {
		this.setCookie.sameSite = sameSite;
	}

	get priority() {
		return this.cookie.priority;
	}

	set priority(priority) {
		this.setCookie.priority = priority;
	}

	get partitioned() {
		return this.cookie.partitioned;
	}

	set partitioned(partitioned) {
		this.setCookie.partitioned = partitioned;
	}

	get secrets() {
		return this.cookie.secrets;
	}

	set secrets(secrets) {
		this.setCookie.secrets = secrets;
	}

	update(config: Updater<Partial<ElysiaCookie>>) {
		this.setCookie = Object.assign(
			this.cookie,
			typeof config === "function" ? config(this.cookie) : config,
		);

		return this;
	}

	set(config: Updater<Partial<ElysiaCookie>>) {
		this.setCookie = Object.assign(
			{
				...this.initial,
				value: this.value,
			},
			typeof config === "function" ? config(this.cookie) : config,
		);

		return this;
	}

	remove() {
		if (this.value === undefined) return;

		this.set({
			expires: new Date(0),
			maxAge: 0,
			value: "",
		});

		return this;
	}

	toString() {
		return typeof this.value === "object"
			? JSON.stringify(this.value)
			: (this.value?.toString() ?? "");
	}
}
