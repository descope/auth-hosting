import '../App.css';

function Error() {
  const exampleText = `${window.location.protocol}://${window.location.host}?project=PROJECT_ID&flow=FLOW_ID&debug=true`;

  return (
    <div className="page error fullscreen">
      <h1 className="title">Hmmmmm</h1>
      <p>
        Please make sure the URL is correctly formatted with the right <span>project id</span> and <span>flow id</span>.
      </p>
      <p>Here's an example: </p>
      <p className="example">
        <a href={exampleText}>{exampleText}</a>
      </p>
    </div>
  );
}

export default Error;
