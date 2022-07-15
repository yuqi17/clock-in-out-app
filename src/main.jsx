import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// <React.StrictMode> 会导致两次渲染的检查,去掉则会正常
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
