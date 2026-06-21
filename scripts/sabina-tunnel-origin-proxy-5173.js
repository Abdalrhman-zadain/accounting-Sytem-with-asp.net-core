const http = require("node:http");

const LISTEN_HOST = "::";
const LISTEN_PORT = 5173;
const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = 80;

const server = http.createServer((clientReq, clientRes) => {
  const proxyReq = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      method: clientReq.method,
      path: clientReq.url,
      headers: {
        ...clientReq.headers,
        host: clientReq.headers.host || "sabina.trusttechlimited.com",
      },
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );

  proxyReq.on("error", (error) => {
    clientRes.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    clientRes.end(`Bad gateway: ${error.message}`);
  });

  clientReq.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const proxyReq = http.request({
    host: TARGET_HOST,
    port: TARGET_PORT,
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      host: req.headers.host || "sabina.trusttechlimited.com",
    },
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n` +
        Object.entries(proxyRes.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\r\n") +
        "\r\n\r\n",
    );
    proxySocket.write(proxyHead);
    socket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(
    `sabina tunnel origin proxy listening on port ${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`,
  );
});
