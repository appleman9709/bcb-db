import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const familyId = 1 // TODO: заменить на актуальный ID семьи
      const { data: feed } = await supabase
        .from('feedings')
        .select('timestamp')
        .eq('family_id', familyId)
        .order('timestamp', { ascending: false })
        .limit(1)
      const { data: diaper } = await supabase
        .from('diapers')
        .select('timestamp')
        .eq('family_id', familyId)
        .order('timestamp', { ascending: false })
        .limit(1)
      setData({ feed: feed?.[0], diaper: diaper?.[0] })
    }
    fetchData()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👶 Baby Dashboard</h1>
      {data ? (
        <div className="bg-white/30 backdrop-blur rounded-xl p-4 shadow">
          <p>Последнее кормление: {data.feed ? new Date(data.feed.timestamp).toLocaleString() : 'нет данных'}</p>
          <p>Последняя смена подгузника: {data.diaper ? new Date(data.diaper.timestamp).toLocaleString() : 'нет данных'}</p>
        </div>
      ) : (
        <p>Загрузка...</p>
      )}
    </div>
  )
}
