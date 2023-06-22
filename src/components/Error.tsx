import '../App.css';
import { useCopyToClipboard } from 'usehooks-ts'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';


function Error() {
    const [value, copy] = useCopyToClipboard()
    const exampleText = `https://descope-oidc.com?project=PROJECT_ID&flow=FLOW_ID&debug=true`;
    
    return (
      <div className='page error fullscreen'>
        <h1 className='title error-title'>Hmmmmm</h1>
        <p>Why am I seeing this page?</p>
        <p className='error-txt'>Please make sure the URL is correctly formatted with a valid <span className='bold'>project id</span> and <span className='bold'>flow id</span>.</p>
        <p className='error-txt'>For debugging purposes also <span className='bold'>debug=true</span> can be used.</p>
        <p className='error-blue'>Here's an example: </p>
        <p className='example' onClick={() => copy(exampleText)}>{exampleText} 
          {value ? 
          <CheckIcon className='copy-icon' /> 
          : 
          <ContentCopyIcon className='copy-icon'/>
          }
         </p>
      </div>
    )
}


export default Error
