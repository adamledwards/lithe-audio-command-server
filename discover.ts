import { Device, UpnpXml, Speakers, Speaker } from "./types/discover.ts";
import parse from "https://denopkg.com/nekobato/deno-xml-parser/index.ts";
import NetAddr = Deno.NetAddr;

const header = `M-SEARCH * HTTP/1.1\r\n
HOST: 239.255.255.250:1900\r\n
ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n
MAN: "ssdp:discover"\r\n
MX: 1\r\n
\r\n`;

const addr: NetAddr = {
  hostname: "239.255.255.250",
  port: 1900,
  transport: "udp",
};

function getSocket() {
  return Deno.listenDatagram({
    port: 6811,
    transport: "udp",
    hostname: "0.0.0.0",
  });
}

const t = new TextEncoder();

async function message(sock: Deno.DatagramConn) {
  let condition = true;
  let messages = [];
  const iterator = sock[Symbol.asyncIterator]();
  try {
    while (condition) {
      const nextMessage = iterator.next();
      const { done, value } = await Promise.race([
        nextMessage,
        new Promise<{ done: true; value: any }>((resolve) =>
          setTimeout(resolve, 1000, { done: true, value: void 0 })
        ),
      ]);
      if (!done) {
        const td = new TextDecoder();
        const [message, addr] = value;
        messages.push(td.decode(message));
        condition = false;
      } else {
        iterator.return && iterator.return();
      }
    }
  } catch (error) {}
  return [...new Set(messages)];
}

function findByName(key: keyof UpnpXml, name: string) {
  return (value: UpnpXml) => {
    return value[key] === name;
  };
}

function normaliseUpnpXml(acc: Speaker, xml: UpnpXml) {
  acc[xml.name] = xml;
  return acc;
}

function normaliseUUID(acc: Speakers, speaker: Speaker | false) {
  if (speaker) {
    const uuid = speaker.UDN.content?.replace("uuid:", "");
    if (uuid) {
      acc[uuid] = speaker;
    }
  }
  return acc;
}

export default async function getDevices(): Promise<Speakers> {
  const socket = await getSocket();
  await socket.send(t.encode(header), addr);

  const messages = await message(socket);

  const devicesHeaders = messages.map((element) => {
    const lines = element.split("\r\n");
    const removeEmptyLines = lines.slice(1).filter(Boolean);

    const headers = removeEmptyLines.reduce<{ [key: string]: string }>(
      (acc, line) => {
        const [key, value] = line.split(": ");
        acc[key] = value;
        return acc;
      },
      {}
    );
    return headers;
  });

  const fetchRequest = devicesHeaders.map((devicesHeader) => {
    return fetch(devicesHeader["Location"]);
  });

  const descriptionPromise = fetchRequest.map(async (fp) => {
    const res = await fp;
    const UpnpXmlString = await res.text();
    const device = (
      (parse(UpnpXmlString).root?.children as UpnpXml[]) || []
    ).find(findByName("name", "device"));

    device?.children.reduce;
    const description = device?.children.reduce(
      normaliseUpnpXml,
      {} as Speaker
    );
    return description?.manufacturer.content === "LitheAudio" && description;
  });
  const devices = await Promise.all(descriptionPromise);

  return devices.reduce(normaliseUUID, {} as Speakers);
}
