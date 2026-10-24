import './PanwLayout.css';
import React, { PropsWithChildren, useEffect } from 'react';

// Recreates the Palo Alto Networks hosted sign-in page from their Okta CIS
// custom sign-in page: black header, orange banner, sign-in card overlapping
// the banner, terms line and the dark footer. Enabled with ?layout=panw or
// DESCOPE_LAYOUT=panw.

const ASSETS_URL = 'https://marketplace-images-pan.s3.us-west-2.amazonaws.com';
const SITE_URL = 'https://www.paloaltonetworks.com';

const footerColumns = [
	{
		title: 'Company',
		links: [
			{ label: 'About Palo Alto Networks', href: `${SITE_URL}/company` },
			{ label: 'Careers', href: `${SITE_URL}/company/careers` }
		]
	},
	{
		title: 'Legal Notices',
		links: [
			{ label: 'Privacy', href: `${SITE_URL}/legal-notices/privacy` },
			{ label: 'Terms of Use', href: `${SITE_URL}/legal-notices/terms-of-use` }
		]
	},
	{
		title: 'Resources',
		links: [
			{
				label: 'Support',
				href: 'https://live.paloaltonetworks.com/t5/custom/page/page-id/Support'
			},
			{ label: 'Live Community', href: 'https://live.paloaltonetworks.com/' },
			{
				label: 'Email Subscription',
				href: `${SITE_URL}/company/subscriptions`
			},
			{ label: 'Beacon', href: 'https://beacon.exceedlms.com/student/catalog' }
		]
	}
];

const socialLinks = [
	{
		label: 'Facebook',
		href: 'https://www.facebook.com/PaloAltoNetworks/',
		width: 28,
		path: 'M27.7 27.4c0 .883-.674 1.6-1.505 1.6H1.938c-.83 0-1.504-.717-1.504-1.6V1.6c0-.884.673-1.6 1.504-1.6h24.257c.83 0 1.505.716 1.505 1.6v25.8zm-8.453-9.63V29h-4.25V17.77h-3.553v-4.377h3.554v-3.228c0-3.745 2.15-5.785 5.292-5.785 1.505 0 2.799.12 3.175.172v3.915h-2.179c-1.708 0-2.039.864-2.039 2.132v2.794h4.075l-.53 4.377h-3.545z'
	},
	{
		label: 'LinkedIn',
		href: 'https://www.linkedin.com/company/palo-alto-networks',
		width: 28,
		path: 'M25.778 0H2.54C1.427 0 .525.93.525 2.078V26.92C.525 28.07 1.428 29 2.54 29h23.238c1.113 0 2.013-.931 2.013-2.079V2.078C27.791.93 26.891 0 25.778 0zM8.792 24.275h-4.12V11.182h4.12v13.093zM6.705 9.393h.027c1.436 0 2.33-1.005 2.33-2.263-.028-1.283-.894-2.26-2.304-2.26-1.408 0-2.33.977-2.33 2.26 0 1.258.895 2.263 2.277 2.263zm16.937 14.882h-4.118V17.27c0-1.76-.597-2.962-2.086-2.962-1.14 0-1.816.81-2.113 1.593-.11.28-.137.67-.137 1.06v7.314H11.07s.054-11.865 0-13.093h4.118v1.856c.547-.892 1.524-2.165 3.71-2.165 2.712 0 4.744 1.87 4.744 5.894v7.508zM15.2 13.038c-.014.02-.028.042-.038.06h.038v-.06z'
	},
	{
		label: 'Twitter',
		href: 'https://twitter.com/PaloAltoNtwks',
		width: 28,
		path: 'M2.618 0a2 2 0 0 0-2 2v25a2 2 0 0 0 2 2h23.266a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2.618zm19.774 8.205a8.33 8.33 0 0 0 2.51-.732 9.22 9.22 0 0 1-2.18 2.407c.008.199.012.4.012.601 0 6.143-4.396 13.225-12.434 13.225-2.468 0-4.765-.77-6.7-2.089.342.044.69.066 1.042.066 2.048 0 3.933-.743 5.428-1.99-1.912-.038-3.526-1.382-4.082-3.228a4.15 4.15 0 0 0 1.973-.08c-1.999-.427-3.505-2.306-3.505-4.558v-.058c.59.348 1.263.557 1.98.581-1.173-.833-1.945-2.256-1.945-3.868 0-.853.216-1.65.592-2.337 2.156 2.812 5.376 4.662 9.008 4.857a4.949 4.949 0 0 1-.114-1.06c0-2.567 1.957-4.648 4.371-4.648 1.257 0 2.393.564 3.19 1.468a8.442 8.442 0 0 0 2.775-1.128 4.626 4.626 0 0 1-1.921 2.571z'
	},
	{
		label: 'YouTube',
		href: 'https://www.youtube.com/user/paloaltonetworks',
		width: 50,
		transform: 'translate(0.666504)',
		path: 'M32.5238 3.59839C32.1463 2.18871 31.0137 1.07581 29.5791 0.68629C26.9931 0 16.6111 0 16.6111 0C16.6111 0 6.22917 0 3.62424 0.68629C2.18965 1.05726 1.07595 2.17016 0.679545 3.59839C0 6.15806 0 11.5 0 11.5C0 11.5 0 16.8419 0.698422 19.4016C1.07595 20.8113 2.20852 21.9242 3.64312 22.3137C6.22917 23 16.6111 23 16.6111 23C16.6111 23 26.9931 23 29.598 22.3137C31.0326 21.9427 32.1463 20.8298 32.5427 19.4016C33.2222 16.8419 33.2222 11.5 33.2222 11.5C33.2222 11.5 33.2222 6.15806 32.5238 3.59839ZM13.2134 16.3597V6.64032L21.8965 11.5L13.2134 16.3597Z'
	}
];

