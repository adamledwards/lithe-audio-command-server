import API, { ServerRequest, ResponseCallback } from "./server.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import {
  setVolume,
  playerState,
  getStatus,
  getVolume,
  reboot,
} from "./commands.ts";
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
  callback: ResponseCallback<{ uuid: string; ip: string } & T>
) {
  api.post<{ uuid: string; ip: string } & T>(`{uuid}${path}`, (req, params) => {
    if (speakerMap[params.uuid]) {
      const url = new URL(speakerMap[params.uuid].ip);
      params.ip = url.hostname;
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

api.get<{ uuid: string }>(
  "{uuid}/volume",
  async (req: ServerRequest, { uuid }) => {
    if (speakerMap[uuid]) {
      const url = new URL(speakerMap[uuid].ip);
      const status = await getVolume(url.hostname);
      return json(req, { uuid, status, ip: url.hostname });
    } else {
      error(req, 404, "speaker not found");
    }
  }
);

api.get<{ uuid: string }>("{uuid}", async (req: ServerRequest, { uuid }) => {
  console.log(uuid);
  if (speakerMap[uuid]) {
    const url = new URL(speakerMap[uuid].ip);
    const status = await getStatus(url.hostname);
    return json(req, { uuid, ...status, ip: url.hostname });
  } else {
    error(req, 404, "speaker not found");
  }
});

function json(req: ServerRequest, json: object, status = 200) {
  return req.respond({
    body: JSON.stringify(json),
    status: 200,
    headers: new Headers({
      "content-type": "application/json",
    }),
  });
}

function error(req: ServerRequest, status: number, message: string) {
  return json(req, { error: message }, status);
}

function success(req: ServerRequest) {
  return json(req, { response: "success" });
}

deviceApi<{ vol: string }>(
  "/volume/{vol}",
  async (req: ServerRequest, { vol, ip, uuid }) => {
    const volume = parseInt(vol, 10);
    if (volume && typeof volume === "number") {
      await setVolume(volume, ip);
      return json(req, { uuid, volume, ip });
    }
    return error(req, 400, "vol is not a number");
  }
);

deviceApi("/next", async (req: ServerRequest, { ip }) => {
  await playerState("NEXT", ip);
  return success(req);
});

deviceApi("/previous", async (req: ServerRequest, { ip }) => {
  await playerState("PREV", ip);
  return success(req);
});

deviceApi("/pause", async (req: ServerRequest, { ip }) => {
  await playerState("PAUSE", ip);
  return success(req);
});

deviceApi("/play", async (req: ServerRequest, { ip }) => {
  await playerState("RESUME", ip);
  return success(req);
});

deviceApi("/stop", async (req: ServerRequest, { ip }) => {
  await playerState("STOP", ip);
  return success(req);
});

deviceApi("/reboot", async (req: ServerRequest, { ip }) => {
  await reboot(ip);
  return success(req);
});

deviceApi<{ seek: string }>("/seek/{seek}", async (req, { seek, ip }) => {
  if (parseInt(seek, 10) === NaN) {
    return error(req, 400, "seek is not a number");
  }
  await playerState(`SEEK:${seek}` as "SEEK", ip);
  return success(req);
});

const { port } = parse(Deno.args);

api.listen(port);
