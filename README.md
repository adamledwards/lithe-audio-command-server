# Lithe Audio Command Server (In Development)

Server for discovering and controlling media play back on Lithe Audio Wifi speakers written in Deno
_Note: This is an unofficial project.

## Prerequisites
Lithe Audio Wifi Speakers
Deno

## Getting Started
Following the instructions for installing (Deno)[https://deno.land/#getting-started].
To run the Lithe Audio Command Server run `deno run  --allow-net --unstable index.ts --port 3333`
This will start the server on port 3333. 
Port 6811 will also need to be open for uPnP.


## Permissions Flags 
- --allow-net TCP connection to the lithe audio speaker and uPnP. 
- --unstable  Deno.listenDatagram for upd connections is an unstable api at time on of writing (Deno 1.1.0) 

## API 

### Get all speakers
**You get:** A list of speakers with the uuid as key, name and host address of the speaker

**Request:**
```
GET /
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
  {
    count: number
    speakers: [uuid: string]: {
      name: string;
      host: string;
    },
  }
```

### Get speakers status
**You get:** Status of the speaker with track name 

**Request:**
```
GET /{uuid}
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
  {
      name: string;
      host: string;
      uuid: string;
      status: {
        ...
      }
    
  }
```

### Get volume
**You get:** volume number on success

**Request:**
```
GET /{uuid}/volume
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
  {
      name: string;
      host: string;
      uuid: string;
      volume: number
    
  }
```

### Set volume
**You get:** volume number on success
**You send:** path with volume number 0-100 error if validation fails

**Request:**
```
POST /{uuid}/volume/{number}
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
  {
      name: string;
      host: string;
      uuid: string;
      volume: number
    
  }
```


### Set play state
**You get:** success message

**Request:**
```
POST /{uuid}/play
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
 { response: 'success' }
```

### Set pause state
**You get:** success message

**Request:**
```
POST /{uuid}/pause
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
 { response: 'success' }
```

### Set stop state
**You get:** success message

**Request:**
```
POST /{uuid}/stop
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
 { response: 'success' }
```

### Previous track
**You get:** success message

**Request:**
```
POST /{uuid}/previous
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
 { response: 'success' }
```

### Next track
**You get:** success message

**Request:**
```
POST /{uuid}/next
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
 { response: 'success' }
```

### Reboot
**You get:** success message

**Request:**
```
POST /{uuid}/reboot
```
**Successful Response:**
```ts
HTTP/1.1 200 OK
 { response: 'success' }
```