import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PrintInboxHub_Darkmode from './PrintInboxHub_DarkMode.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrintInboxHub_Darkmode/>
  </StrictMode>,
)
