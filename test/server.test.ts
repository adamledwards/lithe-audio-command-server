
import { assertStrictEq, assertEquals, assertArrayContains } from "https://deno.land/std/testing/asserts.ts"
import API, { Serve } from '../server.ts'
import mockServe from './mock.serve.ts'

function buildApi(response?: Serve) {
    return new API(response)
}

interface Spy<T> {
    callback: (...args: any) => T | void
    callCount: () => number
    calledWith: () => any
    returnValue?: T
}

function spyFactory<T  = void>(returnValue?: T): Spy<T> {

    let callCount = 0
    let calledWith: any[] = []
        
    return {
        callback(...args): T | void {
            callCount = callCount + 1
            calledWith = args
            return returnValue
        },
        calledWith() {
            return calledWith
        },
        callCount() {
            return callCount
        }
    }
   
}

Deno.test('post callback is added to the routes path object', () => {
    const api = buildApi()
    const callback = () => {}
    api.post('/test', callback)
    assertStrictEq(api.routes.POST.path['/test'], callback)
})


Deno.test('get callback is added to the routes path object', () => {
    const api = buildApi()
    const callback = () => {}
    api.get('/test', callback)
    assertStrictEq(api.routes.GET.path['/test'], callback)
})


Deno.test('post callback is added to the routes regex object', () => {
    const api = buildApi()
    const callback = () => {}
    api.post('/test/{var}', callback)
    const expected = {
        pattern: "/test/(.+)$",
        paramsNames: [ "var" ],
        path: '/test/{var}',
        callback
    }
    assertEquals(api.routes.POST.regex['/test/(.+)$'], expected)
})


Deno.test('get callback is added to the routes regex object', () => {
    const api = buildApi()
    const callback = () => {}
    api.get('/test/{var}', callback)
    const expected = {
        pattern: "/test/(.+)$",
        paramsNames: [ "var" ],
        path: '/test/{var}',
        callback,
    }
    assertEquals(api.routes.GET.regex['/test/(.+)$'], expected)
})

Deno.test('url params are passed into callback', async () => {
    const spy = spyFactory()
    const responseData = spyFactory<String>('hello')
    const response = mockServe({url: '/test/123/test/222', method: 'GET', respond: responseData.callback }) as unknown as Serve
    const api = buildApi(response)
    api.get<{var: string, var2: string}>('/test/{var}/test/{var2}', (req, params) => {
        spy.callback(params)
    })
    await api.listen()
    assertStrictEq(spy.callCount(), 1)
    assertEquals(spy.calledWith()[0], { var: "123", var2: "222" })
})

Deno.test('404 is returned if no routes are found', async () => {
    const responseData = spyFactory<String>('hello')
    const response = mockServe({url: '/test/123/test/222', method: 'GET', respond: responseData.callback }) as unknown as Serve
    const api = buildApi(response)
    await api.listen()
    const { status } = responseData.calledWith()[0]
    assertEquals({ status }, { status: 404 })
})