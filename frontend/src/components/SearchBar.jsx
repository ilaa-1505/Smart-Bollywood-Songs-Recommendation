import { useState } from "react"

const PRESETS = [
    "I am missing my best friend",
    "First Love",
    "I'm missing him a lot today",
    "long drive with friends",
    "Late night, overthinking",
    "Gym motivation",
    "Sad and lonely",
    "Missing Home"
]

export default function SearchBar({ onSearch, loading }) {
    const [prompt, setPrompt] = useState("")

    const handleSubmit = () => {
        if (prompt.trim()) onSearch(prompt)
    }

    return (
        <div className="searchbar">
            <div className="presets">
                {PRESETS.map((p, i) => (
                    <button key={i} className="preset-btn" onClick={() => {
                        setPrompt(p)
                        onSearch(p)
                    }}>
                        {p}
                    </button>
                ))}
            </div>
            <div className="input-row">
                <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="how are you feeling right now?"
                    className="input"
                />
                <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                    {loading ? "..." : "→"}
                </button>
            </div>
        </div>
    )
}