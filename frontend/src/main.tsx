import React from 'react'
import ReactDOM from 'react-dom/client'
import { SWRConfig } from 'swr'
import App from './App'
import api from './api'

const axiosFetcher = (url: string) => api.get(url).then((res) => res.data)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SWRConfig value={{ fetcher: axiosFetcher }}>
      <App />
    </SWRConfig>
  </React.StrictMode>,
)
