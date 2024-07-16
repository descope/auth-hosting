!(function () {
	'use strict';
	var e = function () {
		return (
			(e =
				Object.assign ||
				function (e) {
					for (var t, n = 1, o = arguments.length; n < o; n++)
						for (var i in (t = arguments[n]))
							Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
					return e;
				}),
			e.apply(this, arguments)
		);
	};
	function t(e, t) {
		var n = {};
		for (var o in e)
			Object.prototype.hasOwnProperty.call(e, o) &&
				t.indexOf(o) < 0 &&
				(n[o] = e[o]);
		if (null != e && 'function' == typeof Object.getOwnPropertySymbols) {
			var i = 0;
			for (o = Object.getOwnPropertySymbols(e); i < o.length; i++)
				t.indexOf(o[i]) < 0 &&
					Object.prototype.propertyIsEnumerable.call(e, o[i]) &&
					(n[o[i]] = e[o[i]]);
		}
		return n;
	}
	function n(e, t, n, o) {
		return new (n || (n = Promise))(function (i, r) {
			function s(e) {
				try {
					l(o.next(e));
				} catch (e) {
					r(e);
				}
			}
			function a(e) {
				try {
					l(o.throw(e));
				} catch (e) {
					r(e);
				}
			}
			function l(e) {
				var t;
				e.done
					? i(e.value)
					: ((t = e.value),
						t instanceof n
							? t
							: new n(function (e) {
									e(t);
								})).then(s, a);
			}
			l((o = o.apply(e, t || [])).next());
		});
	}
	function o(e, t, n, o) {
		if ('a' === n && !o)
			throw new TypeError('Private accessor was defined without a getter');
		if ('function' == typeof t ? e !== t || !o : !t.has(e))
			throw new TypeError(
				'Cannot read private member from an object whose class did not declare it'
			);
		return 'm' === n ? o : 'a' === n ? o.call(e) : o ? o.value : t.get(e);
	}
	function i(e, t, n, o, i) {
		if ('m' === o) throw new TypeError('Private method is not writable');
		if ('a' === o && !i)
			throw new TypeError('Private accessor was defined without a setter');
		if ('function' == typeof t ? e !== t || !i : !t.has(e))
			throw new TypeError(
				'Cannot write private member to an object whose class did not declare it'
			);
		return 'a' === o ? i.call(e, n) : i ? (i.value = n) : t.set(e, n), n;
	}
	function r(e) {
		this.message = e;
	}
	'function' == typeof SuppressedError && SuppressedError,
		(r.prototype = new Error()),
		(r.prototype.name = 'InvalidCharacterError');
	var s =
		('undefined' != typeof window && window.atob && window.atob.bind(window)) ||
		function (e) {
			var t = String(e).replace(/=+$/, '');
			if (t.length % 4 == 1)
				throw new r(
					"'atob' failed: The string to be decoded is not correctly encoded."
				);
			for (
				var n, o, i = 0, s = 0, a = '';
				(o = t.charAt(s++));
				~o && ((n = i % 4 ? 64 * n + o : o), i++ % 4)
					? (a += String.fromCharCode(255 & (n >> ((-2 * i) & 6))))
					: 0
			)
				o =
					'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(
						o
					);
			return a;
		};
	function a(e) {
		this.message = e;
	}
	function l(e, t) {
		if ('string' != typeof e) throw new a('Invalid token specified');
		var n = !0 === (t = t || {}).header ? 0 : 1;
		try {
			return JSON.parse(
				(function (e) {
					var t = e.replace(/-/g, '+').replace(/_/g, '/');
					switch (t.length % 4) {
						case 0:
							break;
						case 2:
							t += '==';
							break;
						case 3:
							t += '=';
							break;
						default:
							throw 'Illegal base64url string!';
					}
					try {
						return (function (e) {
							return decodeURIComponent(
								s(e).replace(/(.)/g, function (e, t) {
									var n = t.charCodeAt(0).toString(16).toUpperCase();
									return n.length < 2 && (n = '0' + n), '%' + n;
								})
							);
						})(t);
					} catch (e) {
						return s(t);
					}
				})(e.split('.')[n])
			);
		} catch (e) {
			throw new a('Invalid token specified: ' + e.message);
		}
	}
	(a.prototype = new Error()), (a.prototype.name = 'InvalidTokenError');
	var c = '/v1/auth/accesskey/exchange',
		d = '/v1/auth/otp/verify',
		u = '/v1/auth/otp/signin',
		h = '/v1/auth/otp/signup',
		p = {
			email: '/v1/auth/otp/update/email',
			phone: '/v1/auth/otp/update/phone'
		},
		g = '/v1/auth/otp/signup-in',
		f = '/v1/auth/magiclink/verify',
		v = '/v1/auth/magiclink/signin',
		m = '/v1/auth/magiclink/signup',
		b = {
			email: '/v1/auth/magiclink/update/email',
			phone: '/v1/auth/magiclink/update/phone'
		},
		w = '/v1/auth/magiclink/signup-in',
		y = '/v1/auth/enchantedlink/verify',
		I = '/v1/auth/enchantedlink/signin',
		k = '/v1/auth/enchantedlink/signup',
		j = '/v1/auth/enchantedlink/pending-session',
		O = { email: '/v1/auth/enchantedlink/update/email' },
		C = '/v1/auth/enchantedlink/signup-in',
		A = '/v1/auth/oauth/authorize',
		S = '/v1/auth/oauth/exchange',
		x = 'v1/auth/oauth/native/start',
		U = 'v1/auth/oauth/native/finish',
		E = '/v1/auth/saml/authorize',
		L = '/v1/auth/saml/exchange',
		T = '/v1/auth/totp/verify',
		R = '/v1/auth/totp/signup',
		P = '/v1/auth/totp/update',
		$ = '/v1/auth/notp/whatsapp/signin',
		M = '/v1/auth/notp/whatsapp/signup',
		q = '/v1/auth/notp/whatsapp/signup-in',
		W = '/v1/auth/notp/pending-session',
		D = {
			start: '/v1/auth/webauthn/signup/start',
			finish: '/v1/auth/webauthn/signup/finish'
		},
		N = {
			start: '/v1/auth/webauthn/signin/start',
			finish: '/v1/auth/webauthn/signin/finish'
		},
		_ = { start: '/v1/auth/webauthn/signup-in/start' },
		F = {
			start: 'v1/auth/webauthn/update/start',
			finish: '/v1/auth/webauthn/update/finish'
		},
		K = '/v1/auth/password/signup',
		H = '/v1/auth/password/signin',
		J = '/v1/auth/password/reset',
		V = '/v1/auth/password/update',
		z = '/v1/auth/password/replace',
		B = '/v1/auth/password/policy',
		Z = '/v1/auth/refresh',
		G = '/v1/auth/tenant/select',
		X = '/v1/auth/logout',
		Y = '/v1/auth/logoutall',
		Q = '/v1/auth/me',
		ee = '/v1/auth/me/history',
		te = '/v1/flow/start',
		ne = '/v1/flow/next';
	const oe = '<region>',
		ie = `https://api.${oe}descope.com`,
		re = 6e5,
		se = 'dct',
		ae = () => {
			const e = {};
			return {
				headers(t) {
					const n =
						'function' == typeof t.entries
							? Object.fromEntries(t.entries())
							: t;
					return (e.Headers = JSON.stringify(n)), this;
				},
				body(t) {
					return (e.Body = t), this;
				},
				url(t) {
					return (e.Url = t.toString()), this;
				},
				method(t) {
					return (e.Method = t), this;
				},
				title(t) {
					return (e.Title = t), this;
				},
				status(t) {
					return (e.Status = t), this;
				},
				build: () =>
					Object.keys(e)
						.flatMap((t) =>
							e[t] ? [`${'Title' !== t ? `${t}: ` : ''}${e[t]}`] : []
						)
						.join('\n')
			};
		};
	var le;
	!(function (e) {
		(e.get = 'GET'),
			(e.delete = 'DELETE'),
			(e.post = 'POST'),
			(e.put = 'PUT'),
			(e.patch = 'PATCH');
	})(le || (le = {}));
	const ce = ({ path: e, baseUrl: t, queryParams: n, projectId: o }) => {
			const i = o.slice(1, -27);
			t = t.replace(oe, i ? i + '.' : '');
			let r = e
				? `${t.replace(/\/$/, '')}/${null == e ? void 0 : e.replace(/^\//, '')}`
				: t;
			if (n) {
				r = `${r}?`;
				const e = Object.keys(n);
				e.forEach((t, o) => {
					r = `${r}${t}=${n[t]}${o === e.length - 1 ? '' : '&'}`;
				});
			}
			return r;
		},
		de = (...e) =>
			new Headers(
				e.reduce((e, t) => {
					const n = ((e) =>
						Array.isArray(e)
							? e
							: e instanceof Headers
								? Array.from(e.entries())
								: e
									? Object.entries(e)
									: [])(t);
					return n.reduce((t, [n, o]) => ((e[n] = o), e), e), e;
				}, {})
			),
		ue = { 'Content-Type': 'application/json' },
		he = (e, t = '') => {
			let n = e;
			return t && (n = n + ':' + t), { Authorization: `Bearer ${n}` };
		},
		pe = (e) => {
			try {
				e = JSON.parse(e);
			} catch (e) {
				return !1;
			}
			return 'object' == typeof e && null !== e;
		},
		ge = ({
			baseUrl: e,
			projectId: t,
			baseConfig: n,
			logger: o,
			hooks: i,
			cookiePolicy: r,
			fetch: s
		}) => {
			const a = ((e, t) => {
					const n = (
						(e) =>
						async (...t) => {
							const n = await e(...t),
								o = await n.text();
							return (
								(n.text = () => Promise.resolve(o)),
								(n.json = () => Promise.resolve(JSON.parse(o))),
								(n.clone = () => n),
								n
							);
						}
					)(t || fetch);
					return (
						n ||
							null == e ||
							e.warn(
								'Fetch is not defined, you will not be able to send http requests, if you are running in a test, make sure fetch is defined globally'
							),
						e
							? async (...t) => {
									if (!n)
										throw Error(
											'Cannot send http request, fetch is not defined, if you are running in a test, make sure fetch is defined globally'
										);
									e.log(
										((e) =>
											ae()
												.title('Request')
												.url(e[0])
												.method(e[1].method)
												.headers(e[1].headers)
												.body(e[1].body)
												.build())(t)
									);
									const o = await n(...t);
									return (
										e[o.ok ? 'log' : 'error'](
											await (async (e) => {
												const t = await e.text();
												return ae()
													.title('Response')
													.url(e.url.toString())
													.status(`${e.status} ${e.statusText}`)
													.headers(e.headers)
													.body(t)
													.build();
											})(o)
										),
										o
									);
								}
							: n
					);
				})(o, s),
				l = async (o) => {
					var s;
					const l = (null == i ? void 0 : i.beforeRequest)
							? i.beforeRequest(o)
							: o,
						{
							path: c,
							body: d,
							headers: u,
							queryParams: h,
							method: p,
							token: g
						} = l,
						f = ((e) => (void 0 === e ? void 0 : JSON.stringify(e)))(d),
						v = {
							headers: de(
								he(t, g),
								{
									'x-descope-sdk-name': 'core-js',
									'x-descope-sdk-version': '2.23.2'
								},
								(null == n ? void 0 : n.baseHeaders) || {},
								pe(f) ? ue : {},
								u
							),
							method: p,
							body: f
						};
					null !== r && (v.credentials = r || 'include');
					const m = await a(
						ce({ path: c, baseUrl: e, queryParams: h, projectId: t }),
						v
					);
					if (
						((null == i ? void 0 : i.afterRequest) &&
							(await i.afterRequest(o, null == m ? void 0 : m.clone())),
						null == i ? void 0 : i.transformResponse)
					) {
						const e = await m.json(),
							t = (
								(null === (s = m.headers) || void 0 === s
									? void 0
									: s.get('set-cookie')) || ''
							)
								.split(';')
								.reduce((e, t) => {
									const [n, o] = t.split('=');
									return Object.assign(Object.assign({}, e), { [n.trim()]: o });
								}, {}),
							n = Object.assign(Object.assign({}, m), {
								json: () => Promise.resolve(e),
								cookies: t
							});
						return (n.clone = () => n), i.transformResponse(n);
					}
					return m;
				};
			return {
				get: (e, { headers: t, queryParams: n, token: o } = {}) =>
					l({
						path: e,
						headers: t,
						queryParams: n,
						body: void 0,
						method: le.get,
						token: o
					}),
				post: (e, t, { headers: n, queryParams: o, token: i } = {}) =>
					l({
						path: e,
						headers: n,
						queryParams: o,
						body: t,
						method: le.post,
						token: i
					}),
				patch: (e, t, { headers: n, queryParams: o, token: i } = {}) =>
					l({
						path: e,
						headers: n,
						queryParams: o,
						body: t,
						method: le.patch,
						token: i
					}),
				put: (e, t, { headers: n, queryParams: o, token: i } = {}) =>
					l({
						path: e,
						headers: n,
						queryParams: o,
						body: t,
						method: le.put,
						token: i
					}),
				delete: (e, { headers: t, queryParams: n, token: o } = {}) =>
					l({
						path: e,
						headers: t,
						queryParams: n,
						body: void 0,
						method: le.delete,
						token: o
					}),
				hooks: i,
				buildUrl: (n, o) =>
					ce({ projectId: t, baseUrl: e, path: n, queryParams: o })
			};
		};
	var fe = 429;
	function ve(e, t, n) {
		var o;
		let i = me(e);
		if (t) {
			if (
				!(null == i ? void 0 : i.tenants) &&
				(null == i ? void 0 : i[se]) === t
			)
				return (null == i ? void 0 : i[n]) || [];
			i =
				null === (o = null == i ? void 0 : i.tenants) || void 0 === o
					? void 0
					: o[t];
		}
		const r = null == i ? void 0 : i[n];
		return Array.isArray(r) ? r : [];
	}
	function me(e) {
		if ('string' != typeof e || !e) throw new Error('Invalid token provided');
		return l(e);
	}
	function be(e) {
		const { exp: t } = me(e);
		return new Date().getTime() / 1e3 > t;
	}
	function we(e) {
		let t = me(e);
		const n = Object.keys(null == t ? void 0 : t.tenants);
		return Array.isArray(n) ? n : [];
	}
	function ye(e, t) {
		return ve(e, t, 'permissions');
	}
	function Ie(e, t) {
		return ve(e, t, 'roles');
	}
	const ke = (...e) => e.join('/').replace(/\/{2,}/g, '/');
	async function je(e, t) {
		var n;
		const o = await e,
			i = { code: o.status, ok: o.ok, response: o },
			r = await o.clone().json();
		return (
			o.ok
				? (i.data = t ? t(r) : r)
				: ((i.error = r),
					o.status === fe &&
						Object.assign(i.error, {
							retryAfter:
								Number.parseInt(
									null === (n = o.headers) || void 0 === n
										? void 0
										: n.get('retry-after')
								) || 0
						})),
			i
		);
	}
	const Oe =
			(e, t) =>
			(n = t) =>
			(t) =>
				!e(t) && n.replace('{val}', t),
		Ce = (...e) => ({
			validate: (t) => (
				e.forEach((e) => {
					const n = e(t);
					if (n) throw new Error(n);
				}),
				!0
			)
		}),
		Ae = (e) => (t) => e.test(t),
		Se = Ae(
			/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
		),
		xe = Ae(/^\+[1-9]{1}[0-9]{3,14}$/),
		Ue = Oe(Se, '"{val}" is not a valid email'),
		Ee = Oe(xe, '"{val}" is not a valid phone number'),
		Le = Oe((1, (e) => e.length >= 1), 'Minimum length is 1');
	const Te = Oe((e) => 'string' == typeof e, 'Input is not a string'),
		Re = Oe((e) => void 0 === e, 'Input is defined'),
		Pe =
			(($e = [Te(), Re()]),
			'Input is not a string or undefined',
			(e = 'Input is not a string or undefined') =>
				(t) => {
					const n = $e.filter((e) => e(t));
					return (
						!(n.length < $e.length) &&
						(e ? e.replace('{val}', t) : n.join(' OR '))
					);
				});
	var $e;
	const Me =
			(...e) =>
			(t) =>
			(...n) => (e.forEach((e, t) => Ce(...e).validate(n[t])), t(...n)),
		qe = (e) => [Te(`"${e}" must be a string`)],
		We = (e) => [Te(`"${e}" must be a string`), Le(`"${e}" must not be empty`)],
		De = (e) => [Te(`"${e}" must be a string`), Ue()],
		Ne = (e) => [Te(`"${e}" must be a string`), Ee()],
		_e = Me(We('accessKey')),
		Fe = (e) => ({
			exchange: _e((t, n) => je(e.post(c, { loginOptions: n }, { token: t })))
		}),
		Ke = (e, t, n) => (
			t.forEach((t) => {
				const o = t.split('.');
				let i = o.shift(),
					r = e;
				for (; o.length > 0; ) {
					if (((r = r[i]), !i || !r))
						throw Error(
							`Invalid path "${t}", "${i}" is missing or has no value`
						);
					i = o.shift();
				}
				if ('function' != typeof r[i]) throw Error(`"${t}" is not a function`);
				const s = r[i];
				r[i] = n(s);
			}),
			e
		),
		He = ({ pollingIntervalMs: e = 1e3, timeoutMs: t = 6e5 } = {}) => ({
			pollingIntervalMs: Math.max(e || 1e3, 1e3),
			timeoutMs: Math.min(t || re, re)
		});
	var Je, Ve;
	!(function (e) {
		(e.sms = 'sms'), (e.voice = 'voice'), (e.whatsapp = 'whatsapp');
	})(Je || (Je = {})),
		(function (e) {
			e.email = 'email';
		})(Ve || (Ve = {}));
	const ze = Object.assign(Object.assign({}, Je), Ve);
	var Be;
	!(function (e) {
		(e.waiting = 'waiting'),
			(e.running = 'running'),
			(e.completed = 'completed'),
			(e.failed = 'failed');
	})(Be || (Be = {}));
	const Ze = We('loginId'),
		Ge = Me(We('token')),
		Xe = Me(Ze),
		Ye = Me(We('pendingRef')),
		Qe = Me(Ze, De('email')),
		et = (e) => ({
			verify: Ge((t) => je(e.post(y, { token: t }))),
			signIn: Xe((t, n, o, i) =>
				je(
					e.post(
						ke(I, ze.email),
						{ loginId: t, URI: n, loginOptions: o },
						{ token: i }
					)
				)
			),
			signUpOrIn: Xe((t, n, o) =>
				je(e.post(ke(C, ze.email), { loginId: t, URI: n, loginOptions: o }))
			),
			signUp: Xe((t, n, o, i) =>
				je(
					e.post(ke(k, ze.email), {
						loginId: t,
						URI: n,
						user: o,
						loginOptions: i
					})
				)
			),
			waitForSession: Ye(
				(t, n) =>
					new Promise((o) => {
						const { pollingIntervalMs: i, timeoutMs: r } = He(n);
						let s;
						const a = setInterval(async () => {
							const n = await e.post(j, { pendingRef: t });
							n.ok &&
								(clearInterval(a),
								s && clearTimeout(s),
								o(je(Promise.resolve(n))));
						}, i);
						s = setTimeout(() => {
							o({
								error: {
									errorDescription: `Session polling timeout exceeded: ${r}ms`,
									errorCode: '0'
								},
								ok: !1
							}),
								clearInterval(a);
						}, r);
					})
			),
			update: {
				email: Qe((t, n, o, i, r) =>
					je(
						e.post(
							O.email,
							Object.assign({ loginId: t, email: n, URI: o }, r),
							{ token: i }
						)
					)
				)
			}
		}),
		tt = Me(We('flowId')),
		nt = Me(We('executionId'), We('stepId'), We('interactionId')),
		ot = (e) => ({
			start: tt((t, n, o, i, r, s, a) =>
				je(
					e.post(te, {
						flowId: t,
						options: n,
						conditionInteractionId: o,
						interactionId: i,
						version: r,
						componentsVersion: s,
						input: a
					})
				)
			),
			next: nt((t, n, o, i, r, s) =>
				je(
					e.post(ne, {
						executionId: t,
						stepId: n,
						interactionId: o,
						version: i,
						componentsVersion: r,
						input: s
					})
				)
			)
		}),
		it = We('loginId'),
		rt = Me(We('token')),
		st = Me(it),
		at = Me(it, Ne('phone')),
		lt = Me(it, De('email')),
		ct = Object.keys(ze).filter((e) => e !== Je.voice),
		dt = (e) => ({
			verify: rt((t) => je(e.post(f, { token: t }))),
			signIn: ct.reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: st((t, o, i, r) =>
							je(
								e.post(
									ke(v, n),
									{ loginId: t, URI: o, loginOptions: i },
									{ token: r }
								)
							)
						)
					}),
				{}
			),
			signUp: ct.reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: st((t, o, i, r) =>
							je(
								e.post(ke(m, n), {
									loginId: t,
									URI: o,
									user: i,
									loginOptions: r
								})
							)
						)
					}),
				{}
			),
			signUpOrIn: ct.reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: st((t, o, i) =>
							je(e.post(ke(w, n), { loginId: t, URI: o, loginOptions: i }))
						)
					}),
				{}
			),
			update: {
				email: lt((t, n, o, i, r) =>
					je(
						e.post(
							b.email,
							Object.assign({ loginId: t, email: n, URI: o }, r),
							{ token: i }
						)
					)
				),
				phone: Object.keys(Je)
					.filter((e) => e !== Je.voice)
					.reduce(
						(t, n) =>
							Object.assign(Object.assign({}, t), {
								[n]: at((t, o, i, r, s) =>
									je(
										e.post(
											ke(b.phone, n),
											Object.assign({ loginId: t, phone: o, URI: i }, s),
											{ token: r }
										)
									)
								)
							}),
						{}
					)
			}
		});
	var ut;
	!(function (e) {
		(e.facebook = 'facebook'),
			(e.github = 'github'),
			(e.google = 'google'),
			(e.microsoft = 'microsoft'),
			(e.gitlab = 'gitlab'),
			(e.apple = 'apple'),
			(e.discord = 'discord'),
			(e.linkedin = 'linkedin'),
			(e.slack = 'slack');
	})(ut || (ut = {}));
	const ht = Me(We('code')),
		pt = (e) => ({
			start: Object.assign(
				(t, n, o, i) =>
					je(
						e.post(A, o || {}, {
							queryParams: Object.assign(
								{ provider: t },
								n && { redirectURL: n }
							),
							token: i
						})
					),
				Object.keys(ut).reduce(
					(t, n) =>
						Object.assign(Object.assign({}, t), {
							[n]: (t, o, i) =>
								je(
									e.post(A, o || {}, {
										queryParams: Object.assign(
											{ provider: n },
											t && { redirectURL: t }
										),
										token: i
									})
								)
						}),
					{}
				)
			),
			exchange: ht((t) => je(e.post(S, { code: t }))),
			startNative: (t, n, o) =>
				je(e.post(x, { provider: t, loginOptions: n, implicit: o })),
			finishNative: (t, n, o, i, r) =>
				je(e.post(U, { provider: t, stateId: n, user: o, code: i, idToken: r }))
		}),
		gt = We('loginId'),
		ft = Me(gt, We('code')),
		vt = Me(gt),
		mt = Me(gt, Ne('phone')),
		bt = Me(gt, De('email')),
		wt = (e) => ({
			verify: Object.keys(ze).reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: ft((t, o) => je(e.post(ke(d, n), { code: o, loginId: t })))
					}),
				{}
			),
			signIn: Object.keys(ze).reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: vt((t, o, i) =>
							je(
								e.post(ke(u, n), { loginId: t, loginOptions: o }, { token: i })
							)
						)
					}),
				{}
			),
			signUp: Object.keys(ze).reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: vt((t, o, i) =>
							je(e.post(ke(h, n), { loginId: t, user: o, loginOptions: i }))
						)
					}),
				{}
			),
			signUpOrIn: Object.keys(ze).reduce(
				(t, n) =>
					Object.assign(Object.assign({}, t), {
						[n]: vt((t, o) =>
							je(e.post(ke(g, n), { loginId: t, loginOptions: o }))
						)
					}),
				{}
			),
			update: {
				email: bt((t, n, o, i) =>
					je(
						e.post(p.email, Object.assign({ loginId: t, email: n }, i), {
							token: o
						})
					)
				),
				phone: Object.keys(Je).reduce(
					(t, n) =>
						Object.assign(Object.assign({}, t), {
							[n]: mt((t, o, i, r) =>
								je(
									e.post(
										ke(p.phone, n),
										Object.assign({ loginId: t, phone: o }, r),
										{ token: i }
									)
								)
							)
						}),
					{}
				)
			}
		}),
		yt = Me(We('tenant')),
		It = Me(We('code')),
		kt = (e) => ({
			start: yt((t, n, o, i) =>
				je(
					e.post(E, o || {}, {
						queryParams: { tenant: t, redirectURL: n },
						token: i
					})
				)
			),
			exchange: It((t) => je(e.post(L, { code: t })))
		}),
		jt = We('loginId'),
		Ot = Me(jt, We('code')),
		Ct = Me(jt),
		At = Me(jt),
		St = (e) => ({
			signUp: Ct((t, n) => je(e.post(R, { loginId: t, user: n }))),
			verify: Ot((t, n, o, i) =>
				je(e.post(T, { loginId: t, code: n, loginOptions: o }, { token: i }))
			),
			update: At((t, n) => je(e.post(P, { loginId: t }, { token: n })))
		}),
		xt = We('loginId'),
		Ut = We('newPassword'),
		Et = Me(xt, We('password')),
		Lt = Me(xt),
		Tt = Me(xt, Ut),
		Rt = Me(xt, We('oldPassword'), Ut),
		Pt = (e) => ({
			signUp: Et((t, n, o, i) =>
				je(e.post(K, { loginId: t, password: n, user: o, loginOptions: i }))
			),
			signIn: Et((t, n, o) =>
				je(e.post(H, { loginId: t, password: n, loginOptions: o }))
			),
			sendReset: Lt((t, n, o) =>
				je(e.post(J, { loginId: t, redirectUrl: n, templateOptions: o }))
			),
			update: Tt((t, n, o) =>
				je(e.post(V, { loginId: t, newPassword: n }, { token: o }))
			),
			replace: Rt((t, n, o) =>
				je(e.post(z, { loginId: t, oldPassword: n, newPassword: o }))
			),
			policy: () => je(e.get(B))
		}),
		$t = qe('loginId'),
		Mt = We('loginId'),
		qt = We('origin'),
		Wt = Me(Mt, qt, We('name')),
		Dt = Me(Mt, qt),
		Nt = Me($t, qt),
		_t = Me(Mt, qt, We('token')),
		Ft = Me(We('transactionId'), We('response')),
		Kt = (e) => ({
			signUp: {
				start: Wt((t, n, o) =>
					je(e.post(D.start, { user: { loginId: t, name: o }, origin: n }))
				),
				finish: Ft((t, n) =>
					je(e.post(D.finish, { transactionId: t, response: n }))
				)
			},
			signIn: {
				start: Nt((t, n, o, i) =>
					je(
						e.post(
							N.start,
							{ loginId: t, origin: n, loginOptions: o },
							{ token: i }
						)
					)
				),
				finish: Ft((t, n) =>
					je(e.post(N.finish, { transactionId: t, response: n }))
				)
			},
			signUpOrIn: {
				start: Dt((t, n) => je(e.post(_.start, { loginId: t, origin: n })))
			},
			update: {
				start: _t((t, n, o) =>
					je(e.post(F.start, { loginId: t, origin: n }, { token: o }))
				),
				finish: Ft((t, n) =>
					je(e.post(F.finish, { transactionId: t, response: n }))
				)
			}
		}),
		Ht = qe('loginId'),
		Jt = Me(Ht),
		Vt = Me(We('pendingRef')),
		zt = (e) => ({
			signUpOrIn: Jt((t, n) => je(e.post(q, { loginId: t, loginOptions: n }))),
			signUp: Jt((t, n, o) =>
				je(e.post(M, { loginId: t, user: n, loginOptions: o }))
			),
			signIn: Jt((t, n, o) =>
				je(e.post($, { loginId: t, loginOptions: n }, { token: o }))
			),
			waitForSession: Vt(
				(t, n) =>
					new Promise((o) => {
						const { pollingIntervalMs: i, timeoutMs: r } = He(n);
						let s;
						const a = setInterval(async () => {
							const n = await e.post(W, { pendingRef: t });
							n.ok &&
								(clearInterval(a),
								s && clearTimeout(s),
								o(je(Promise.resolve(n))));
						}, i);
						s = setTimeout(() => {
							o({
								error: {
									errorDescription: `Session polling timeout exceeded: ${r}ms`,
									errorCode: '0'
								},
								ok: !1
							}),
								clearInterval(a);
						}, r);
					})
			)
		}),
		Bt = Me(We('token')),
		Zt = Me([Pe('"token" must be string or undefined')]);
	var Gt,
		Xt = Me([
			('projectId',
			(Gt = We('projectId')),
			Oe(
				(
					(e, t) => (n) =>
						Ce(...t).validate(
							((e, t, n) => {
								const o = (Array.isArray(t) ? t.join('.') : String(t))
										.replace(
											/\[\\?("|')?(\w|d)+\\?("|')?\]/g,
											(e, t, n) => '.' + n
										)
										.split('.'),
									i = o.length;
								let r = 0,
									s = e === Object(e) ? e : void 0;
								for (; null != s && r < i; ) s = s[o[r++]];
								return r && r === i && void 0 !== s ? s : void 0;
							})(n, e)
						)
				)('projectId', Gt)
			)())
		])((e) => {
			var t;
			return (({
				projectId: e,
				logger: t,
				baseUrl: n,
				hooks: o,
				cookiePolicy: i,
				baseHeaders: r = {},
				fetch: s
			}) => {
				return (
					(a = ge({
						baseUrl: n || ie,
						projectId: e,
						logger: t,
						hooks: o,
						cookiePolicy: i,
						baseConfig: { baseHeaders: r },
						fetch: s
					})),
					{
						accessKey: Fe(a),
						otp: wt(a),
						magicLink: dt(a),
						enchantedLink: et(a),
						oauth: pt(a),
						saml: kt(a),
						totp: St(a),
						notp: zt(a),
						webauthn: Kt(a),
						password: Pt(a),
						flow: ot(a),
						refresh: Zt((e) => je(a.post(Z, {}, { token: e }))),
						selectTenant: Me(
							[Te('tenantId')],
							[Pe('"token" must be string or undefined')]
						)((e, t) => je(a.post(G, { tenant: e }, { token: t }))),
						logout: Zt((e) => je(a.post(X, {}, { token: e }))),
						logoutAll: Zt((e) => je(a.post(Y, {}, { token: e }))),
						me: Zt((e) => je(a.get(Q, { token: e }))),
						history: Zt((e) => je(a.get(ee, { token: e }))),
						isJwtExpired: Bt(be),
						getTenants: Bt(we),
						getJwtPermissions: Bt(ye),
						getJwtRoles: Bt(Ie),
						httpClient: a
					}
				);
				var a;
			})(
				Object.assign(Object.assign({}, e), {
					hooks: {
						beforeRequest: (t) => {
							var n;
							const o = [].concat(
								(null === (n = e.hooks) || void 0 === n
									? void 0
									: n.beforeRequest) || []
							);
							return null == o ? void 0 : o.reduce((e, t) => t(e), t);
						},
						afterRequest: async (t, n) => {
							var o;
							const i = [].concat(
								(null === (o = e.hooks) || void 0 === o
									? void 0
									: o.afterRequest) || []
							);
							0 != i.length &&
								(
									await Promise.allSettled(
										null == i
											? void 0
											: i.map((e) => e(t, null == n ? void 0 : n.clone()))
									)
								).forEach((t) => {
									var n;
									return (
										'rejected' === t.status &&
										(null === (n = e.logger) || void 0 === n
											? void 0
											: n.error(t.reason))
									);
								});
						},
						transformResponse:
							null === (t = e.hooks) || void 0 === t
								? void 0
								: t.transformResponse
					}
				})
			);
		}),
		Yt = Object.assign(Xt, { DeliveryMethods: ze });
	/*! js-cookie v3.0.5 | MIT */
	function Qt(e) {
		for (var t = 1; t < arguments.length; t++) {
			var n = arguments[t];
			for (var o in n) e[o] = n[o];
		}
		return e;
	}
	var en = (function e(t, n) {
		function o(e, o, i) {
			if ('undefined' != typeof document) {
				'number' == typeof (i = Qt({}, n, i)).expires &&
					(i.expires = new Date(Date.now() + 864e5 * i.expires)),
					i.expires && (i.expires = i.expires.toUTCString()),
					(e = encodeURIComponent(e)
						.replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
						.replace(/[()]/g, escape));
				var r = '';
				for (var s in i)
					i[s] &&
						((r += '; ' + s), !0 !== i[s] && (r += '=' + i[s].split(';')[0]));
				return (document.cookie = e + '=' + t.write(o, e) + r);
			}
		}
		return Object.create(
			{
				set: o,
				get: function (e) {
					if ('undefined' != typeof document && (!arguments.length || e)) {
						for (
							var n = document.cookie ? document.cookie.split('; ') : [],
								o = {},
								i = 0;
							i < n.length;
							i++
						) {
							var r = n[i].split('='),
								s = r.slice(1).join('=');
							try {
								var a = decodeURIComponent(r[0]);
								if (((o[a] = t.read(s, a)), e === a)) break;
							} catch (e) {}
						}
						return e ? o[e] : o;
					}
				},
				remove: function (e, t) {
					o(e, '', Qt({}, t, { expires: -1 }));
				},
				withAttributes: function (t) {
					return e(this.converter, Qt({}, this.attributes, t));
				},
				withConverter: function (t) {
					return e(Qt({}, this.converter, t), this.attributes);
				}
			},
			{
				attributes: { value: Object.freeze(n) },
				converter: { value: Object.freeze(t) }
			}
		);
	})(
		{
			read: function (e) {
				return (
					'"' === e[0] && (e = e.slice(1, -1)),
					e.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
				);
			},
			write: function (e) {
				return encodeURIComponent(e).replace(
					/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
					decodeURIComponent
				);
			}
		},
		{ path: '/' }
	);
	var tn = { default: 'endpoint' },
		nn = 'Blocked by CSP',
		on = 'The endpoint parameter is not a valid URL',
		rn = 'Failed to load the JS script of the agent',
		sn = '9319';
	function an(e, t) {
		var n,
			o,
			i,
			r,
			s = [],
			a =
				((n = (function (e) {
					var t = (function (e, t, n) {
						if (n || 2 === arguments.length)
							for (var o, i = 0, r = t.length; i < r; i++)
								(!o && i in t) ||
									(o || (o = Array.prototype.slice.call(t, 0, i)),
									(o[i] = t[i]));
						return e.concat(o || Array.prototype.slice.call(t));
					})([], e, !0);
					return {
						current: function () {
							return t[0];
						},
						postpone: function () {
							var e = t.shift();
							void 0 !== e && t.push(e);
						},
						exclude: function () {
							t.shift();
						}
					};
				})(e)),
				100,
				3e3,
				(r = 0),
				(o = function () {
					return Math.random() * Math.min(3e3, 100 * Math.pow(2, r++));
				}),
				(i = new Set()),
				[
					n.current(),
					function (e, t) {
						var r,
							s = t instanceof Error ? t.message : '';
						if (s === nn || s === on) n.exclude(), (r = 0);
						else if (s === sn) n.exclude();
						else if (s === rn) {
							var a = Date.now() - e.getTime() < 50,
								l = n.current();
							l && a && !i.has(l) && (i.add(l), (r = 0)), n.postpone();
						} else n.postpone();
						var c = n.current();
						return void 0 === c
							? void 0
							: [c, null != r ? r : e.getTime() + o() - Date.now()];
					}
				]),
			l = a[0],
			c = a[1];
		if (void 0 === l)
			return Promise.reject(
				new TypeError('The list of script URL patterns is empty')
			);
		var d = function (e) {
			var n = new Date(),
				o = function (t) {
					return s.push({
						url: e,
						startedAt: n,
						finishedAt: new Date(),
						error: t
					});
				},
				i = t(e);
			return (
				i.then(function () {
					return o();
				}, o),
				i.catch(function (e) {
					if (s.length >= 5) throw e;
					var t = c(n, e);
					if (!t) throw e;
					var o,
						i = t[0],
						r = t[1];
					return ((o = r),
					new Promise(function (e) {
						return setTimeout(e, o);
					})).then(function () {
						return d(i);
					});
				})
			);
		};
		return d(l).then(function (e) {
			return [e, s];
		});
	}
	var ln =
			'https://fpnpmcdn.net/v<version>/<apiKey>/loader_v<loaderVersion>.js',
		cn = ln;
	function dn(n) {
		var o;
		n.scriptUrlPattern;
		var i = n.token,
			r = n.apiKey,
			s = void 0 === r ? i : r,
			a = t(n, ['scriptUrlPattern', 'token', 'apiKey']),
			l =
				null !==
					(o = (function (e, t) {
						return (function (e, t) {
							return Object.prototype.hasOwnProperty.call(e, t);
						})(e, t)
							? e[t]
							: void 0;
					})(n, 'scriptUrlPattern')) && void 0 !== o
					? o
					: ln,
			c = (function () {
				var e = [],
					t = function () {
						e.push({ time: new Date(), state: document.visibilityState });
					},
					n = (function (e, t, n, o) {
						return (
							e.addEventListener(t, n, o),
							function () {
								return e.removeEventListener(t, n, o);
							}
						);
					})(document, 'visibilitychange', t);
				return t(), [e, n];
			})(),
			d = c[0],
			u = c[1];
		return Promise.resolve()
			.then(function () {
				if (!s || 'string' != typeof s) throw new Error('API key required');
				var e = (function (e, t) {
					return (Array.isArray(e) ? e : [e]).map(function (e) {
						return (function (e, t) {
							var n = encodeURIComponent;
							return e.replace(/<[^<>]+>/g, function (e) {
								return '<version>' === e
									? '3'
									: '<apiKey>' === e
										? n(t)
										: '<loaderVersion>' === e
											? n('3.9.9')
											: e;
							});
						})(String(e), t);
					});
				})(l, s);
				return an(e, un);
			})
			.catch(function (e) {
				throw (
					(u(),
					(function (e) {
						return e instanceof Error && e.message === sn ? new Error(rn) : e;
					})(e))
				);
			})
			.then(function (t) {
				var n = t[0],
					o = t[1];
				return (
					u(),
					n.load(e(e({}, a), { ldi: { attempts: o, visibilityStates: d } }))
				);
			});
	}
	function un(e) {
		return (function (e, t, n, o) {
			var i,
				r = document,
				s = 'securitypolicyviolation',
				a = function (t) {
					var n = new URL(e, location.href),
						o = t.blockedURI;
					(o !== n.href && o !== n.protocol.slice(0, -1) && o !== n.origin) ||
						((i = t), l());
				};
			r.addEventListener(s, a);
			var l = function () {
				return r.removeEventListener(s, a);
			};
			return (
				null == o || o.then(l, l),
				Promise.resolve()
					.then(t)
					.then(
						function (e) {
							return l(), e;
						},
						function (e) {
							return new Promise(function (e) {
								var t = new MessageChannel();
								(t.port1.onmessage = function () {
									return e();
								}),
									t.port2.postMessage(null);
							}).then(function () {
								if ((l(), i)) return n(i);
								throw e;
							});
						}
					)
			);
		})(
			e,
			function () {
				return (function (e) {
					return new Promise(function (t, n) {
						if (
							(function (e) {
								if (URL.prototype)
									try {
										return new URL(e, location.href), !1;
									} catch (e) {
										if (e instanceof Error && 'TypeError' === e.name) return !0;
										throw e;
									}
							})(e)
						)
							throw new Error(on);
						var o = document.createElement('script'),
							i = function () {
								var e;
								return null === (e = o.parentNode) || void 0 === e
									? void 0
									: e.removeChild(o);
							},
							r = document.head || document.getElementsByTagName('head')[0];
						(o.onload = function () {
							i(), t();
						}),
							(o.onerror = function () {
								i(), n(new Error(rn));
							}),
							(o.async = !0),
							(o.src = e),
							r.appendChild(o);
					});
				})(e);
			},
			function () {
				throw new Error(nn);
			}
		).then(hn);
	}
	function hn() {
		var e = window,
			t = '__fpjs_p_l_b',
			n = e[t];
		if (
			((function (e, t) {
				var n,
					o =
						null === (n = Object.getOwnPropertyDescriptor) || void 0 === n
							? void 0
							: n.call(Object, e, t);
				(null == o ? void 0 : o.configurable)
					? delete e[t]
					: (o && !o.writable) || (e[t] = void 0);
			})(e, t),
			'function' != typeof (null == n ? void 0 : n.load))
		)
			throw new Error(sn);
		return n;
	}
	const pn = (e, t) => {
			var n;
			return (
				['beforeRequest', 'afterRequest'].reduce(
					(n, o) => {
						var i;
						return (
							(n[o] = []
								.concat(
									(null === (i = e.hooks) || void 0 === i ? void 0 : i[o]) || []
								)
								.concat((null == t ? void 0 : t[o]) || [])),
							n
						);
					},
					null !== (n = e.hooks) && void 0 !== n ? n : (e.hooks = {})
				),
				e
			);
		},
		gn = async (e) => {
			if (!(null == e ? void 0 : e.ok)) return {};
			const t = await (null == e ? void 0 : e.clone().json());
			return (null == t ? void 0 : t.authInfo) || t || {};
		},
		fn = async (e) => {
			const t = await gn(e);
			return (
				(null == t ? void 0 : t.user) ||
				((null == t ? void 0 : t.hasOwnProperty('userId')) ? t : void 0)
			);
		},
		vn = 'undefined' != typeof localStorage,
		mn = (e, t) =>
			vn &&
			(null === localStorage || void 0 === localStorage
				? void 0
				: localStorage.setItem(e, t)),
		bn = (e) =>
			vn &&
			(null === localStorage || void 0 === localStorage
				? void 0
				: localStorage.getItem(e)),
		wn = (e) =>
			vn &&
			(null === localStorage || void 0 === localStorage
				? void 0
				: localStorage.removeItem(e)),
		yn = (...e) => {
			console.debug(...e);
		},
		In = 'undefined' != typeof window,
		kn = Math.pow(2, 31) - 1,
		jn = 'DS',
		On = 'DSR';
	function Cn(e = '') {
		return bn(`${e}${On}`) || '';
	}
	function An(e = '') {
		wn(`${e}${On}`), wn(`${e}${jn}`), en.remove(jn);
	}
	const Sn =
			(In &&
				(null === localStorage || void 0 === localStorage
					? void 0
					: localStorage.getItem('fingerprint.endpoint.url'))) ||
			'https://api.descope.com',
		xn = 'fp',
		Un = (e = !1) => {
			const t = localStorage.getItem(xn);
			if (!t) return null;
			const n = JSON.parse(t);
			return new Date().getTime() > n.expiry && !e ? null : n.value;
		},
		En = async (e, t = Sn) => {
			try {
				if (Un()) return;
				const n = (
						Date.now().toString(36) +
						Math.random().toString(36).substring(2) +
						Math.random().toString(36).substring(2)
					).substring(0, 27),
					o = new URL(t);
				o.pathname = '/fXj8gt3x8VulJBna/x96Emn69oZwcd7I6';
				const i = new URL(t);
				i.pathname = '/fXj8gt3x8VulJBna/w78aRZnnDZ3Aqw0I';
				const r =
						i.toString() +
						'?apiKey=<apiKey>&version=<version>&loaderVersion=<loaderVersion>',
					s = dn({
						apiKey: e,
						endpoint: [o.toString(), tn],
						scriptUrlPattern: [r, cn]
					}),
					a = await s,
					{ requestId: l } = await a.get({ linkedId: n }),
					c = ((e, t) => ({ vsid: e, vrid: t }))(n, l);
				((e) => {
					const t = { value: e, expiry: new Date().getTime() + 864e5 };
					localStorage.setItem(xn, JSON.stringify(t));
				})(c);
			} catch (e) {
				console.warn('Could not load fingerprint', e);
			}
		},
		Ln = (e) => {
			const t = Un(!0);
			return t && e.body && (e.body.fpData = t), e;
		},
		Tn = 'dls_last_user_login_id',
		Rn = 'dls_last_user_display_name',
		Pn = () => bn(Tn),
		$n = () => bn(Rn),
		Mn =
			(e) =>
			async (...t) => {
				var n;
				t[1] = t[1] || {};
				const [, o = {}] = t,
					i = Pn(),
					r = $n();
				return (
					i &&
						((null !== (n = o.lastAuth) && void 0 !== n) || (o.lastAuth = {}),
						(o.lastAuth.loginId = i),
						(o.lastAuth.name = r)),
					await e(...t)
				);
			};
	function qn() {
		const e = [];
		return {
			pub: (t) => {
				e.forEach((e) => e(t));
			},
			sub: (t) => {
				const n = e.push(t) - 1;
				return () => e.splice(n, 1);
			}
		};
	}
	async function Wn(e) {
		const t = (function (e) {
			var t;
			const n = JSON.parse(e);
			return (
				(n.publicKey.challenge = Hn(n.publicKey.challenge)),
				(n.publicKey.user.id = Hn(n.publicKey.user.id)),
				null === (t = n.publicKey.excludeCredentials) ||
					void 0 === t ||
					t.forEach((e) => {
						e.id = Hn(e.id);
					}),
				n
			);
		})(e);
		return (
			(n = await navigator.credentials.create(t)),
			JSON.stringify({
				id: n.id,
				rawId: Jn(n.rawId),
				type: n.type,
				response: {
					attestationObject: Jn(n.response.attestationObject),
					clientDataJSON: Jn(n.response.clientDataJSON)
				}
			})
		);
		var n;
	}
	async function Dn(e) {
		const t = Fn(e);
		return Kn(await navigator.credentials.get(t));
	}
	async function Nn(e, t) {
		const n = Fn(e);
		return (
			(n.signal = t.signal),
			(n.mediation = 'conditional'),
			Kn(await navigator.credentials.get(n))
		);
	}
	async function _n(e = !1) {
		if (!In) return Promise.resolve(!1);
		const t = !!(
			window.PublicKeyCredential &&
			navigator.credentials &&
			navigator.credentials.create &&
			navigator.credentials.get
		);
		return t &&
			e &&
			PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
			? PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
			: t;
	}
	function Fn(e) {
		var t;
		const n = JSON.parse(e);
		return (
			(n.publicKey.challenge = Hn(n.publicKey.challenge)),
			null === (t = n.publicKey.allowCredentials) ||
				void 0 === t ||
				t.forEach((e) => {
					e.id = Hn(e.id);
				}),
			n
		);
	}
	function Kn(e) {
		return JSON.stringify({
			id: e.id,
			rawId: Jn(e.rawId),
			type: e.type,
			response: {
				authenticatorData: Jn(e.response.authenticatorData),
				clientDataJSON: Jn(e.response.clientDataJSON),
				signature: Jn(e.response.signature),
				userHandle: e.response.userHandle ? Jn(e.response.userHandle) : void 0
			}
		});
	}
	function Hn(e) {
		const t = e.replace(/_/g, '/').replace(/-/g, '+');
		return Uint8Array.from(atob(t), (e) => e.charCodeAt(0)).buffer;
	}
	function Jn(e) {
		return btoa(String.fromCharCode.apply(null, new Uint8Array(e)))
			.replace(/\//g, '_')
			.replace(/\+/g, '-')
			.replace(/=/g, '');
	}
	var Vn,
		zn =
			((Vn = (e) => ({
				async signUp(t, n) {
					const o = await e.webauthn.signUp.start(t, window.location.origin, n);
					if (!o.ok) return o;
					const i = await Wn(o.data.options);
					return await e.webauthn.signUp.finish(o.data.transactionId, i);
				},
				async signIn(t) {
					const n = await e.webauthn.signIn.start(t, window.location.origin);
					if (!n.ok) return n;
					const o = await Dn(n.data.options);
					return await e.webauthn.signIn.finish(n.data.transactionId, o);
				},
				async signUpOrIn(t) {
					var n;
					const o = await e.webauthn.signUpOrIn.start(
						t,
						window.location.origin
					);
					if (!o.ok) return o;
					if (null === (n = o.data) || void 0 === n ? void 0 : n.create) {
						const t = await Wn(o.data.options);
						return await e.webauthn.signUp.finish(o.data.transactionId, t);
					}
					{
						const t = await Dn(o.data.options);
						return await e.webauthn.signIn.finish(o.data.transactionId, t);
					}
				},
				async update(t, n) {
					const o = await e.webauthn.update.start(t, window.location.origin, n);
					if (!o.ok) return o;
					const i = await Wn(o.data.options);
					return await e.webauthn.update.finish(o.data.transactionId, i);
				},
				helpers: { create: Wn, get: Dn, isSupported: _n, conditional: Nn }
			})),
			(...e) => {
				const t = Vn(...e);
				return (
					Object.assign(t.signUp, e[0].webauthn.signUp),
					Object.assign(t.signIn, e[0].webauthn.signIn),
					Object.assign(t.signUpOrIn, e[0].webauthn.signUpOrIn),
					Object.assign(t.update, e[0].webauthn.update),
					t
				);
			});
	const Bn = '/fedcm/config',
		Zn = (e, t) => ({
			async oneTap(t, n, o, i) {
				const r = null != t ? t : 'google',
					s = await e.oauth.startNative(r, o, !0);
				if (!s.ok) return s;
				const { clientId: a, stateId: l, nonce: c } = s.data,
					d = await (async function () {
						return new Promise((e, t) => {
							if (window.google) return void e(window.google.accounts.id);
							let n = document.getElementById('google-gsi-client-script');
							n ||
								((n = document.createElement('script')),
								document.head.appendChild(n),
								(n.async = !0),
								(n.defer = !0),
								(n.id = 'google-gsi-client-script'),
								(n.src = 'https://accounts.google.com/gsi/client')),
								(n.onload = function () {
									window.google
										? e(window.google.accounts.id)
										: t(
												'Failed to load Google GSI client script - not loaded properly'
											);
								}),
								(n.onerror = function () {
									t('Failed to load Google GSI client script - failed to load');
								});
						});
					})();
				return new Promise((t) => {
					var o, s;
					d.initialize(
						Object.assign(Object.assign({}, n), {
							itp_support:
								null === (o = null == n ? void 0 : n.itp_support) ||
								void 0 === o ||
								o,
							use_fedcm_for_prompt:
								null === (s = null == n ? void 0 : n.use_fedcm_for_prompt) ||
								void 0 === s ||
								s,
							client_id: a,
							callback: (n) => {
								t(e.oauth.finishNative(r, l, '', '', n.credential));
							},
							nonce: c
						})
					),
						d.prompt((e) => {
							(null == e ? void 0 : e.isSkippedMoment()) && (null == i || i());
						});
				});
			},
			async launch(n) {
				var o;
				const i = {
						identity: {
							context: n || 'signin',
							providers: [
								{ configURL: e.httpClient.buildUrl(t + Bn), clientId: t }
							]
						}
					},
					r = await (null === (o = navigator.credentials) || void 0 === o
						? void 0
						: o.get(i));
				return e.refresh(r.token);
			},
			isSupported: () => In && 'IdentityCredential' in window
		});
	var Gn = (e) =>
		Object.assign(Object.assign({}, e.flow), {
			start: async (...t) => {
				const n = await _n(),
					o = Object.assign(
						Object.assign({ location: window.location.href }, t[1]),
						{ deviceInfo: { webAuthnSupport: n }, startOptionsVersion: 1 }
					);
				return (t[1] = o), e.flow.start(...t);
			}
		});
	const Xn = (function (...e) {
			return (t) => e.reduce((e, t) => t(e), t);
		})(
			(e) => (n) => {
				var { fpKey: o, fpLoad: i } = n,
					r = t(n, ['fpKey', 'fpLoad']);
				return In
					? (o && i && En(o).catch(() => null), e(pn(r, { beforeRequest: Ln })))
					: e(r);
			},
			(e) => (n) => {
				var { autoRefresh: o } = n,
					i = t(n, ['autoRefresh']);
				if (!o) return e(i);
				const { clearAllTimers: r, setTimer: s } = (() => {
					const e = [];
					return {
						clearAllTimers: () => {
							for (; e.length; ) clearTimeout(e.pop());
						},
						setTimer: (t, n) => {
							e.push(setTimeout(t, n));
						}
					};
				})();
				let a, c;
				In &&
					document.addEventListener('visibilitychange', () => {
						'visible' === document.visibilityState &&
							new Date() > a &&
							(yn('Expiration time passed, refreshing session'),
							d.refresh(Cn() || c));
					});
				const d = e(
					pn(i, {
						afterRequest: async (e, t) => {
							const { refreshJwt: n, sessionJwt: o } = await gn(t);
							if (401 === (null == t ? void 0 : t.status))
								yn('Received 401, canceling all timers'), r();
							else if (o) {
								if (
									((a = ((e) => {
										try {
											const t = l(e);
											if (t.exp) return new Date(1e3 * t.exp);
										} catch (e) {
											return null;
										}
									})(o)),
									!a)
								)
									return void yn(
										'Could not extract expiration time from session token'
									);
								c = n;
								let e =
									((i = a) ? i.getTime() - new Date().getTime() : 0) - 2e4;
								e > kn &&
									(yn(`Timeout is too large (${e}ms), setting it to ${kn}ms`),
									(e = kn)),
									r();
								const t = new Date(Date.now() + e).toLocaleTimeString('en-US', {
									hour12: !1
								});
								yn(`Setting refresh timer for ${t}. (${e}ms)`),
									s(() => {
										yn('Refreshing session due to timer'), d.refresh(Cn() || n);
									}, e);
							}
							var i;
						}
					})
				);
				return Ke(d, ['logout', 'logoutAll'], (e) => async (...t) => {
					const n = await e(...t);
					return yn('Clearing all timers'), r(), n;
				});
			},
			(e) => (t) =>
				e(
					Object.assign(Object.assign({}, t), {
						baseHeaders: Object.assign(
							{
								'x-descope-sdk-name': 'web-js',
								'x-descope-sdk-version': '1.15.5'
							},
							t.baseHeaders
						)
					})
				),
			(e) => (t) => {
				const n = qn(),
					o = qn(),
					i = e(
						pn(t, {
							afterRequest: async (e, t) => {
								if (401 === (null == t ? void 0 : t.status))
									n.pub(null), o.pub(null);
								else {
									const e = await fn(t);
									e && o.pub(e);
									const { sessionJwt: i } = await gn(t);
									i && n.pub(i);
								}
							}
						})
					),
					r = Ke(i, ['logout', 'logoutAll'], (e) => async (...t) => {
						const i = await e(...t);
						return n.pub(null), o.pub(null), i;
					});
				return Object.assign(r, {
					onSessionTokenChange: n.sub,
					onUserChange: o.sub
				});
			},
			(e) => (n) => {
				var {
						storeLastAuthenticatedUser: o = !0,
						keepLastAuthenticatedUserAfterLogout: i = !1
					} = n,
					r = t(n, [
						'storeLastAuthenticatedUser',
						'keepLastAuthenticatedUserAfterLogout'
					]);
				if (!o)
					return Object.assign(e(r), {
						getLastUserLoginId: Pn,
						getLastUserDisplayName: $n
					});
				const s = e(
					pn(r, {
						afterRequest: async (e, t) => {
							var n;
							const o = await fn(t),
								i =
									null === (n = null == o ? void 0 : o.loginIds) || void 0 === n
										? void 0
										: n[0],
								r = null == o ? void 0 : o.name;
							i &&
								(((e) => {
									mn(Tn, e);
								})(i),
								((e) => {
									mn(Rn, e);
								})(r));
						}
					})
				);
				let a = Ke(s, ['flow.start'], Mn);
				return (
					(a = Ke(
						a,
						['logout', 'logoutAll'],
						(
							(e) =>
							(t) =>
							async (...n) => {
								const o = await t(...n);
								return e || (wn(Tn), wn(Rn)), o;
							}
						)(i)
					)),
					Object.assign(a, {
						getLastUserLoginId: Pn,
						getLastUserDisplayName: $n
					})
				);
			},
			(e) => (n) => {
				var {
						persistTokens: o,
						sessionTokenViaCookie: i,
						storagePrefix: r
					} = n,
					s = t(n, ['persistTokens', 'sessionTokenViaCookie', 'storagePrefix']);
				if (!o || !In) return e(s);
				const a = e(
					pn(s, {
						beforeRequest:
							((l = r), (e) => Object.assign(e, { token: e.token || Cn(l) })),
						afterRequest: async (e, n) => {
							const o = /^\/v\d+\/mgmt\//.test(e.path);
							401 === (null == n ? void 0 : n.status)
								? o || An(r)
								: ((e = {}, n, o) => {
										var { refreshJwt: i, sessionJwt: r } = e,
											s = t(e, ['refreshJwt', 'sessionJwt']);
										void 0 === n && (n = !1),
											void 0 === o && (o = ''),
											i && mn(`${o}${On}`, i),
											r &&
												(n
													? (function (
															e,
															t,
															{
																cookiePath: n,
																cookieDomain: o,
																cookieExpiration: i
															}
														) {
															if (t) {
																const r = new Date(1e3 * i),
																	s = (function (e) {
																		const t =
																				window.location.hostname.split('.'),
																			n = e.split('.');
																		return t.slice(-n.length).join('.') === e;
																	})(o);
																en.set(e, t, {
																	path: n,
																	domain: s ? o : void 0,
																	expires: r,
																	sameSite: 'Strict',
																	secure: !0
																});
															}
														})(jn, r, s)
													: mn(`${o}${jn}`, r));
									})(await gn(n), i, r);
						}
					})
				);
				var l;
				const c = Ke(
					a,
					['logout', 'logoutAll'],
					(
						(e) =>
						(t) =>
						async (...n) => {
							const o = await t(...n);
							return An(e), o;
						}
					)(r)
				);
				return Object.assign(c, {
					getRefreshToken: () => Cn(r),
					getSessionToken: () =>
						(function (e = '') {
							return en.get(jn) || bn(`${e}${jn}`) || '';
						})(r)
				});
			}
		)((...e) => {
			const t = Yt(...e);
			return Object.assign(Object.assign({}, t), {
				flow: Gn(t),
				webauthn: zn(t),
				fedcm: Zn(t, e[0].projectId)
			});
		}),
		Yn = 'undefined' != typeof localStorage,
		Qn = (Yn && localStorage.getItem('base.content.url')) || '',
		eo = 'config.json',
		to = 'base.ui.components.url',
		no =
			(Yn && localStorage.getItem(to)) ||
			'https://static.descope.com/npm/@descope/web-components-ui@<version>/dist/umd/index.js',
		oo =
			(Yn && localStorage.getItem(to)) ||
			'https://cdn.jsdelivr.net/npm/@descope/web-components-ui@<version>/dist/umd/index.js',
		io = 'descope-login-flow',
		ro = 'code',
		so = 'ra-challenge',
		ao = 'ra-callback',
		lo = 'ra-backup-callback',
		co = 'ra-initiator',
		uo = 'data-exclude-field',
		ho = 'dls_last_auth',
		po = 'state_id',
		go = 'saml_idp_state_id',
		fo = 'saml_idp_username',
		vo = 'descope_idp_initiated',
		mo = 'sso_app_id',
		bo = 'oidc_login_hint',
		wo = 'oidc_prompt',
		yo = 'data-type',
		Io = 'redirect',
		ko = 'poll',
		jo = 'webauthnCreate',
		Oo = 'webauthnGet',
		Co = 'loadForm',
		Ao = 'submit',
		So = 'polling',
		xo = ['descope-multi-select-combo-box', 'descope-text-area'];
	var Uo;
	function Eo(e) {
		return new URLSearchParams(window.location.search).get(e);
	}
	function Lo(e) {
		if (window.history.replaceState && Eo(e)) {
			const t = new URL(window.location.href),
				n = new URLSearchParams(t.search);
			n.delete(e),
				(t.search = n.toString()),
				window.history.replaceState({}, '', t.toString());
		}
	}
	function To(e, t) {
		return n(this, void 0, void 0, function* () {
			const n = yield fetch(e, { cache: 'default' });
			if (!n.ok) throw Error(`Error fetching URL ${e} [${n.status}]`);
			return {
				body: yield n[t || 'text'](),
				headers: Object.fromEntries(n.headers.entries())
			};
		});
	}
	!(function (e) {
		(e.backward = 'backward'), (e.forward = 'forward');
	})(Uo || (Uo = {}));
	function Ro({
		projectId: e,
		filename: t,
		assetsFolder: n = 'v2-beta',
		baseUrl: o
	}) {
		const i = new URL(Qn || o || 'https://static.descope.com/pages');
		return (
			(i.pathname = ((...e) => e.join('/').replace(/\/+/g, '/'))(
				i.pathname,
				e,
				n,
				t
			)),
			i.toString()
		);
	}
	function Po(e, t) {
		if (!t) return;
		const n = +e,
			o = +t;
		return Number.isNaN(n) || Number.isNaN(o)
			? void 0
			: n > o
				? Uo.forward
				: n < o
					? Uo.backward
					: void 0;
	}
	const $o = () => {
		const [e = '', t = ''] = (Eo(io) || '').split('_');
		return { executionId: e, stepId: t };
	};
	function Mo() {
		Lo(io);
	}
	const qo = (e) => e.replace(/-./g, (e) => e[1].toUpperCase()),
		Wo = () => {
			const { executionId: e, stepId: t } = $o();
			(e || t) && Mo();
			const n = Eo('t') || void 0;
			n && Lo('t');
			const o = Eo(ro) || void 0;
			o && Lo(ro);
			const i = Eo('err') || void 0;
			i && Lo('err');
			const {
				redirectAuthCodeChallenge: r,
				redirectAuthCallbackUrl: s,
				redirectAuthBackupCallbackUri: a,
				redirectAuthInitiator: l
			} = {
				redirectAuthCodeChallenge: Eo(so),
				redirectAuthCallbackUrl: Eo(ao),
				redirectAuthBackupCallbackUri: Eo(lo),
				redirectAuthInitiator: Eo(co)
			};
			(r || s || a || l) && (Lo(so), Lo(ao), Lo(lo), Lo(co));
			const c = Eo(po);
			c && Lo(po);
			const d = Eo(go);
			d && Lo(go);
			const u = Eo(fo);
			d && Lo(fo);
			const h = Eo(vo);
			h && Lo(vo);
			const p = Eo(mo);
			p && Lo(mo);
			const g = Eo(bo);
			g && Lo(bo);
			const f = Eo(wo);
			f && Lo(wo);
			return {
				executionId: e,
				stepId: t,
				token: n,
				code: o,
				exchangeError: i,
				redirectAuthCodeChallenge: r,
				redirectAuthCallbackUrl: s,
				redirectAuthBackupCallbackUri: a,
				redirectAuthInitiator: l,
				oidcIdpStateId: c,
				samlIdpStateId: d,
				samlIdpUsername: u,
				descopeIdpInitiated: 'true' === h,
				ssoAppId: p,
				oidcLoginHint: g,
				oidcPrompt: f
			};
		},
		Do = (e) => {
			let t, n;
			return (...o) => {
				return (
					(t &&
						((r = o),
						(i = t).length === r.length && i.every((e, t) => e === r[t]))) ||
						((t = o), (n = e(...o))),
					n
				);
				var i, r;
			};
		};
	const No = (e, t, n, o, i, r, s) =>
			e && !t && e && !n && !o && e && !i && e && !r && e && !s,
		_o = (e) => (null == e ? void 0 : e.submit()),
		Fo = (e, t) => {
			const n = t.find((t) => e[t]);
			return n ? e[n] : null;
		},
		Ko = (e, t = 100) => {
			let n;
			return function (...o) {
				n || e.apply(this, o),
					clearTimeout(n),
					(n = setTimeout(() => {
						n = null;
					}, t));
			};
		};
	function Ho(e) {
		let t = navigator.language;
		return (
			t && 'zh-TW' !== t && (t = t.split('-')[0]), (e || t || '').toLowerCase()
		);
	}
	var Jo, Vo, zo, Bo;
	function Zo(e, t) {
		const n = Object.getOwnPropertyNames(e),
			o = Object.getOwnPropertyNames(t);
		if (n.length !== o.length) return !1;
		for (let o = 0; o < n.length; o += 1) {
			const i = n[o],
				r = e[i],
				s = t[i];
			if (null === r || null === s) {
				if (r !== s) return !1;
			} else if ('object' == typeof r && 'object' == typeof s) {
				if (!Zo(r, s)) return !1;
			} else if (r !== s) return !1;
		}
		return !0;
	}
	class Go {
		constructor(e = {}, { updateOnlyOnChange: t = !0 } = {}) {
			Jo.set(this, void 0),
				Vo.set(this, {}),
				zo.set(this, 0),
				Bo.set(this, !1),
				(this.update = (e) => {
					const t = 'function' == typeof e ? e(o(this, Jo, 'f')) : e,
						n = Object.assign(Object.assign({}, o(this, Jo, 'f')), t);
					if (!o(this, Bo, 'f') || !Zo(o(this, Jo, 'f'), n)) {
						const e = o(this, Jo, 'f');
						i(this, Jo, n, 'f'),
							Object.freeze(o(this, Jo, 'f')),
							setTimeout(() => {
								Object.values(o(this, Vo, 'f')).forEach((t) =>
									t(
										n,
										e,
										(
											(e, t) => (n) =>
												e[n] !== t[n]
										)(n, e)
									)
								);
							}, 0);
					}
				}),
				i(this, Jo, e, 'f'),
				i(this, Bo, t, 'f');
		}
		get current() {
			return Object.assign({}, o(this, Jo, 'f'));
		}
		subscribe(e) {
			return (
				i(this, zo, o(this, zo, 'f') + 1, 'f'),
				(o(this, Vo, 'f')[o(this, zo, 'f')] = e),
				o(this, zo, 'f').toString()
			);
		}
		unsubscribe(e) {
			const t = !!o(this, Vo, 'f')[e];
			return t && delete o(this, Vo, 'f')[e], t;
		}
		unsubscribeAll() {
			return i(this, Vo, {}, 'f'), !0;
		}
	}
	(Jo = new WeakMap()),
		(Vo = new WeakMap()),
		(zo = new WeakMap()),
		(Bo = new WeakMap());
	const Xo = ['disabled'],
		Yo = (e, t) => {
			Object.entries(t || {}).forEach(([t, n]) => {
				Array.from(e.querySelectorAll(`*[name="${t}"]:not([${uo}])`)).forEach(
					(e) => {
						e.value = n;
					}
				);
			});
		},
		Qo = (e, t) =>
			e.replace(/{{(.+?)}}/g, (e, n) => {
				return (
					(o = t),
					n.split('.').reduce((e, t) => (null == e ? void 0 : e[t]) || '', o)
				);
				var o;
			}),
		ei = (e, t, n) => {
			e.querySelectorAll(`[${yo}="${t}"]`).forEach((e) => {
				e.setAttribute('href', n);
			});
		},
		ti = (e, t, n) => {
			var o, i;
			const r =
				null === (o = customElements.get(t)) || void 0 === o
					? void 0
					: o.cssVarList.url;
			n &&
				r &&
				(null === (i = null == e ? void 0 : e.style) ||
					void 0 === i ||
					i.setProperty(r, `url(data:image/jpg;base64,${n})`));
		},
		ni = (e, t, n, o, i, r) => {
			var s, a;
			let l = null == t ? void 0 : t.errorText;
			try {
				l =
					(null == i
						? void 0
						: i({
								text: null == t ? void 0 : t.errorText,
								type: null == t ? void 0 : t.errorType
							})) || (null == t ? void 0 : t.errorText);
			} catch (e) {
				r.error('Error transforming error message', e.message);
			}
			((e, t, n = '') => {
				e.querySelectorAll(`[${yo}="${t}"]`).forEach((e) => {
					(e.textContent = n), e.classList[n ? 'remove' : 'add']('hide');
				});
			})(e, 'error-message', l),
				ei(
					e,
					'totp-link',
					null === (s = null == t ? void 0 : t.totp) || void 0 === s
						? void 0
						: s.provisionUrl
				),
				ei(
					e,
					'notp-link',
					null === (a = null == t ? void 0 : t.notp) || void 0 === a
						? void 0
						: a.redirectUrl
				),
				((e, t) => {
					e.querySelectorAll(
						'descope-text,descope-link,descope-enriched-text,descope-code-snippet'
					).forEach((e) => {
						e.textContent = Qo(e.textContent, t);
						const n = e.getAttribute('href');
						n && e.setAttribute('href', Qo(n, t));
					});
				})(e, t),
				((e, t, n) => {
					t &&
						Object.keys(t).forEach((o) => {
							e.querySelectorAll(`[name=${o}]`).forEach((e) => {
								const i = t[o];
								Object.keys(i).forEach((t) => {
									let o = i[t];
									if ('string' != typeof o)
										try {
											o = JSON.stringify(o);
										} catch (e) {
											n.error(
												`Could not stringify value "${o}" for "${t}"`,
												e.message
											),
												(o = '');
										}
									e.setAttribute(t, o);
								});
							});
						});
				})(e, n, r),
				((e, t) => {
					e.querySelectorAll('[data-has-dynamic-attr-values]').forEach((e) => {
						Array.from(e.attributes).forEach((e) => {
							e.value = Qo(e.value, t);
						});
					});
				})(e, t),
				((e, t) => {
					Object.entries(t).forEach(([t, n]) => {
						e.querySelectorAll(`[name="${t}"]`).forEach((e) => {
							Object.entries(n).forEach(([t, n]) => {
								Xo.includes(t) && e.setAttribute(t, n);
							});
						});
					});
				})(e, o);
		},
		oi = Do(() =>
			n(void 0, void 0, void 0, function* () {
				var e, t, n, o, i;
				if (
					!window.PublicKeyCredential ||
					!PublicKeyCredential.isConditionalMediationAvailable ||
					!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
				)
					return !1;
				try {
					const r = Promise.all([
							null === (e = window.PublicKeyCredential) || void 0 === e
								? void 0
								: e.isConditionalMediationAvailable(),
							null === (t = window.PublicKeyCredential) || void 0 === t
								? void 0
								: t.isUserVerifyingPlatformAuthenticatorAvailable()
						]).then((e) => e.every((e) => !!e)),
						s =
							(() => {
								var e;
								const t =
										null ===
											(e =
												null === navigator || void 0 === navigator
													? void 0
													: navigator.userAgentData) || void 0 === e
											? void 0
											: e.brands,
									n =
										null == t
											? void 0
											: t.find(
													({ brand: e, version: t }) =>
														'Chromium' === e && parseFloat(t)
												);
								return n ? n.version : 0;
							})() >= 108;
					return yield ((n = 100),
					(o = r),
					(i = s),
					new Promise((e, t) => {
						let r = !1;
						const s = setTimeout(() => {
							(r = !0),
								void 0 !== i
									? e(i)
									: t(new Error(`Promise timed out after ${n} ms`));
						}, n);
						o.then((t) => {
							r || (clearTimeout(s), e(t));
						}).catch((e) => {
							r || (clearTimeout(s), t(e));
						});
					}));
				} catch (e) {
					return console.error('Conditional login check failed', e), !1;
				}
			})
		),
		ii = (e, t, n, o = {}) => {
			var i, r, s, a;
			return [
				Math.min(
					Math.max(
						t,
						('all' === o.left
							? e.offsetWidth
							: null !== (i = o.left) && void 0 !== i
								? i
								: 0) - e.offsetWidth
					),
					window.innerWidth -
						('all' === o.right
							? e.offsetWidth
							: null !== (r = o.right) && void 0 !== r
								? r
								: 0)
				),
				Math.min(
					Math.max(
						n,
						('all' === o.top
							? e.offsetHeight
							: null !== (s = o.top) && void 0 !== s
								? s
								: 0) - e.offsetHeight
					),
					window.innerHeight -
						('all' === o.bottom
							? e.offsetHeight
							: null !== (a = o.bottom) && void 0 !== a
								? a
								: 0)
				)
			];
		},
		ri = {
			'lastAuth.loginId': {
				'not-empty': (e) => !!e.loginId,
				empty: (e) => !e.loginId
			},
			idpInitiated: { 'is-true': (e) => !!e.code, 'is-false': (e) => !e.code },
			externalToken: {
				'is-true': (e) => !!e.token,
				'is-false': (e) => !e.token
			},
			abTestingKey: {
				'greater-than': (e, t) => (e.abTestingKey || 0) > t,
				'less-than': (e, t) => (e.abTestingKey || 0) < t
			}
		};
	function si(e) {
		const t = {};
		if (e)
			try {
				Object.assign(t, JSON.parse(localStorage.getItem(ho)));
			} catch (e) {}
		return t;
	}
	const ai = 'dls_ab_testing_id',
		li = document.createElement('template');
	li.innerHTML =
		'\n\t<style>\n\t\t:host {\n      all: initial;\n\t\t\twidth: 100%;\n\t\t\theight: 100%;\n      display: block;\n\t\t}\n\n\t\t#wc-root {\n\t\t\theight: 100%;\n\t\t\ttransition: opacity 300ms ease-in-out;\n      display: flex;\n\t\t}\n\n\t\t#wc-root[data-theme] {\n\t\t\tbackground-color: transparent;\n\t\t}\n\n\t\t.fade-out {\n\t\t\topacity: 0.1;\n\t\t}\n\n\t</style>\n\t<div id="wc-root"></div>\n\t';
	const ci = (e, t = '') =>
		Object.keys(e).reduce((n, o) => {
			var i;
			if (
				'object' == typeof e[o] &&
				null !== e[o] &&
				!(null === (i = e[o]) || void 0 === i ? void 0 : i.value)
			)
				return Object.assign(Object.assign({}, n), ci(e[o], `${t + o}.`));
			const r = 'object' == typeof e[o] ? e[o] : { value: e[o] },
				s = Object.assign(Object.assign({}, n), {
					[t + o]: r,
					[`form.${t}${o}`]: r
				});
			return 'displayName' === o
				? Object.assign(Object.assign({}, s), {
						[`${t}fullName`]: r,
						[`form.${t}fullName`]: r
					})
				: s;
		}, []);
	var di,
		ui,
		hi,
		pi,
		gi,
		fi,
		vi,
		mi,
		bi,
		wi,
		yi,
		Ii,
		ki,
		ji,
		Oi,
		Ci,
		Ai,
		Si,
		xi,
		Ui,
		Ei,
		Li,
		Ti,
		Ri,
		Pi,
		$i,
		Mi,
		qi,
		Wi,
		Di,
		Ni,
		_i,
		Fi,
		Ki,
		Hi,
		Ji,
		Vi,
		zi,
		Bi,
		Zi,
		Gi,
		Xi,
		Yi,
		Qi,
		er,
		tr,
		nr,
		or,
		ir,
		rr,
		sr,
		ar,
		lr,
		cr,
		dr,
		ur,
		hr,
		pr,
		gr,
		fr,
		vr;
	class mr extends HTMLElement {
		static get observedAttributes() {
			return [
				'project-id',
				'flow-id',
				'base-url',
				'tenant',
				'theme',
				'locale',
				'debug',
				'storage-prefix',
				'preview',
				'redirect-url',
				'auto-focus',
				'store-last-authenticated-user',
				'keep-last-authenticated-user-after-logout',
				'validate-on-blur'
			];
		}
		constructor(e) {
			super(),
				di.add(this),
				(this.logger = console),
				ui.set(this, !1),
				(this.loggerWrapper = {
					error: (e, t = '') => {
						this.logger.error(e, t, new Error()),
							o(this, di, 'm', Wi).call(this, e, t);
					},
					warn: (e, t = '') => {
						this.logger.warn(e, t);
					},
					info: (e, t = '', n = {}) => {
						this.logger.info(e, t, n);
					},
					debug: (e, t = '') => {
						this.logger.debug(e, t);
					}
				}),
				hi.set(this, new Go()),
				pi.set(this, new Go()),
				gi.set(this, {}),
				(this.getComponentsContext = () => o(this, gi, 'f')),
				(this.nextRequestStatus = new Go({ isLoading: !1 })),
				fi.set(this, void 0),
				vi.set(this, {
					popstate: o(this, di, 'm', ki).bind(this),
					visibilitychange: o(this, di, 'm', ji).bind(this),
					componentsContext: o(this, di, 'm', Pi).bind(this)
				}),
				mi.set(this, void 0),
				xi.set(
					this,
					Do(() =>
						n(this, void 0, void 0, function* () {
							const e = Ro({
								projectId: this.projectId,
								filename: eo,
								baseUrl: this.baseStaticUrl
							});
							try {
								const { body: t, headers: n } = yield To(e, 'json');
								return {
									projectConfig: t,
									executionContext: { geo: n['x-geo'] }
								};
							} catch (e) {
								return { isMissingConfig: !0 };
							}
						})
					)
				),
				Ei.set(this, void 0),
				i(this, mi, e, 'f'),
				o(this, di, 'm', bi).call(this);
		}
		get projectId() {
			return this.getAttribute('project-id');
		}
		get flowId() {
			return this.getAttribute('flow-id');
		}
		get client() {
			try {
				return JSON.parse(this.getAttribute('client')) || {};
			} catch (e) {
				return {};
			}
		}
		get baseUrl() {
			return this.getAttribute('base-url') || void 0;
		}
		get baseStaticUrl() {
			return this.getAttribute('base-static-url');
		}
		get tenant() {
			return this.getAttribute('tenant') || void 0;
		}
		get redirectUrl() {
			return this.getAttribute('redirect-url') || void 0;
		}
		get debug() {
			return 'true' === this.getAttribute('debug');
		}
		get locale() {
			return this.getAttribute('locale') || void 0;
		}
		get theme() {
			var e, t;
			const n = this.getAttribute('theme');
			if ('os' === n) {
				return window.matchMedia &&
					(null ===
						(t =
							null === (e = window.matchMedia) || void 0 === e
								? void 0
								: e.call(window, '(prefers-color-scheme: dark)')) ||
					void 0 === t
						? void 0
						: t.matches)
					? 'dark'
					: 'light';
			}
			return n || 'light';
		}
		get autoFocus() {
			var e;
			const t =
				null !== (e = this.getAttribute('auto-focus')) && void 0 !== e
					? e
					: 'true';
			return 'skipFirstScreen' === t ? t : 'true' === t;
		}
		get validateOnBlur() {
			return 'true' === this.getAttribute('validate-on-blur');
		}
		get storeLastAuthenticatedUser() {
			var e;
			return (
				'true' ===
				(null !== (e = this.getAttribute('store-last-authenticated-user')) &&
				void 0 !== e
					? e
					: 'true')
			);
		}
		get keepLastAuthenticatedUserAfterLogout() {
			return (
				'true' ===
				this.getAttribute('keep-last-authenticated-user-after-logout')
			);
		}
		get storagePrefix() {
			return this.getAttribute('storage-prefix') || '';
		}
		get preview() {
			return !!this.getAttribute('preview');
		}
		get formConfig() {
			return ((e) => {
				try {
					return ci(JSON.parse(e));
				} catch (e) {
					return {};
				}
			})(this.form);
		}
		get form() {
			return this.getAttribute('form');
		}
		get formConfigValues() {
			return (
				(e = this.formConfig),
				(t = 'value'),
				Object.fromEntries(Object.entries(e).map(([e, n]) => [e, n[t]]))
			);
			var e, t;
		}
		getExecutionContext() {
			return n(this, void 0, void 0, function* () {
				const { executionContext: e } = yield o(this, xi, 'f').call(this);
				return e;
			});
		}
		getProjectConfig() {
			return n(this, void 0, void 0, function* () {
				const { projectConfig: e } = yield o(this, xi, 'f').call(this);
				return e;
			});
		}
		getFlowConfig() {
			var e, t;
			return n(this, void 0, void 0, function* () {
				const n = yield this.getProjectConfig(),
					o =
						(null === (e = null == n ? void 0 : n.flows) || void 0 === e
							? void 0
							: e[this.flowId]) || {};
				return (null !== (t = o.version) && void 0 !== t) || (o.version = 0), o;
			});
		}
		getTargetLocales() {
			return n(this, void 0, void 0, function* () {
				const e = yield this.getFlowConfig();
				return ((null == e ? void 0 : e.targetLocales) || []).map((e) =>
					e.toLowerCase()
				);
			});
		}
		connectedCallback() {
			return n(this, void 0, void 0, function* () {
				if (this.shadowRoot.isConnected) {
					if (
						(o(this, pi, 'f').subscribe(o(this, di, 'm', qi).bind(this)),
						o(this, pi, 'f').update({ isDebug: this.debug }),
						o(this, di, 'm', wi).call(this))
					)
						return void o(this, di, 'm', yi).call(this);
					if (
						(o(this, di, 'm', Ii).call(this),
						i(this, Ei, o(this, di, 'm', Ui).call(this), 'f'),
						yield o(this, di, 'm', Ai).call(this))
					)
						return void this.loggerWrapper.error(
							'This SDK version does not support your flows version',
							'Make sure to upgrade your flows to the latest version or use an older SDK version'
						);
					if ((yield o(this, xi, 'f').call(this)).isMissingConfig)
						return void this.loggerWrapper.error(
							'Cannot get config file',
							'Make sure that your projectId & flowId are correct'
						);
					o(this, di, 'm', Li).call(this),
						yield o(this, di, 'm', _i).call(this),
						yield o(this, di, 'm', Ti).call(this),
						o(this, di, 'm', Di).call(this);
					const {
						executionId: e,
						stepId: t,
						token: n,
						code: r,
						exchangeError: s,
						redirectAuthCallbackUrl: a,
						redirectAuthBackupCallbackUri: l,
						redirectAuthCodeChallenge: c,
						redirectAuthInitiator: d,
						oidcIdpStateId: u,
						samlIdpStateId: h,
						samlIdpUsername: p,
						descopeIdpInitiated: g,
						ssoAppId: f,
						oidcLoginHint: v,
						oidcPrompt: m
					} = Wo();
					window.addEventListener('popstate', o(this, vi, 'f').popstate),
						window.addEventListener(
							'components-context',
							o(this, vi, 'f').componentsContext
						),
						window.addEventListener(
							'visibilitychange',
							o(this, vi, 'f').visibilitychange
						),
						o(this, hi, 'f').subscribe(o(this, di, 'm', Ci).bind(this)),
						o(this, hi, 'f').update({
							projectId: this.projectId,
							flowId: this.flowId,
							baseUrl: this.baseUrl,
							tenant: this.tenant,
							redirectUrl: this.redirectUrl,
							locale: this.locale,
							stepId: t,
							executionId: e,
							token: n,
							code: r,
							exchangeError: s,
							redirectAuthCallbackUrl: a,
							redirectAuthBackupCallbackUri: l,
							redirectAuthCodeChallenge: c,
							redirectAuthInitiator: d,
							oidcIdpStateId: u,
							samlIdpStateId: h,
							samlIdpUsername: p,
							descopeIdpInitiated: g,
							ssoAppId: f,
							oidcLoginHint: v,
							oidcPrompt: m
						}),
						i(this, ui, !0, 'f');
				}
			});
		}
		disconnectedCallback() {
			o(this, hi, 'f').unsubscribeAll(),
				o(this, pi, 'f').unsubscribeAll(),
				o(this, di, 'm', Mi).call(this),
				window.removeEventListener('popstate', o(this, vi, 'f').popstate),
				window.removeEventListener(
					'visibilitychange',
					o(this, vi, 'f').visibilitychange
				),
				window.removeEventListener(
					'components-context',
					o(this, vi, 'f').componentsContext
				);
		}
		attributeChangedCallback(e, t, n) {
			if (
				this.shadowRoot.isConnected &&
				o(this, ui, 'f') &&
				t !== n &&
				mr.observedAttributes.includes(e)
			) {
				o(this, di, 'm', Ii).call(this);
				const i = null === t;
				o(this, hi, 'f').update(({ stepId: t, executionId: o }) => {
					let r = t,
						s = o;
					return (
						i || ((s = null), (r = null), Mo()),
						{ [qo(e)]: n, stepId: r, executionId: s }
					);
				}),
					o(this, pi, 'f').update({ isDebug: this.debug }),
					'theme' === e && o(this, di, 'm', $i).call(this);
			}
		}
	}
	(ui = new WeakMap()),
		(hi = new WeakMap()),
		(pi = new WeakMap()),
		(gi = new WeakMap()),
		(fi = new WeakMap()),
		(vi = new WeakMap()),
		(mi = new WeakMap()),
		(xi = new WeakMap()),
		(Ei = new WeakMap()),
		(di = new WeakSet()),
		(bi = function () {
			this.attachShadow({ mode: 'open' }),
				this.shadowRoot.appendChild(li.content.cloneNode(!0)),
				(this.rootElement = this.shadowRoot.querySelector('#wc-root'));
		}),
		(wi = function () {
			return (
				!this.shadowRoot.host.closest('form') &&
				/Chrome/.test(navigator.userAgent) &&
				/Google Inc/.test(navigator.vendor)
			);
		}),
		(yi = function () {
			const e = this.shadowRoot.host,
				t = document.createElement('form');
			(t.style.width = '100%'),
				(t.style.height = '100%'),
				e.parentElement.appendChild(t),
				t.appendChild(e);
		}),
		(Ii = function () {
			const e = [
				'base-url',
				'tenant',
				'theme',
				'locale',
				'debug',
				'redirect-url',
				'auto-focus',
				'store-last-authenticated-user',
				'keep-last-authenticated-user-after-logout',
				'preview',
				'storage-prefix',
				'form',
				'client',
				'validate-on-blur'
			];
			if (
				(mr.observedAttributes.forEach((t) => {
					if (!e.includes(t) && !this[qo(t)])
						throw Error(`${t} cannot be empty`);
				}),
				this.theme && 'light' !== this.theme && 'dark' !== this.theme)
			)
				throw Error(
					'Supported theme values are "light", "dark", or leave empty for using the OS theme'
				);
		}),
		(ki = function () {
			const { stepId: e, executionId: t } = $o();
			o(this, hi, 'f').update({ stepId: e, executionId: t });
		}),
		(ji = function () {
			document.hidden ||
				setTimeout(() => {
					o(this, hi, 'f').update({ deferredRedirect: !1 });
				}, 300);
		}),
		(Oi = function (e, t) {
			(this.sdk = Xn(
				Object.assign(
					Object.assign(
						{
							persistTokens: !0,
							preview: this.preview,
							storagePrefix: this.storagePrefix,
							storeLastAuthenticatedUser: this.storeLastAuthenticatedUser,
							keepLastAuthenticatedUserAfterLogout:
								this.keepLastAuthenticatedUserAfterLogout
						},
						mr.sdkConfigOverrides
					),
					{ projectId: e, baseUrl: t }
				)
			)),
				['start', 'next'].forEach((e) => {
					const t = this.sdk.flow[e];
					this.sdk.flow[e] = (...e) =>
						n(this, void 0, void 0, function* () {
							this.nextRequestStatus.update({ isLoading: !0 });
							try {
								return yield t(...e);
							} finally {
								this.nextRequestStatus.update({ isLoading: !1 });
							}
						});
				});
		}),
		(Ci = function (e, t, i) {
			return n(this, void 0, void 0, function* () {
				const { projectId: t, baseUrl: n } = e;
				if (i('projectId') || i('baseUrl')) {
					if (!t) return;
					o(this, di, 'm', Oi).call(this, t, n);
				}
				o(this, mi, 'f').call(this, e);
			});
		}),
		(Ai = function () {
			return n(this, void 0, void 0, function* () {
				return (
					(yield o(this, xi, 'f').call(this)).isMissingConfig &&
					(yield o(this, di, 'm', Si).call(this))
				);
			});
		}),
		(Si = function () {
			return n(this, void 0, void 0, function* () {
				const e = Ro({
					projectId: this.projectId,
					filename: eo,
					assetsFolder: 'v2-alpha',
					baseUrl: this.baseStaticUrl
				});
				try {
					return yield To(e, 'json'), !0;
				} catch (e) {
					return !1;
				}
			});
		}),
		(Ui = function () {
			return n(this, void 0, void 0, function* () {
				const e = Ro({
					projectId: this.projectId,
					filename: 'theme.json',
					baseUrl: this.baseStaticUrl
				});
				try {
					const { body: t } = yield To(e, 'json');
					return t;
				} catch (e) {
					return void this.loggerWrapper.error(
						'Cannot fetch theme file',
						'make sure that your projectId & flowId are correct'
					);
				}
			});
		}),
		(Li = function () {
			var e, t;
			return n(this, void 0, void 0, function* () {
				const { projectConfig: n } = yield o(this, xi, 'f').call(this),
					i =
						null ===
							(t =
								null === (e = null == n ? void 0 : n.cssTemplate) ||
								void 0 === e
									? void 0
									: e[this.theme]) || void 0 === t
							? void 0
							: t.fonts;
				i &&
					Object.values(i).forEach((e) =>
						((e) => {
							if (!e) return;
							const t = document.createElement('link');
							(t.href = e),
								(t.rel = 'stylesheet'),
								document.head.appendChild(t);
						})(e.url)
					);
			});
		}),
		(Ti = function () {
			return n(this, void 0, void 0, function* () {
				yield o(this, di, 'm', Ri).call(this),
					yield o(this, di, 'm', $i).call(this);
			});
		}),
		(Ri = function () {
			var e, t, i, r;
			return n(this, void 0, void 0, function* () {
				const n = document.createElement('style'),
					s = yield o(this, Ei, 'f');
				n.innerText =
					((null === (e = null == s ? void 0 : s.light) || void 0 === e
						? void 0
						: e.globals) || '') +
					((null === (t = null == s ? void 0 : s.dark) || void 0 === t
						? void 0
						: t.globals) || '');
				const a = yield mr.descopeUI;
				(null == a ? void 0 : a.componentsThemeManager) &&
					!a.componentsThemeManager.hasThemes &&
					(a.componentsThemeManager.themes = {
						light:
							null === (i = null == s ? void 0 : s.light) || void 0 === i
								? void 0
								: i.components,
						dark:
							null === (r = null == s ? void 0 : s.dark) || void 0 === r
								? void 0
								: r.components
					}),
					this.shadowRoot.appendChild(n);
			});
		}),
		(Pi = function (e) {
			i(
				this,
				gi,
				Object.assign(Object.assign({}, o(this, gi, 'f')), e.detail),
				'f'
			);
		}),
		($i = function () {
			return n(this, void 0, void 0, function* () {
				this.rootElement.setAttribute('data-theme', this.theme);
				const e = yield mr.descopeUI;
				(null == e ? void 0 : e.componentsThemeManager) &&
					(e.componentsThemeManager.currentThemeName = this.theme);
			});
		}),
		(Mi = function () {
			var e;
			null === (e = o(this, fi, 'f')) || void 0 === e || e.remove(),
				i(this, fi, null, 'f');
		}),
		(qi = function ({ isDebug: e }) {
			return n(this, void 0, void 0, function* () {
				e
					? (i(this, fi, document.createElement('descope-debugger'), 'f'),
						Object.assign(o(this, fi, 'f').style, {
							position: 'fixed',
							top: '0',
							right: '0',
							height: '100vh',
							width: '100vw',
							pointerEvents: 'none',
							zIndex: 99999
						}),
						yield Promise.resolve().then(function () {
							return Ir;
						}),
						document.body.appendChild(o(this, fi, 'f')))
					: o(this, di, 'm', Mi).call(this);
			});
		}),
		(Wi = function (e, t) {
			var n;
			e &&
				this.debug &&
				(null === (n = o(this, fi, 'f')) ||
					void 0 === n ||
					n.updateData({ title: e, description: t }));
		}),
		(Di = function () {
			this.rootElement.onkeydown = (e) => {
				var t, n, o;
				const i = !!(null === (t = this.shadowRoot.activeElement) ||
					void 0 === t
						? void 0
						: t.getAttribute('href')),
					r = xo.includes(
						null !==
							(o =
								null === (n = this.shadowRoot.activeElement) || void 0 === n
									? void 0
									: n.localName) && void 0 !== o
							? o
							: ''
					);
				if ('Enter' !== e.key || i || r) return;
				e.preventDefault();
				const s = this.rootElement.querySelectorAll('descope-button');
				if (1 === s.length && 'false' !== s[0].getAttribute('auto-submit'))
					return void s[0].click();
				const a = Array.from(s).filter(
					(e) => 'true' === e.getAttribute('auto-submit')
				);
				if (1 === a.length) return void a[0].click();
				const l = Array.from(s).filter(
					(e) => 'button' === e.getAttribute('data-type')
				);
				if (1 === l.length)
					'false' !== l[0].getAttribute('auto-submit') && l[0].click();
				else if (0 === l.length) {
					const e = Array.from(s).filter(
						(e) => 'sso' === e.getAttribute('data-type')
					);
					1 === e.length &&
						'false' !== e[0].getAttribute('auto-submit') &&
						e[0].click();
				}
			};
		}),
		(Ni = function () {
			var e, t;
			return n(this, void 0, void 0, function* () {
				const n =
					null ===
						(t =
							null === (e = yield o(this, xi, 'f').call(this)) || void 0 === e
								? void 0
								: e.projectConfig) || void 0 === t
						? void 0
						: t.componentsVersion;
				return (
					n ||
					(this.logger.error(
						'Did not get components version, using latest version'
					),
					'latest')
				);
			});
		}),
		(_i = function () {
			return n(this, void 0, void 0, function* () {
				mr.descopeUI
					? this.loggerWrapper.debug(
							'DescopeUI is already loading, probably multiple flows are running on the same page'
						)
					: (mr.descopeUI = new Promise((e) => {
							if (globalThis.DescopeUI) return void e(globalThis.DescopeUI);
							const t = (e) => {
									const t = document.createElement('script');
									return (t.id = 'load-descope-ui'), (t.src = e), t;
								},
								i = (e, t) => e.replace('<version>', t),
								r = (t, n) => {
									const o = () => {
										this.loggerWrapper.error(
											'Cannot load DescopeUI',
											`Make sure this URL is valid and return the correct script: "${t.src}"`
										),
											n();
									};
									t.addEventListener('load', () => {
										globalThis.DescopeUI || o(), e(globalThis.DescopeUI);
									}),
										t.addEventListener('error', o);
								};
							(() => {
								n(this, void 0, void 0, function* () {
									const n = yield o(this, di, 'm', Ni).call(this),
										s = t(i(no, n));
									r(s, () => {
										s.remove(),
											this.loggerWrapper.info(
												'Trying to load DescopeUI from a fallback URL'
											);
										const o = t(i(oo, n));
										r(o, () => {
											e(void 0);
										}),
											document.body.append(o);
									}),
										document.body.append(s);
								});
							})();
						}));
			});
		}),
		(mr.sdkConfigOverrides = {
			baseHeaders: {
				'x-descope-sdk-name': 'web-component',
				'x-descope-sdk-version': '3.19.6'
			}
		});
	class br extends mr {
		static set sdkConfigOverrides(e) {
			mr.sdkConfigOverrides = e;
		}
		constructor() {
			const e = new Go({ deferredRedirect: !1 });
			super(e.update.bind(e)),
				Fi.add(this),
				(this.stepState = new Go({}, { updateOnlyOnChange: !1 })),
				Ki.set(this, void 0),
				Hi.set(this, null),
				Ji.set(this, (e, t, r, s, a) => {
					r === ko &&
						i(
							this,
							Ki,
							setTimeout(
								() =>
									n(this, void 0, void 0, function* () {
										var n;
										let i;
										console.log('calling next from polling');
										try {
											i = yield this.sdk.flow.next(e, t, So, s, a, {});
										} catch (n) {
											o(this, Ji, 'f').call(this, e, t, r, s, a);
										}
										o(this, zi, 'f').call(this, i);
										const { action: l } =
											null !== (n = null == i ? void 0 : i.data) && void 0 !== n
												? n
												: {};
										o(this, Ji, 'f').call(this, e, t, l, s, a);
									}),
								2e3
							),
							'f'
						);
				}),
				Vi.set(this, () => {
					clearTimeout(o(this, Ki, 'f')), i(this, Ki, null, 'f');
				}),
				zi.set(this, (e) => {
					var t, n, i, r, s, a, l, c, d, u, h;
					if (!(null == e ? void 0 : e.ok)) {
						o(this, Fi, 'm', sr).call(
							this,
							'error',
							null == e ? void 0 : e.error
						);
						const a =
								null === (t = null == e ? void 0 : e.response) || void 0 === t
									? void 0
									: t.url,
							l = `${null === (n = null == e ? void 0 : e.response) || void 0 === n ? void 0 : n.status} - ${null === (i = null == e ? void 0 : e.response) || void 0 === i ? void 0 : i.statusText}`;
						return void this.loggerWrapper.error(
							(null === (r = null == e ? void 0 : e.error) || void 0 === r
								? void 0
								: r.errorDescription) || a,
							(null === (s = null == e ? void 0 : e.error) || void 0 === s
								? void 0
								: s.errorMessage) || l
						);
					}
					null ===
						(l =
							null === (a = e.data) || void 0 === a ? void 0 : a.runnerLogs) ||
						void 0 === l ||
						l.forEach((e) => {
							const { level: t, title: n, log: o } = e;
							t && this.loggerWrapper[t]
								? this.loggerWrapper[t](n, o)
								: this.loggerWrapper.info(n, o);
						});
					const p =
						null ===
							(u =
								null ===
									(d =
										null === (c = e.data) || void 0 === c
											? void 0
											: c.screen) || void 0 === d
									? void 0
									: d.state) || void 0 === u
							? void 0
							: u.errorText;
					(null === (h = e.data) || void 0 === h ? void 0 : h.error)
						? this.loggerWrapper.error(
								`[${e.data.error.code}]: ${e.data.error.description}`,
								`${p ? `${p} - ` : ''}${e.data.error.message}`
							)
						: p && this.loggerWrapper.error(p);
					const { status: g, authInfo: f, lastAuth: v } = e.data;
					if ('completed' === g)
						return (
							this.storeLastAuthenticatedUser &&
								(function (e) {
									(null == e ? void 0 : e.authMethod) &&
										Yn &&
										localStorage.setItem(ho, JSON.stringify(e));
								})(v),
							void o(this, Fi, 'm', sr).call(this, 'success', f)
						);
					const {
						executionId: m,
						stepId: b,
						stepName: w,
						action: y,
						screen: I,
						redirect: k,
						openInNewTabUrl: j,
						webauthn: O,
						error: C,
						samlIdpResponse: A
					} = e.data;
					y !== ko
						? (this.loggerWrapper.info(`Step "${w || `#${b}`}" is ${g}`, '', {
								screen: I,
								status: g,
								stepId: b,
								stepName: w,
								action: y,
								error: C
							}),
							this.flowState.update({
								stepId: b,
								executionId: m,
								action: y,
								redirectTo: null == k ? void 0 : k.url,
								openInNewTabUrl: j,
								screenId: null == I ? void 0 : I.id,
								screenState: null == I ? void 0 : I.state,
								webauthnTransactionId: null == O ? void 0 : O.transactionId,
								webauthnOptions: null == O ? void 0 : O.options,
								samlIdpResponseUrl: null == A ? void 0 : A.url,
								samlIdpResponseSamlResponse:
									null == A ? void 0 : A.samlResponse,
								samlIdpResponseRelayState: null == A ? void 0 : A.relayState
							}))
						: this.flowState.update({ action: y });
				}),
				Bi.set(
					this,
					Do(() =>
						n(this, void 0, void 0, function* () {
							var e;
							try {
								const t = yield this.sdk.webauthn.signIn.start(
									'',
									window.location.origin
								);
								return (
									t.ok ||
										this.loggerWrapper.warn(
											'Webauthn start failed',
											null === (e = null == t ? void 0 : t.error) ||
												void 0 === e
												? void 0
												: e.errorMessage
										),
									t.data
								);
							} catch (e) {
								this.loggerWrapper.warn('Webauthn start failed', e.message);
							}
						})
					)
				),
				nr.set(
					this,
					Ko((e, t) =>
						n(this, void 0, void 0, function* () {
							if (
								'true' === e.getAttribute('formnovalidate') ||
								o(this, Fi, 'm', Yi).call(this)
							) {
								const i = null == e ? void 0 : e.getAttribute('id');
								o(this, Fi, 'm', er).call(this, e);
								const r = yield o(this, Fi, 'm', Qi).call(this),
									s =
										((n = e),
										Array.from(
											(null == n ? void 0 : n.attributes) || []
										).reduce((e, t) => {
											var n;
											const o =
												null ===
													(n = new RegExp('^data-descope-(\\S+)$').exec(
														t.name
													)) || void 0 === n
													? void 0
													: n[1];
											return o ? Object.assign(e, { [o]: t.value }) : e;
										}, {})),
									a = this.getComponentsContext(),
									l = Object.assign(
										Object.assign(Object.assign(Object.assign({}, a), s), r),
										{ origin: window.location.origin }
									),
									c = yield this.getFlowConfig(),
									d = yield this.getProjectConfig(),
									u = yield t(i, c.version, d.componentsVersion, l);
								o(this, zi, 'f').call(this, u),
									o(this, Fi, 'm', tr).call(this, r);
							}
							var n;
						})
					)
				),
				(this.flowState = e);
		}
		connectedCallback() {
			const e = Object.create(null, {
				connectedCallback: { get: () => super.connectedCallback }
			});
			var t, o;
			return n(this, void 0, void 0, function* () {
				this.shadowRoot.isConnected &&
					(null === (t = this.flowState) ||
						void 0 === t ||
						t.subscribe(this.onFlowChange.bind(this)),
					null === (o = this.stepState) ||
						void 0 === o ||
						o.subscribe(this.onStepChange.bind(this))),
					yield e.connectedCallback.call(this);
			});
		}
		disconnectedCallback() {
			var e;
			super.disconnectedCallback(),
				this.flowState.unsubscribeAll(),
				this.stepState.unsubscribeAll(),
				null === (e = o(this, Hi, 'f')) || void 0 === e || e.abort(),
				i(this, Hi, null, 'f');
		}
		getHtmlFilenameWithLocale(e, t) {
			return n(this, void 0, void 0, function* () {
				let n;
				const o = Ho(e);
				return (
					(yield this.getTargetLocales()).includes(o) && (n = `${t}-${o}.html`),
					n
				);
			});
		}
		getPageContent(e, t) {
			return n(this, void 0, void 0, function* () {
				if (t)
					try {
						const { body: e } = yield To(t, 'text');
						return e;
					} catch (n) {
						this.loggerWrapper.error(
							`Failed to fetch flow page from ${t}. Fallback to url ${e}`,
							n
						);
					}
				try {
					const { body: t } = yield To(e, 'text');
					return t;
				} catch (e) {
					this.loggerWrapper.error('Failed to fetch flow page', e.message);
				}
				return null;
			});
		}
		onFlowChange(e, t, r) {
			var s, a;
			return n(this, void 0, void 0, function* () {
				const {
					projectId: n,
					flowId: l,
					tenant: c,
					stepId: d,
					executionId: u,
					action: h,
					screenId: p,
					screenState: g,
					redirectTo: f,
					openInNewTabUrl: v,
					redirectUrl: m,
					token: b,
					code: w,
					exchangeError: y,
					webauthnTransactionId: I,
					webauthnOptions: k,
					redirectAuthCodeChallenge: j,
					redirectAuthCallbackUrl: O,
					redirectAuthBackupCallbackUri: C,
					redirectAuthInitiator: A,
					oidcIdpStateId: S,
					locale: x,
					samlIdpStateId: U,
					samlIdpUsername: E,
					descopeIdpInitiated: L,
					samlIdpResponseUrl: T,
					samlIdpResponseSamlResponse: R,
					samlIdpResponseRelayState: P,
					ssoAppId: $,
					oidcLoginHint: M,
					oidcPrompt: q
				} = e;
				let W, D;
				const N = (() => {
						const e = localStorage.getItem(ai);
						if (!e) {
							const e = Math.floor(100 * Math.random() + 1);
							return localStorage.setItem(ai, e.toString()), e;
						}
						return Number(e);
					})(),
					_ = this.sdk.getLastUserLoginId(),
					F = yield this.getFlowConfig(),
					K = yield this.getProjectConfig(),
					H =
						O && j
							? { callbackUrl: O, codeChallenge: j, backupCallbackUri: C }
							: void 0;
				if (
					!u &&
					(F.fingerprintEnabled && F.fingerprintKey
						? yield En(F.fingerprintKey, this.baseUrl)
						: localStorage.removeItem(xn),
					F.conditions
						? ({ startScreenId: W, conditionInteractionId: D } = ((e, t) => {
								const n =
									null == t
										? void 0
										: t.find(({ key: t, operator: n, predicate: o }) => {
												var i;
												if ('ELSE' === t) return !0;
												const r =
													null === (i = ri[t]) || void 0 === i ? void 0 : i[n];
												return !!(null == r ? void 0 : r(e, o));
											});
								return n
									? {
											startScreenId: n.met.screenId,
											conditionInteractionId: n.met.interactionId
										}
									: {};
							})(
								{ loginId: _, code: w, token: b, abTestingKey: N },
								F.conditions
							))
						: F.condition
							? ({ startScreenId: W, conditionInteractionId: D } = ((e, t) => {
									var n;
									const o =
										null === (n = ri[null == e ? void 0 : e.key]) ||
										void 0 === n
											? void 0
											: n[e.operator];
									if (!o) return {};
									const i = o(t, e.predicate) ? e.met : e.unmet;
									return {
										startScreenId: null == i ? void 0 : i.screenId,
										conditionInteractionId: null == i ? void 0 : i.interactionId
									};
								})(F.condition, {
									loginId: _,
									code: w,
									token: b,
									abTestingKey: N
								}))
							: (W = F.startScreenId),
					!No(W, S, U, E, $, M, q))
				) {
					const e = yield this.sdk.flow.start(
						l,
						Object.assign(
							Object.assign(
								{
									tenant: c,
									redirectAuth: H,
									oidcIdpStateId: S,
									samlIdpStateId: U,
									samlIdpUsername: E,
									ssoAppId: $,
									oidcLoginHint: M,
									oidcPrompt: q,
									client: this.client
								},
								m && { redirectUrl: m }
							),
							{ lastAuth: si(_), abTestingKey: N, locale: Ho(x) }
						),
						D,
						'',
						F.version,
						K.componentsVersion,
						Object.assign(
							Object.assign(
								Object.assign(
									Object.assign(
										Object.assign({}, this.formConfigValues),
										w ? { exchangeCode: w, idpInitiated: !0 } : {}
									),
									L && { idpInitiated: !0 }
								),
								b ? { token: b } : {}
							),
							M ? { externalId: M } : {}
						)
					);
					return (
						o(this, zi, 'f').call(this, e),
						void (
							'completed' !==
								(null === (s = null == e ? void 0 : e.data) || void 0 === s
									? void 0
									: s.status) &&
							this.flowState.update({ code: void 0, token: void 0 })
						)
					);
				}
				if (
					u &&
					((r('token') && b) || (r('code') && w) || (r('exchangeError') && y))
				) {
					const e = yield this.sdk.flow.next(
						u,
						d,
						Ao,
						F.version,
						K.componentsVersion,
						{ token: b, exchangeCode: w, exchangeError: y }
					);
					return (
						o(this, zi, 'f').call(this, e),
						void this.flowState.update({
							token: void 0,
							code: void 0,
							exchangeError: void 0
						})
					);
				}
				if (
					h === Co &&
					[
						'samlIdpResponseUrl',
						'samlIdpResponseSamlResponse',
						'samlIdpResponseRelayState'
					].some((e) => r(e))
				) {
					if (!T || !R)
						return void this.loggerWrapper.error(
							'Did not get saml idp params data to load'
						);
					((e, t, n, o) => {
						const i = document.createElement('form');
						(i.method = 'POST'),
							(i.action = e),
							(i.innerHTML = `\n  <input type="hidden" role="saml-response" name="SAMLResponse" value="${t}" />\n  <input type="hidden" role="saml-relay-state" name="RelayState" value="${n}" />\n  <input style="display: none;" id="SAMLSubmitButton" type="submit" value="Continue" />\n  `),
							document.body.appendChild(i),
							o(i);
					})(T, R, P || '', _o);
				}
				if (h === Io && (r('redirectTo') || r('deferredRedirect')))
					return f
						? 'android' === A && document.hidden
							? void this.flowState.update({ deferredRedirect: !0 })
							: void window.location.assign(f)
						: void this.loggerWrapper.error('Did not get redirect url');
				if (h === jo || h === Oo) {
					if (!I || !k)
						return void this.loggerWrapper.error(
							'Did not get webauthn transaction id or options'
						);
					let e, t;
					null === (a = o(this, Hi, 'f')) || void 0 === a || a.abort(),
						i(this, Hi, null, 'f');
					try {
						e =
							h === jo
								? yield this.sdk.webauthn.helpers.create(k)
								: yield this.sdk.webauthn.helpers.get(k);
					} catch (e) {
						'InvalidStateError' === e.name
							? this.loggerWrapper.warn('WebAuthn operation failed', e.message)
							: 'NotAllowedError' !== e.name &&
								this.loggerWrapper.error(e.message),
							(t = e.name);
					}
					const n = yield this.sdk.flow.next(
						u,
						d,
						Ao,
						F.version,
						K.componentsVersion,
						{ transactionId: I, response: e, failure: t }
					);
					o(this, zi, 'f').call(this, n);
				}
				if (
					(o(this, Ji, 'f').call(this, u, d, h, F.version, K.componentsVersion),
					!p && !W)
				)
					return void this.loggerWrapper.warn('No screen was found to show');
				const J = W || p,
					V = yield this.getHtmlFilenameWithLocale(x, J),
					z = {
						direction: Po(d, t.stepId),
						screenState: Object.assign(Object.assign({}, g), {
							form: Object.assign(
								Object.assign({}, this.formConfigValues),
								null == g ? void 0 : g.form
							),
							lastAuth: {
								loginId: _,
								name: this.sdk.getLastUserDisplayName() || _
							}
						}),
						htmlUrl: Ro({
							projectId: n,
							filename: `${J}.html`,
							baseUrl: this.baseStaticUrl
						}),
						htmlLocaleUrl:
							V &&
							Ro({ projectId: n, filename: V, baseUrl: this.baseStaticUrl }),
						samlIdpUsername: E,
						oidcLoginHint: M,
						oidcPrompt: q,
						openInNewTabUrl: v
					},
					B = si(_);
				No(W, S, U, E, $, M, q)
					? (z.next = (e, t, n, o) =>
							this.sdk.flow.start(
								l,
								Object.assign(
									Object.assign(
										{
											tenant: c,
											redirectAuth: H,
											oidcIdpStateId: S,
											samlIdpStateId: U,
											samlIdpUsername: E,
											ssoAppId: $,
											oidcLoginHint: M,
											lastAuth: B,
											preview: this.preview,
											abTestingKey: N,
											client: this.client
										},
										m && { redirectUrl: m }
									),
									{ locale: Ho(x), oidcPrompt: q }
								),
								D,
								e,
								t,
								n,
								Object.assign(
									Object.assign(
										Object.assign(
											Object.assign(
												Object.assign({}, this.formConfigValues),
												o
											),
											w && { exchangeCode: w, idpInitiated: !0 }
										),
										L && { idpInitiated: !0 }
									),
									b && { token: b }
								)
							))
					: (r('projectId') ||
							r('baseUrl') ||
							r('executionId') ||
							r('stepId')) &&
						(z.next = (...e) => this.sdk.flow.next(u, d, ...e)),
					this.stepState.update(z);
			});
		}
		loadDescopeUiComponents(e) {
			return n(this, void 0, void 0, function* () {
				const t = yield mr.descopeUI;
				if (!t) return;
				const o = ((e) => [
					...Array.from(e.querySelectorAll('*')).reduce(
						(e, t) =>
							t.tagName.startsWith('DESCOPE-')
								? e.add(t.tagName.toLocaleLowerCase())
								: e,
						new Set()
					)
				])(e);
				yield Promise.all(
					o.map((e) =>
						n(this, void 0, void 0, function* () {
							if (!!!customElements.get(e))
								if (t[e])
									try {
										return yield t[e]();
									} catch (t) {
										if ('NotSupportedError' !== t.name) throw t;
										console.debug(`${e} is already registered`);
									}
								else
									this.loggerWrapper.error(
										`Cannot load UI component "${e}"`,
										`Descope UI does not have a component named "${e}", available components are: "${Object.keys(t).join(', ')}"`
									);
						})
					)
				);
			});
		}
		onStepChange(e, t) {
			var i, r;
			return n(this, void 0, void 0, function* () {
				const {
						htmlUrl: s,
						htmlLocaleUrl: a,
						direction: l,
						next: c,
						screenState: d,
						openInNewTabUrl: u
					} = e,
					h = document.createElement('template');
				h.innerHTML = yield this.getPageContent(s, a);
				const p = h.content.cloneNode(!0),
					g = this.loadDescopeUiComponents(h.content);
				this.sdk.webauthn.helpers.isSupported()
					? yield o(this, Fi, 'm', Xi).call(this, p, c)
					: p
							.querySelectorAll(`descope-button[${yo}="biometrics"]`)
							.forEach((e) => e.setAttribute('disabled', 'true')),
					!e.samlIdpUsername ||
						(null === (i = d.form) || void 0 === i ? void 0 : i.loginId) ||
						(null === (r = d.form) || void 0 === r ? void 0 : r.email) ||
						(d.form || (d.form = {}),
						(d.form.loginId = e.samlIdpUsername),
						(d.form.email = e.samlIdpUsername)),
					ni(
						p,
						d,
						d.componentsConfig,
						this.formConfig,
						this.errorTransformer,
						this.loggerWrapper
					);
				const { geo: f } = yield this.getExecutionContext();
				((e, t) => {
					Array.from(
						e.querySelectorAll('descope-phone-field[default-code="autoDetect"]')
					).forEach((e) => {
						e.setAttribute('default-code', t);
					});
				})(p, f);
				const v = () =>
					n(this, void 0, void 0, function* () {
						var e, n;
						yield g;
						const i = this.shadowRoot.querySelector('div');
						var r, s;
						(r = i),
							(s =
								null === (e = null == d ? void 0 : d.totp) || void 0 === e
									? void 0
									: e.image),
							ti(r, 'descope-totp-image', s),
							((e, t) => {
								ti(e, 'descope-notp-image', t);
							})(
								i,
								null === (n = null == d ? void 0 : d.notp) || void 0 === n
									? void 0
									: n.image
							),
							this.rootElement.replaceChildren(p),
							setTimeout(() => {
								((e, t) => {
									Yo(e, null == t ? void 0 : t.inputs),
										Yo(e, null == t ? void 0 : t.form);
								})(this.rootElement, d);
								const e = this.rootElement.querySelectorAll(
										'descope-email-field'
									),
									t = this.rootElement.querySelectorAll('descope-password'),
									n = this.rootElement.querySelectorAll('descope-new-password');
								document
									.querySelectorAll('[data-hidden-input="true"]')
									.forEach((e) => e.remove()),
									[...e, ...t, ...n].forEach((e) =>
										o(this, Fi, 'm', Gi).call(this, e)
									);
							});
						const a = !t.htmlUrl;
						((e, t, n) => {
							if (!0 === t || ('skipFirstScreen' === t && !n)) {
								const t = e.querySelector('*[name]');
								setTimeout(() => {
									null == t || t.focus();
								});
							}
						})(this.rootElement, this.autoFocus, a),
							this.validateOnBlur &&
								((e) => {
									e.querySelectorAll('*[name]').forEach((e) => {
										e.addEventListener('blur', () => {
											var t;
											const n = e.focus;
											(e.focus = () => {}),
												null === (t = e.reportValidity) ||
													void 0 === t ||
													t.call(e),
												setTimeout(() => {
													e.focus = n;
												});
										});
									});
								})(this.rootElement),
							o(this, Fi, 'm', ir).call(this, c),
							a && o(this, Fi, 'm', sr).call(this, 'ready', {}),
							o(this, Fi, 'm', sr).call(this, 'page-updated', {});
						if (this.rootElement.querySelector(`[${yo}="polling"]`)) {
							const e = yield this.getFlowConfig(),
								t = yield this.getProjectConfig(),
								n = yield c(So, e.version, t.componentsVersion, {});
							o(this, zi, 'f').call(this, n);
						}
						u && !t.openInNewTabUrl && window.open(u, '_blank');
					});
				l ? o(this, Fi, 'm', rr).call(this, v, l) : v();
			});
		}
	}
	(Ki = new WeakMap()),
		(Hi = new WeakMap()),
		(Ji = new WeakMap()),
		(Vi = new WeakMap()),
		(zi = new WeakMap()),
		(Bi = new WeakMap()),
		(nr = new WeakMap()),
		(Fi = new WeakSet()),
		(Zi = function (e) {
			const t = e.getAttribute('name');
			if (!['email'].includes(t)) {
				const n = `user-${t}`;
				e.setAttribute('name', n),
					e.addEventListener('input', () => {
						e.setAttribute('name', e.value ? t : n);
					});
			}
		}),
		(Gi = function (e) {
			if (!e) return;
			if ('true' !== e.getAttribute('external-input')) return;
			e.querySelectorAll('input').forEach((t) => {
				const n = t.getAttribute('slot'),
					o = `input-${e.id}-${n}`,
					i = document.createElement('slot');
				i.setAttribute('name', o),
					i.setAttribute('slot', n),
					e.appendChild(i),
					t.setAttribute('slot', o),
					this.appendChild(t);
			});
		}),
		(Xi = function (e, t) {
			var r;
			return n(this, void 0, void 0, function* () {
				null === (r = o(this, Hi, 'f')) || void 0 === r || r.abort();
				const s = e.querySelector('*[autocomplete="webauthn"]');
				if (s && (yield oi())) {
					const { options: e, transactionId: r } =
						(yield o(this, Bi, 'f').call(this)) || {};
					if (e && r) {
						o(this, Fi, 'm', Zi).call(this, s),
							i(this, Hi, new AbortController(), 'f');
						const a = yield this.getFlowConfig(),
							l = yield this.getProjectConfig();
						this.sdk.webauthn.helpers
							.conditional(e, o(this, Hi, 'f'))
							.then((e) =>
								n(this, void 0, void 0, function* () {
									const n = yield t(s.id, a.version, l.componentsVersion, {
										transactionId: r,
										response: e
									});
									o(this, zi, 'f').call(this, n);
								})
							)
							.catch((e) => {
								'AbortError' !== e.name &&
									this.loggerWrapper.error(
										'Conditional login failed',
										e.message
									);
							});
					}
				}
			});
		}),
		(Yi = function () {
			let e = !0;
			return (
				Array.from(this.shadowRoot.querySelectorAll('*[name]'))
					.reverse()
					.forEach((t) => {
						var n, o;
						'slot' !== t.localName &&
							(null === (n = t.reportValidity) || void 0 === n || n.call(t),
							e &&
								(e =
									null === (o = t.checkValidity) || void 0 === o
										? void 0
										: o.call(t)));
					}),
				e
			);
		}),
		(Qi = function () {
			return n(this, void 0, void 0, function* () {
				const e = Array.from(
					this.shadowRoot.querySelectorAll(`*[name]:not([${uo}])`)
				);
				return (yield Promise.all(
					e.map((e) =>
						n(this, void 0, void 0, function* () {
							return { name: e.getAttribute('name'), value: e.value };
						})
					)
				)).reduce(
					(e, t) => Object.assign(Object.assign({}, e), { [t.name]: t.value }),
					{}
				);
			});
		}),
		(er = function (e) {
			const t = this.nextRequestStatus.subscribe(({ isLoading: n }) => {
				n
					? e.setAttribute('loading', 'true')
					: (this.nextRequestStatus.unsubscribe(t),
						e.removeAttribute('loading'));
			});
		}),
		(tr = function (e = {}) {
			var t, n;
			const o = Fo(e, ['externalId', 'email', 'phone']),
				i = Fo(e, ['newPassword', 'password']);
			if (o && i)
				try {
					if (!globalThis.PasswordCredential) return;
					const e = new globalThis.PasswordCredential({ id: o, password: i });
					null ===
						(n =
							null ===
								(t =
									null === navigator || void 0 === navigator
										? void 0
										: navigator.credentials) || void 0 === t
								? void 0
								: t.store) ||
						void 0 === n ||
						n.call(t, e);
				} catch (e) {
					this.loggerWrapper.error('Could not store credentials', e.message);
				}
		}),
		(or = function (e) {
			this.rootElement
				.querySelectorAll('descope-passcode[data-auto-submit="true"]')
				.forEach((t) => {
					t.addEventListener('input', () => {
						var n;
						(null === (n = t.checkValidity) || void 0 === n
							? void 0
							: n.call(t)) && o(this, nr, 'f').call(this, t, e);
					});
				});
		}),
		(ir = function (e) {
			this.rootElement
				.querySelectorAll('descope-button:not([data-exclude-next])')
				.forEach((t) => {
					t.onclick = () => {
						o(this, nr, 'f').call(this, t, e);
					};
				}),
				o(this, Fi, 'm', or).call(this, e);
		}),
		(rr = function (e, t) {
			this.rootElement.addEventListener(
				'transitionend',
				() => {
					this.rootElement.classList.remove('fade-out'), e();
				},
				{ once: !0 }
			);
			const n = t === Uo.forward ? 'slide-forward' : 'slide-backward';
			Array.from(
				this.rootElement.getElementsByClassName('input-container')
			).forEach((e, t) => {
				(e.style['transition-delay'] = 40 * t + 'ms'), e.classList.add(n);
			}),
				this.rootElement.classList.add('fade-out');
		}),
		(sr = function (e, t) {
			this.dispatchEvent(new CustomEvent(e, { detail: t }));
		}),
		customElements.get('descope-wc')
			? console.log('descope-wc is already defined')
			: customElements.define('descope-wc', br);
	const wr = document.createElement('template');
	wr.innerHTML = `\n<style>\n  .debugger {\n    width: 300px;\n    height: 200px;\n    background-color: #FAFAFA;\n    position: fixed;\n    font-family: "Helvetica Neue", sans-serif;\n    box-shadow: rgba(0, 0, 0, 0.1) 0px 5px 10px;\n    border-radius: 8px;\n    overflow: hidden;\n    border: 1px solid lightgrey;\n    pointer-events: initial;\n    display: flex;\n    flex-direction: column;\n    min-width: 200px;\n    max-width: 600px;\n    max-height: calc(100% - 64px);\n    min-height: 200px;\n    resize: both;\n  }\n\n  .header {\n    padding: 8px 16px;\n    display: flex;\n    align-items: center;\n    background-color: #EEEEEE;\n    cursor: move;\n    border-bottom: 1px solid #e0e0e0;\n  }\n\n  .content {\n    font-size: 14px;\n    flex-grow: 1;\n    overflow: auto;\n  }\n\n  .msg {\n    border-bottom: 1px solid lightgrey;\n    padding: 8px 16px;\n    display: flex;\n    gap: 5px;\n    background-color: #FAFAFA;\n  }\n\n  .msg.collapsible {\n    cursor: pointer;\n  }\n\n  .empty-state {\n    padding: 8px 16px;\n    background-color: #FAFAFA;\n  }\n\n\n  .msg.collapsible:not(.collapsed) {\n    background-color: #F5F5F5;\n  }\n\n  .msg_title {\n    padding-bottom: 5px;\n    display: flex;\n    gap: 8px;\n    font-weight: 500;\n  }\n\n  .msg svg {\n    padding: 1px;\n    flex-shrink: 0;\n    margin-top: -2px;\n  }\n\n  .msg_content {\n    overflow: hidden;\n    flex-grow: 1;\n    margin-right:5px;\n  }\n\n  .msg_desc {\n    color: #646464;\n    cursor: initial;\n    word-wrap: break-word;\n  }\n\n  .msg.collapsed .msg_desc {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n\n  .msg.collapsible.collapsed .chevron {\n    transform: rotate(-45deg) translateX(-2px);\n  }\n\n  .msg.collapsible .chevron {\n    content: "";\n    width:6px;\n    height:6px;\n    border-bottom: 2px solid grey;\n    border-right: 2px solid grey;\n    transform: rotate(45deg) translateX(-1px);\n    margin: 5px;\n    flex-shrink:0;\n  }\n</style>\n\n<div style="top:32px; left:${window.innerWidth - 300 - 32}px;" class="debugger">\n  <div class="header">\n    <span>Debugger messages</span>\n  </div>\n  <div class="content">\n    <div class="empty-state">\n      No errors detected 👀\n    </div>\n  </div>\n</div>\n`;
	class yr extends HTMLElement {
		constructor() {
			super(),
				ar.add(this),
				lr.set(this, new Go({ messages: [] })),
				cr.set(this, void 0),
				dr.set(this, void 0),
				ur.set(this, void 0),
				hr.set(this, { resize: o(this, ar, 'm', vr).bind(this) }),
				this.attachShadow({ mode: 'open' }),
				this.shadowRoot.appendChild(wr.content.cloneNode(!0)),
				i(this, cr, this.shadowRoot.querySelector('.debugger'), 'f'),
				i(this, dr, o(this, cr, 'f').querySelector('.content'), 'f'),
				i(this, ur, o(this, cr, 'f').querySelector('.header'), 'f');
		}
		updateData(e) {
			o(this, lr, 'f').update((t) => ({ messages: t.messages.concat(e) }));
		}
		connectedCallback() {
			var e;
			((e, t, n) => {
				let o = 0,
					i = 0,
					r = 0,
					s = 0;
				function a(t) {
					t.preventDefault(),
						(o = r - t.clientX),
						(i = s - t.clientY),
						(r = t.clientX),
						(s = t.clientY);
					const [a, l] = ii(e, e.offsetLeft - o, e.offsetTop - i, n);
					(e.style.top = `${l}px`), (e.style.left = `${a}px`);
				}
				function l() {
					(document.onmouseup = null), (document.onmousemove = null);
				}
				function c(e) {
					e.preventDefault(),
						(r = e.clientX),
						(s = e.clientY),
						(document.onmouseup = l),
						(document.onmousemove = a);
				}
				t ? (t.onmousedown = c) : (e.onmousedown = c);
			})(o(this, cr, 'f'), o(this, ur, 'f'), {
				top: 'all',
				bottom: 100,
				left: 100,
				right: 100
			}),
				window.addEventListener('resize', o(this, hr, 'f').resize),
				((e = o(this, cr, 'f')).onmousemove = (t) => {
					((t.target.w && t.target.w !== t.target.offsetWidth) ||
						(t.target.h && t.target.h !== t.target.offsetHeight)) &&
						e.onresize(t),
						(t.target.w = t.target.offsetWidth),
						(t.target.h = t.target.offsetHeight);
				}),
				(o(this, cr, 'f').onresize = o(this, ar, 'm', fr).bind(this)),
				o(this, lr, 'f').subscribe(o(this, ar, 'm', pr).bind(this));
		}
		disconnectedCallback() {
			o(this, lr, 'f').unsubscribeAll(),
				window.removeEventListener('resize', o(this, hr, 'f').resize);
		}
	}
	(lr = new WeakMap()),
		(cr = new WeakMap()),
		(dr = new WeakMap()),
		(ur = new WeakMap()),
		(hr = new WeakMap()),
		(ar = new WeakSet()),
		(pr = function (e) {
			o(this, ar, 'm', gr).call(this, e), o(this, ar, 'm', fr).call(this);
		}),
		(gr = function (e) {
			o(this, dr, 'f').innerHTML = e.messages
				.map(
					(e) =>
						`\n    <div class="msg">\n      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M5.99984 13.167L8.99984 10.167L11.9998 13.167L13.1665 12.0003L10.1665 9.00033L13.1665 6.00033L11.9998 4.83366L8.99984 7.83366L5.99984 4.83366L4.83317 6.00033L7.83317 9.00033L4.83317 12.0003L5.99984 13.167ZM8.99984 17.3337C7.84706 17.3337 6.76373 17.1148 5.74984 16.677C4.73595 16.2398 3.854 15.6462 3.104 14.8962C2.354 14.1462 1.76039 13.2642 1.32317 12.2503C0.885393 11.2364 0.666504 10.1531 0.666504 9.00033C0.666504 7.84755 0.885393 6.76421 1.32317 5.75033C1.76039 4.73644 2.354 3.85449 3.104 3.10449C3.854 2.35449 4.73595 1.7606 5.74984 1.32283C6.76373 0.885603 7.84706 0.666992 8.99984 0.666992C10.1526 0.666992 11.2359 0.885603 12.2498 1.32283C13.2637 1.7606 14.1457 2.35449 14.8957 3.10449C15.6457 3.85449 16.2393 4.73644 16.6765 5.75033C17.1143 6.76421 17.3332 7.84755 17.3332 9.00033C17.3332 10.1531 17.1143 11.2364 16.6765 12.2503C16.2393 13.2642 15.6457 14.1462 14.8957 14.8962C14.1457 15.6462 13.2637 16.2398 12.2498 16.677C11.2359 17.1148 10.1526 17.3337 8.99984 17.3337ZM8.99984 15.667C10.8609 15.667 12.4373 15.0212 13.729 13.7295C15.0207 12.4378 15.6665 10.8614 15.6665 9.00033C15.6665 7.13921 15.0207 5.56283 13.729 4.27116C12.4373 2.97949 10.8609 2.33366 8.99984 2.33366C7.13873 2.33366 5.56234 2.97949 4.27067 4.27116C2.979 5.56283 2.33317 7.13921 2.33317 9.00033C2.33317 10.8614 2.979 12.4378 4.27067 13.7295C5.56234 15.0212 7.13873 15.667 8.99984 15.667Z" fill="#ED404A"/>\n</svg>\n\n      <div class="msg_content">\n        <div class="msg_title">\n          ${e.title}\n        </div>\n        <div class="msg_desc">\n          ${e.description}\n        </div>\n      </div>\n      <div class="chevron"></div>\n    </div>\n  `
				)
				.join('');
		}),
		(fr = function () {
			o(this, dr, 'f')
				.querySelectorAll('.msg')
				.forEach((e) => {
					const t = e.querySelector('.msg_desc'),
						n = t.scrollWidth > t.clientWidth,
						o = t.clientHeight > 20;
					n || o
						? (e.classList.add('collapsible'),
							(e.onclick = (t) => {
								t.target.classList.contains('msg_desc') ||
									e.classList.toggle('collapsed');
							}))
						: (e.classList.remove('collapsible'), (e.onclick = null));
				});
		}),
		(vr = function () {
			const [e, t] = ii(
				o(this, cr, 'f'),
				Number.parseInt(o(this, cr, 'f').style.left, 10),
				Number.parseInt(o(this, cr, 'f').style.top, 10),
				{ top: 'all', bottom: 100, left: 100, right: 100 }
			);
			(o(this, cr, 'f').style.top = `${t}px`),
				(o(this, cr, 'f').style.left = `${e}px`);
		}),
		customElements.get('descope-debugger') ||
			customElements.define('descope-debugger', yr);
	var Ir = Object.freeze({ __proto__: null, default: yr });
})();
