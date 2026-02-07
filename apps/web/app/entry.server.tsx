import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { type HandleDocumentRequestFunction, ServerRouter } from "react-router";

const handleRequest: HandleDocumentRequestFunction = async (
  request,
  responseStatusCode,
  responseHeaders,
  routerContext
) => {
  const userAgent = request.headers.get("user-agent");
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  // If bot, wait for the entire stream to finish
  if (userAgent && isbot(userAgent)) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
};

export default handleRequest;
