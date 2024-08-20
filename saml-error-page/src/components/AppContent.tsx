
import logo from "../assets/logo.svg";

const AppContent = () => {
	let error = 'An error occurred'

	try {
		const queryParam = new URLSearchParams(window.location.search)
		const error = queryParam.get('error') || 'An error occurred'
	} catch (e) {
		console.error(e)
	}

  return (
    <div className="app-content">
			<img
				src={logo}
				alt="logo"
				style={{
					marginBottom: "16px",
				}}
			/>
			<h2 className="header-label">Uh-oh, something went wrong</h2>
			<div style={{
					marginBottom: "96px",
				}}>
				<p
					className="text-body1"
					style={{
						marginTop: "32px",
					}}
				>
					{error}
				</p>
			</div>
    </div>
  );
};

export default AppContent;
