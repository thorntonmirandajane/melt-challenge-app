import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { type EntryContext } from "react-router";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);

  // CRITICAL: Remove ALL frame-ancestors restrictions set by Shopify
  // This allows the app to be embedded in Shopify admin
  responseHeaders.delete("X-Frame-Options");

  // Get the current CSP and completely remove any frame-ancestors directive
  const csp = responseHeaders.get("Content-Security-Policy");
  if (csp) {
    // Remove frame-ancestors directive entirely from CSP
    let newCsp = csp.replace(/frame-ancestors[^;]*;?/g, "").trim();
    // Remove trailing semicolon if present
    newCsp = newCsp.replace(/;+$/, "");
    // Set the CSP without any frame-ancestors (allowing all frames)
    if (newCsp) {
      responseHeaders.set("Content-Security-Policy", newCsp);
    } else {
      responseHeaders.delete("Content-Security-Policy");
    }
  }

  // Also set Access-Control-Allow-Origin for CORS
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && (origin.includes(".myshopify.com") || origin.includes("trycloudflare.com"))) {
    responseHeaders.set("Access-Control-Allow-Origin", origin);
    responseHeaders.set("Access-Control-Allow-Credentials", "true");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
