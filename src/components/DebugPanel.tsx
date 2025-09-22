
import React, { useState } from 'react'
import { dataService } from '../services/dataService'

const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('')

  const checkData = async () => {
    try {
      const settings = await dataService.getSettings()
      if (settings) {
        setDebugInfo(`????????? ???????: ???????? ????????? ${settings.feed_interval}?, ??????????? ? ${settings.diaper_interval}?`)
      } else {
        setDebugInfo('????????? ????? ?? ???????')
      }
    } catch (error) {
      setDebugInfo(`??????: ${error}`)
    }
  }

  const checkLastActivities = async () => {
    try {
      const [lastFeeding, lastDiaper, lastBath] = await Promise.all([
        dataService.getLastFeeding(),
        dataService.getLastDiaper(),
        dataService.getLastBath()
      ])

      const info: string[] = []
      if (lastFeeding) info.push(`?????????: ${new Date(lastFeeding.timestamp).toLocaleString()}`)
      if (lastDiaper) info.push(`?????????: ${new Date(lastDiaper.timestamp).toLocaleString()}`)
      if (lastBath) info.push(`???????: ${new Date(lastBath.timestamp).toLocaleString()}`)

      setDebugInfo(info.length > 0 ? info.join(' | ') : '??? ????????? ???????')
    } catch (error) {
      setDebugInfo(`??????: ${error}`)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm w-80 sm:w-auto hidden sm:block">
      <h3 className="font-bold mb-2">?? Debug Panel</h3>

      <div className="space-y-2 mb-3">
        <button
          onClick={checkData}
          className="w-full px-2 py-1 bg-blue-500 rounded text-xs hover:bg-blue-600"
        >
          ????????? ?????????
        </button>
        <button
          onClick={checkLastActivities}
          className="w-full px-2 py-1 bg-green-500 rounded text-xs hover:bg-green-600"
        >
          ????????? ???????
        </button>
      </div>

      <div className="text-xs">
        {debugInfo && <p className="text-yellow-300 mt-1">{debugInfo}</p>}
      </div>
    </div>
  )
}

export default DebugPanel
