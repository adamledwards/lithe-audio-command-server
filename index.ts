import API, { ServerRequest, ResponseCallback } from "./server.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import { setVolume, playerState } from "./commands.ts";
import getDevices from "./discover.ts";

const api = new API();
const speakers = await getDevices();
const ids = Object.keys(speakers);

type SpeakerMap = {
  [uuid: string]: {
    name: string;
    ip: string;
  };
};
const speakerMap = ids.reduce((acc, id) => {
  const { friendlyName, presentationURL } = speakers[id];
  if (friendlyName.content && presentationURL.content) {
    acc[id] = { name: friendlyName.content, ip: presentationURL.content };
  }
  return acc;
}, {} as SpeakerMap);

function deviceApi<T extends object>(
  path: string,
  callback: ResponseCallback<{ uuid: string } & T>
) {
  console.log(`{uuid}${path}`)
  api.post<{ uuid: string } & T>(`{uuid}${path}`, (req, params) => {
    console.log(params)
    if (speakerMap[params.uuid]) {
      const url = new URL(speakerMap[params.uuid].ip)
      
      callback(req, params);
    } else {
      error(req, 404, "speaker not found");
    }
  });
}

api.get("/", (req: ServerRequest) => {
  return req.respond({
    body: JSON.stringify({
      count: ids.length,
      speakers: speakerMap,
    }),
    status: 200,
    headers: new Headers({
      "content-type": "application/json",
    }),
  });
});

function success(req: ServerRequest) {
  return req.respond({
    body: JSON.stringify({ response: "success" }),
    status: 200,
    headers: new Headers({
      "content-type": "application/json",
    }),
  });
}

function error(req: ServerRequest, status: number, message: string) {
  return req.respond({
    body: JSON.stringify({ error: message }),
    status,
    headers: new Headers({
      "content-type": "application/json",
    }),
  });
}

deviceApi<{ vol: string }>(
  "/volume/{vol}",
  async (req: ServerRequest, params) => {
    
    const volume = parseInt(params.vol, 10);
    if (volume && typeof volume === "number") {
      await setVolume(volume);
      return success(req);
    }
    return error(req, 400, "vol is not a number");
  }
);

deviceApi("/next", async (req: ServerRequest) => {
  await playerState("NEXT");
  return success(req);
});

deviceApi("/previous", async (req: ServerRequest) => {
  await playerState("PREV");
  return success(req);
});

deviceApi("/pause", async (req: ServerRequest) => {
  await playerState("PAUSE");
  return success(req);
});

deviceApi("/play", async (req: ServerRequest) => {
  await playerState("RESUME");
  return success(req);
});

deviceApi<{ seek: string }>("/seek/{seek}", async (req, params) => {
  const { seek } = params;
  if (parseInt(seek, 10) === NaN) {
    return error(req, 400, "seek is not a number");
  }
  await playerState(`SEEK:${seek}` as "SEEK");
  return success(req);
});

const { port } = parse(Deno.args);

api.listen(port);
