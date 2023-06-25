import '../App.css';
import { useCopyToClipboard } from 'usehooks-ts'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';


const Error = () => {
    const [value, copy] = useCopyToClipboard()
    const exampleText = `https://descope-oidc.com/PROJECT_ID?flow=FLOW_ID&debug=true`;
    return (
      <div className="app-content">
        <h1 className="error-title">Something went wrong...</h1>
        <p className="text-body">
            Please make sure the URL is correctly formatted with a valid project id and flow id.
            For debugging purposes also debug=true can be used.
        </p>
        <h1 className="example-title">Here's an example: </h1>
        <p className='example' onClick={() => copy(exampleText)}>{exampleText} 
        {value ? 
        <CheckIcon className='copy-icon' /> 
        : 
        <ContentCopyIcon className='copy-icon'/>
        }
        </p>
      </div>
    );
}


export default Error

