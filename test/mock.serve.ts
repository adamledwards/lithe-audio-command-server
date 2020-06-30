import { ServerRequest } from '../server.ts'
import { deferred } from 'https://deno.land/std/async/deferred.ts'

type MockRequest = {url: string, method: string, respond: Function}
function mockServerRequest(mockRequest: MockRequest) {
    return mockRequest as ServerRequest
}

async function* serve(returnValue: ServerRequest): AsyncIterableIterator<ServerRequest> {
    let once = true
    while (once) {
        once = false
        const d = deferred<ServerRequest>()
        yield returnValue
    }

}

export default function mockServe(mockRequest: MockRequest) {
    return () => ({
        returnValue: mockServerRequest(mockRequest),
        [Symbol.asyncIterator]() {
            const d = deferred()
            return serve(this.returnValue)
        }
    })
}
