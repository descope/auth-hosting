import './App.css';
import { useState } from 'react'
import { AuthProvider, Descope } from '@descope/react-sdk';
import Error from './components/Error';

const App = () => {
	const urlParams = new URLSearchParams(window.location.search);
	const projectId = urlParams.get('project') || '';
	const flowId = urlParams.get('flow') || 'sign-up-or-in';
	const debug = urlParams.get('debug') === 'true';
    const [error, setError] = useState(false)

	return (
		<div className='page authflow'>
			{projectId && flowId && !error? (
                <div className='flow-shown'>
                    <AuthProvider projectId={projectId}>
                        <Descope
                            flowId={flowId}
                            debug={debug}
                            onError={(e) => setError(true)}
                        />
                    </AuthProvider>
                </div>
			) : (
				<Error />
			)}
		</div>
	);
};

export default App;