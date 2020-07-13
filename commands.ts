import NetAddr = Deno.NetAddr;

const rem_id = new Uint8Array([0x00, 0x0]);
const cmd_set = new Uint8Array([0x02]);
const cmd_get = new Uint8Array([0x01]);
const padding = new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x00]);

type Skip = "NEXT" | "PREV";
type PauseResume = "PAUSE" | "RESUME";
type Seek = "SEEK";
type Stop = "STOP";

function mergeBuffer(buffer: Uint8Array[]) {
  const merged = new Deno.Buffer();
  buffer.forEach((value) => {
    merged.write(value);
  });
  return merged.bytes();
}

async function connection(ip: string) {
  const conn = await Deno.connect({
    hostname: ip,
    port: 7777,
    transport: "tcp",
  });
  return conn;
}

async function register(ip: string) {
  const conn = await connection(ip);
  const hostname = (conn.localAddr as NetAddr).hostname;
  const t = new TextEncoder();
  var payload: Uint8Array[] = [
    rem_id,
    cmd_set,
    padding,
    t.encode(String(hostname)),
  ];
  await conn.write(mergeBuffer(payload));
  const bufferContent = new Uint8Array(1024);
  const bytesRead = await conn.read(bufferContent);
  if (!bytesRead) {
    throw "Registration failed";
  }
  return conn;
}

export async function getStatus(ip: string) {
  const payloadData = new Uint8Array([
    0x29,
    0x00,
    0x00,
    0x00,
    0x00,
    0x0a,
    0x00,
    0x47,
    0x45,
    0x54,
    0x55,
    0x49,
    0x3a,
    0x50,
    0x4c,
    0x41,
    0x59,
  ]);
  const payload: Uint8Array[] = [rem_id, cmd_set, payloadData];
  const conn = await register(ip);
  await conn.write(mergeBuffer(payload));

  const td = new TextDecoder();

  const regex = /({.+})/;
  let matcher = null;
  while (!matcher) {
    let bufferContent = new Uint8Array(32 * 1024);
    await conn.read(bufferContent);
    let data = td.decode(bufferContent);
    matcher = data.match(regex);
  }
  let json = {};
  try {
    if (matcher) {
      json = JSON.parse(matcher[0]);
    }
  } catch (error) {
    console.log(error);
  }
  conn.close();
  return json;
}

export async function setVolume(cmd: number, ip: string) {
  if (cmd >= 0 && 100 >= cmd) {
    const conn = await register(ip);
    const t = new TextEncoder();
    const payload = [
      rem_id,
      cmd_set,
      new Uint8Array([0xdb, 0x00, 0x00, 0x00, 0x00]),
      new Uint8Array([String(cmd).length, 0x00]),
      t.encode(String(cmd)),
    ];
    await conn.write(mergeBuffer(payload));
    const bufferContent = new Uint8Array(1024);
    await conn.read(bufferContent);
    conn.close();
    return;
  }
  throw Error("Volume must be a number between 0 and 100");
}

export async function getVolume(ip: string) {
  const conn = await register(ip);
  const t = new TextEncoder();
  const payload = [
    rem_id,
    cmd_get,
    new Uint8Array([0xdb, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  ];
  await conn.write(mergeBuffer(payload));

  const td = new TextDecoder();
  const regex = /\d+/;
  let matcher = null;
  while (!matcher) {
    let bufferContent = new Uint8Array(32 * 1024);
    await conn.read(bufferContent);
    let data = td.decode(bufferContent);
    matcher = data.match(regex);
  }
  conn.close();
  return { volume: matcher[0] };
}

export async function setSkip(cmd: Skip, ip: string) {
  if (cmd === "NEXT" || cmd === "PREV") {
    await playerState(cmd, ip);
    return;
  }
  throw Error("cmd must be NEXT or PREV");
}

export async function pauseResume(cmd: PauseResume, ip: string) {
  if (cmd === "PAUSE" || cmd === "RESUME") {
    await playerState(cmd, ip);
    return;
  }
  throw Error("cmd must be PAUSE or RESUME");
}

export async function stop(ip: string) {
  await playerState("STOP" as Stop, ip);
}
export async function seek(cmd: Number, ip: string) {
  await playerState(<Seek>`SEEK:${cmd}`, ip);
}

export async function playerState(
  cmd: Skip | PauseResume | Seek | Stop,
  ip: string
) {
  const conn = await register(ip);
  const t = new TextEncoder();
  const payload = [
    rem_id,
    cmd_set,
    new Uint8Array([0x28, 0x00, 0x00, 0x00, 0x00]),
    new Uint8Array([cmd.length, 0x00]),
    t.encode(cmd),
  ];
  await conn.write(mergeBuffer(payload));
  const bufferContent = new Uint8Array(1024);
  const bytesRead = await conn.read(bufferContent);
  if (bytesRead) {
    return bufferContent.slice(0, bytesRead);
  }
  conn.close();
  return null;
}

export async function reboot(ip: string) {
  const conn = await register(ip);
  const t = new TextEncoder();
  const payload = [
    rem_id,
    cmd_set,
    new Uint8Array([0x73, 0x00, 0x00, 0x00, 0x00]),
    new Uint8Array([0, 0x00]),
  ];
  await conn.write(mergeBuffer(payload));
  conn.close();
  return null;
}
