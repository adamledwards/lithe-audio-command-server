import NetAddr = Deno.NetAddr;

var conn: Deno.Conn;
const rem_id = new Uint8Array([0x00, 0x0]);
const cmd_set = new Uint8Array([0x02]);
const padding = new Uint8Array([0x03, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x00]);
const ip = "192.168.86.245";
const bufSize = 1024;
let reg = false;

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

function getConnection() {

  const speakers: {[ip: string]: Deno.Conn} = {} 
  return async (ip: string = '1') => {
    if (!speakers[ip]) {
      const conn = await Deno.connect({
        hostname: ip,
        port: 7777,
        transport: "tcp",
      });
    }
    speakers[ip] = conn
    return speakers[ip];
  };
}
function buf2hex(buffer: ArrayBuffer) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}
const connection = getConnection();

async function register() {
  const conn = await connection();
  const hostname = (conn.localAddr as NetAddr).hostname;
  const t = new TextEncoder();
  var payload: Uint8Array[] = [
    rem_id,
    cmd_set,
    padding,
    t.encode(String(hostname)),
  ];
  const success = await conn.write(mergeBuffer(payload));
  const bufferContent = new Uint8Array(1024);
  const bytesRead = await conn.read(bufferContent);
  if (!bytesRead) {
    throw "Registration failed";
  }
  return conn;
}

export async function setVolume(cmd: number) {
  if (cmd >= 0 && 100 >= cmd) {
    const conn = await register();
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
    const bytesRead = await conn.read(bufferContent);
    if (bytesRead) {
      console.log(buf2hex(bufferContent.slice(0, bytesRead)), bytesRead);
    }

    return;
  }
  throw Error("Volume must be a number between 0 and 100");
}

export async function setSkip(cmd: Skip) {
  if (cmd === "NEXT" || cmd === "PREV") {
    const bytes = await playerState(cmd);
    if (bytes) {
      console.log(buf2hex(bytes));
    }

    return;
  }
  throw Error("cmd must be NEXT or PREV");
}

export async function pauseResume(cmd: PauseResume) {
  if (cmd === "PAUSE" || cmd === "RESUME") {
    const bytes = await playerState(cmd);
    if (bytes) {
      console.log(buf2hex(bytes));
    }
    return;
  }
}

export async function stop() {
  const bytes = await playerState("STOP" as Stop);
  if (bytes) {
    console.log(buf2hex(bytes));
  }

  return;
}
export async function seek(cmd: Number) {
  const bytes = await playerState(<Seek>`SEEK:${cmd}`);
  if (bytes) {
    console.log(buf2hex(bytes));
  }
  return;
}

export async function playerState(cmd: Skip | PauseResume | Seek | Stop) {
  const conn = await register();
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
  return null;
}
