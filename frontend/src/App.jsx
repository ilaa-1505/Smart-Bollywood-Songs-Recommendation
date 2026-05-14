import { useState, useEffect } from "react"
import Constellation from "./components/Constellation"
import SearchBar from "./components/SearchBar"
import RecommendationCard from "./components/RecommendationCard"
import PipelinePage from "./components/PipelinePage"
import "./App.css"

export default function App() {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState([])
  const [showPipeline, setShowPipeline] = useState(false)

  useEffect(() => {
    fetch("/api/songs/")
      .then(res => res.json())
      .then(data => setSongs(data.songs))
      .catch(console.error)
  }, [])

  const handleSearch = async (prompt) => {
    setLoading(true)
    try {
      const res = await fetch("/api/recommend/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      setRecommendations(data.recommendations)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (showPipeline) return <PipelinePage onBack={() => setShowPipeline(false)} />

  return (
    <div className="app">
      <Constellation recommendations={recommendations} songs={songs} />
      <h1 className="title">Daastan</h1>
      <p className="subtitle">Powered by semantic search, BM25 retrieval, and an LLM that thinks like a Bollywood nerd.</p>

      <button className="how-btn" onClick={() => setShowPipeline(true)}>
        how it works
      </button>

      <div className="bottom">
        {recommendations.length > 0 && (
          <div className="cards">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        )}
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>
    </div>
  )
}