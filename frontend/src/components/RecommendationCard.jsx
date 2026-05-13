export default function RecommendationCard({ rec }) {
    return (
        <div className="card">
            {rec.album_art && (
                <img src={rec.album_art} alt={rec.song} className="card-art" />
            )}
            <div className="card-song">{rec.song}</div>
            <div className="card-tags">
                {rec.mood_tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
            </div>
            <div className="card-summary">{rec.emotional_summary}</div>
            {rec.spotify_url && (
                <a
                    href={rec.spotify_url}
                    target="_blank"
                    rel="noreferrer"
                    className="card-spotify"
                >
                    ↗ Open in Spotify
                </a>
            )}
        </div>
    )
}