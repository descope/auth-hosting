import '../App.css';

function Error() {
    const exampleText = "https://descope-oidc.com?projectId=PROJECT_ID&flow_id=FLOW_ID&demo=true"
  
    return (
      <div className='page error fullscreen'>
        <h1 className='title'>Hmmmmm</h1>
        <p>Please make sure the URL is correctly formatted with the right <span>project id</span> and <span>flow id</span>.</p>
        <p>Here's an example (for descope-oidc.com): </p>
        <p className='example'><a href={exampleText}>{exampleText}</a></p>
      </div>
    )
}


export default Error