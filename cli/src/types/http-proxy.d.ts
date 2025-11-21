declare module "http-proxy" {
  import type { ServerResponse, IncomingMessage } from "http";
  import type { Socket } from "net";

  interface ProxyOptions {
    target: string;
    changeOrigin?: boolean;
    selfHandleResponse?: boolean;
    ws?: boolean;
  }

  interface ProxyServer {
    web(req: IncomingMessage, res: ServerResponse): void;
    ws(req: IncomingMessage, socket: Socket, head: Buffer): void;
    listen(port: number, cb?: (err?: Error) => void): void;
    close(callback?: () => void): void;
    on(event: "proxyRes", listener: (proxyRes: IncomingMessage, req: IncomingMessage, res: ServerResponse) => void): ProxyServer;
    on(event: "error", listener: (err: Error, req: IncomingMessage, res: ServerResponse) => void): ProxyServer;
    on(event: string, listener: (...args: unknown[]) => void): ProxyServer;
  }

  function createProxyServer(options: ProxyOptions): ProxyServer;

  const httpProxy: {
    createProxyServer: typeof createProxyServer;
  };

  export default httpProxy;
  export { createProxyServer, ProxyServer, ProxyOptions };
}
