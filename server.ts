import {
  serve,
  ServerRequest,
  Server,
} from "https://deno.land/std/http/server.ts";
export type Serve = typeof serve;
export { ServerRequest } from "https://deno.land/std/http/server.ts";

export interface ResponseCallback<T = void> {
  (req: ServerRequest, params: T): void;
}

type RegexCallback<T> = {
  pattern: string;
  paramsNames: string[];
  callback: ResponseCallback<T>;
  path: string;
};

interface Route {
  path: {
    [path: string]: ResponseCallback;
  };
  regex: {
    [path: string]: RegexCallback<any>;
  };
}

export interface Routes {
  [method: string]: Route;
}

function pathRegex(
  path: string,
  callback: ResponseCallback<any>
): ResponseCallback<any> | RegexCallback<any> {
  let newPath = path;
  const paramsNames = [];
  const params = new RegExp("{([a-zA-Z0-9]+)}", "g");
  let m: RegExpExecArray | null;
  while ((m = params.exec(path)) !== null) {
    newPath = newPath.replace(m[0], "(.+)");
    paramsNames.push(m[1]);
  }

  if (paramsNames.length) {
    return {
      pattern: "/" + newPath + "$",
      paramsNames,
      callback,
      path,
    };
  }
  return callback;
}

function isCallback<T>(
  view: ResponseCallback<any> | RegexCallback<T>
): view is ResponseCallback {
  return typeof view === "function";
}

export default class API {
  constructor(private apiServe: Serve = serve) {}

  routes: Routes = {
    GET: {
      path: {},
      regex: {},
    },
    POST: {
      path: {},
      regex: {},
    },
  };

  private addRoute(
    method: "GET" | "POST",
    path: string,
    callback: ResponseCallback<any>
  ) {
    const view = pathRegex(path, callback);
    if (isCallback(view)) {
      this.routes[method].path[path] = view;
    } else {
      this.routes[method].regex[view.pattern] = view;
    }
  }

  private extractParams<T = {}>(
    req: ServerRequest,
    regexCallback: RegexCallback<any>
  ) {
    const r = new RegExp(regexCallback.pattern, "g");
    let i = 0;

    const params: {
      [key: string]: string;
    } = {};
    const m = r.exec(req.url);
    if (m) {
      regexCallback.paramsNames.forEach((key, index) => {
        params[key] = m[index + 1];
      });
    }
    return params;
  }

  post<T = void>(path: string, callback: ResponseCallback<T>) {
    this.addRoute("POST", path, callback);
  }

  get<T = void>(path: string, callback: ResponseCallback<T>) {
    this.addRoute("GET", path, callback);
  }

  respond(req: ServerRequest, _route?: Route) {
    const route = _route || this.routes[req.method.toUpperCase()];
    let callback = route.path[req.url];
    if (typeof callback === "function") {
      callback(req);
      return true;
    } else {
      const regex = route.regex;
      const pattern = Object.keys(regex).find((key) => {
        const r = new RegExp(key, "g");
        return r.test(req.url);
      });
      if (pattern) {
        regex[pattern].callback(req, this.extractParams(req, regex[pattern]));
        return true;
      }
    }
  }

  async listen(port = 8000) {
    const server = this.apiServe({ port: port });

    for await (const req of (server as unknown) as Array<ServerRequest>) {
      console.log(req.method + ":" + req.url, req.headers.get("user-agent"));
      if (!this.respond(req)) {
        req.respond({
          body: JSON.stringify({ error: "Not Found" }),
          status: 404,
          headers: new Headers({
            "content-type": "application/json",
          }),
        });
      }
    }
  }
}
