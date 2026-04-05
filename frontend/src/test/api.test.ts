import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const logoutMock = vi.fn()
const getStateMock = vi.fn()
const setStateMock = vi.fn()
const postMock = vi.fn()

vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: getStateMock,
    setState: setStateMock,
  },
}))

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')

  return {
    ...actual,
    default: {
      create: actual.default.create,
      post: postMock,
    },
  }
})

describe('api auth redirect handling', () => {
  beforeEach(() => {
    vi.resetModules()
    logoutMock.mockReset()
    getStateMock.mockReset()
    setStateMock.mockReset()
    postMock.mockReset()
    window.history.replaceState(null, '', '/')
  })

  it('redirects to login via history when refresh token is missing', async () => {
    getStateMock.mockReturnValue({
      tokens: null,
      logout: logoutMock,
    })

    const { default: api } = await import('../api')

    const responseHandlers = api.interceptors.response.handlers ?? []
    const rejected = responseHandlers[responseHandlers.length - 1]?.rejected

    expect(rejected).toBeDefined()

    const error = {
      isAxiosError: true,
      config: {
        headers: {},
        url: '/usage',
      } as InternalAxiosRequestConfig,
      response: {
        status: 401,
      },
    } as AxiosError

    await expect(rejected?.(error)).rejects.toBe(error)

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
  })
})