const PanwLayout = ({ children }: PropsWithChildren) => {
	// The base app centers everything in a fixed 100vh box; this page scrolls.
	useEffect(() => {
		document.documentElement.classList.add('panw-layout');
		return () => document.documentElement.classList.remove('panw-layout');
	}, []);

	return (
		<div className="panw-wrapper" data-testid="panw-layout">
			<header className="panw-header">
				<a
					target="_blank"
					rel="noreferrer"
					href={`${SITE_URL}/`}
					className="panw-header-logo"
				>
					<img
						src={`${ASSETS_URL}/orangBlackLogo.png`}
						alt="Palo Alto Networks"
					/>
				</a>
			</header>
			<main className="panw-content">
				<div className="panw-banner">
					<img src={`${ASSETS_URL}/orange-backdrop-new3.png`} alt="" />
				</div>
				<div className="panw-card">{children}</div>
				<p className="panw-terms">
					By signing in, you agree to our{' '}
					<a
						target="_blank"
						rel="noreferrer"
						href={`${SITE_URL}/legal-notices/terms-of-use`}
					>
						Terms
					</a>{' '}
					and acknowledge our{' '}
					<a
						target="_blank"
						rel="noreferrer"
						href={`${SITE_URL}/legal-notices/privacy`}
					>
						Privacy Statement
					</a>
					.
				</p>
			</main>
			<footer className="panw-footer">
				<div className="panw-footer-row">
					<div className="panw-footer-col panw-footer-logo">
						<a target="_blank" rel="noreferrer" href={`${SITE_URL}/`}>
							<img
								src={`${ASSETS_URL}/orangBlackLogo.png`}
								alt="Palo Alto Networks"
							/>
						</a>
					</div>
					{footerColumns.map(({ title, links }) => (
						<div className="panw-footer-col" key={title}>
							<h3>{title}</h3>
							<ul>
								{links.map(({ label, href }) => (
									<li key={label}>
										<a href={href} rel="external">
											{label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
					<div className="panw-footer-col">
						<ul className="panw-footer-social">
							{socialLinks.map(({ label, href, width, path, transform }) => (
								<li key={label}>
									<a
										href={href}
										target="_blank"
										rel="noreferrer"
										aria-label={label}
									>
										<svg
											width={width}
											height="29"
											viewBox={`0 0 ${width} 29`}
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												fill="white"
												fillRule="evenodd"
												clipRule="evenodd"
												transform={transform}
												d={path}
											/>
										</svg>
									</a>
								</li>
							))}
						</ul>
					</div>
				</div>
				<div className="panw-footer-row panw-copyright">
					<span>
						&copy;{new Date().getFullYear()} Palo Alto Networks, Inc. All rights
						reserved.
					</span>
				</div>
			</footer>
		</div>
	);
};

export default PanwLayout;
