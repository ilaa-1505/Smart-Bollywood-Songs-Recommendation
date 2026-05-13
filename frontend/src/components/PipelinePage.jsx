import { useEffect, useRef } from "react"
import "../styles/Pipeline.css"

export default function PipelinePage({ onBack }) {
    const canvasRef = useRef(null)
    useEffect(() => {
        document.body.style.overflow = "auto"
        return () => { document.body.style.overflow = "hidden" }
    }, [])
    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        let animId

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener("resize", resize)

        const stars = Array.from({ length: 180 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 1.2 + 0.2,
            o: Math.random() * 0.5 + 0.1,
            speed: Math.random() * 0.3 + 0.05,
        }))

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            stars.forEach(s => {
                s.o += Math.sin(Date.now() * s.speed * 0.001) * 0.003
                ctx.beginPath()
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255,255,255,${Math.max(0.05, s.o)})`
                ctx.fill()
            })
            animId = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener("resize", resize)
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            const els = document.querySelectorAll("[data-reveal]")
            const obs = new IntersectionObserver(
                entries => entries.forEach(e => {
                    if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target) }
                }),
                { threshold: 0.1 }
            )
            els.forEach(el => obs.observe(el))
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    const steps = [
        {
            num: "01",
            tag: "you",
            title: "Your moment, in plain words",
            desc: "One line. Any language — Hindi, English, Hinglish. No genre picker. No mood selector. Just what's happening right now.",
            chips: [
                { label: "input", val: '"sad and lonely tonight"' },
            ],
        },
        {
            num: "02",
            tag: "llm",
            title: "Mood extraction",
            desc: "An LLM reads between the lines. It generates 3 grounded emotional tags and a restrained semantic description — no overclaiming.",
            chips: [
                { label: "tags", val: "loneliness · quiet despair · solitude" },
                { label: "emotion", val: "A deep sense of isolation and disconnection. Sadness and emptiness. Preoccupied with being alone." },
            ],
        },
        {
            num: "03",
            tag: "search",
            title: "Dual retrieval",
            desc: "Two search engines run in parallel against a library of song emotional summaries. One finds vibes. One finds exact tags.",
            chips: [
                { label: "semantic", val: "Embedding similarity against song summaries" },
                { label: "symbolic", val: "BM25 tag retrieval" },
            ],
        },
        {
            num: "04",
            tag: "rank",
            title: "Hybrid scoring",
            desc: "Results are blended. Semantic relevance carries most of the weight — because feelings are fuzzy, not keyword-shaped.",
            chips: [
                { label: "semantic", val: "× 0.75" },
                { label: "bm25", val: "× 0.25" },
                { label: "#1", val: "Tere Bina — 0.627" },
                { label: "#2", val: "Dil Dhoondta Hai — 0.570" },
                { label: "#3", val: "Jaane Woh Kaise Log The — 0.565" },
            ],
        },
        {
            num: "05",
            tag: "judge",
            title: "LLM judge",
            desc: "A second model reads your original words again — not just the tags. It selects the 2 songs that truly fit, then writes grounded reasoning from the lyrics.",
            chips: [
                { label: "song 1", val: "Tere Bina — loneliness, abandonment, regret. Matches the disconnection and emptiness." },
                { label: "song 2", val: "Dil Dhoondta Hai — longing and isolation, with a tone of quiet hope." },
            ],
        },
        {
            num: "06",
            tag: "api",
            title: "FastAPI response",
            desc: "The server packages everything into a clean JSON payload. Each song carries its full emotional dossier.",
            chips: [
                { label: "fields", val: "song, mood_tags, summary" },
                { label: "fields", val: "reason, scores, spotify_data" },
            ],
        },
        {
            num: "07",
            tag: "ui",
            title: "Constellation + cards",
            desc: "React renders songs as nodes in a 3D constellation — emotional similarity as edges, cinematic camera drift. Recommendation cards surface the lyric, album art, and Spotify link.",
            chips: [
                { label: "visual", val: "Constellation graph" },
                { label: "cards", val: "Reason + art + link" },
            ],
        },
    ]

    const skills = [
        { icon: "⬡", name: "FastAPI", desc: "Serves the API and the built React app from /dist" },
        { icon: "◈", name: "Dual-stage LLM", desc: "One model extracts mood. A second judges with taste." },
        { icon: "∿", name: "Semantic embeddings", desc: "Songs indexed by emotional summaries, not genre tags" },
        { icon: "◎", name: "BM25 retrieval", desc: "Symbolic search runs in parallel for tag precision" },
        { icon: "✦", name: "Constellation UI", desc: "3D graph where emotional similarity becomes edges" },
        { icon: "♫", name: "Spotify integration", desc: "Album art, playback data, deep links per recommendation" },
    ]

    return (
        <div className="pipeline-wrap">
            <canvas ref={canvasRef} className="pipeline-stars" />

            <button className="pipeline-back" onClick={onBack}>
                ← back
            </button>

            <div className="pipeline-content">

                <section className="pl-hero">
                    <p className="pl-eyebrow">how dastaan works</p>
                    <h1 className="pl-title">From feeling<br />to <em>the exact song</em></h1>
                    <p className="pl-sub">
                        Spotify knows your play count.<br />
                        <strong>Dastaan knows why you played it.</strong>
                    </p>
                    <div className="pl-scroll-hint">
                        <span>↓</span>
                        <span>scroll to explore</span>
                    </div>
                </section>

                <section className="pl-pipeline">
                    <p className="pl-section-label">the pipeline</p>

                    {steps.map((step, i) => (
                        <div className="pl-step" data-reveal key={i} style={{ transitionDelay: `${i * 40}ms` }}>
                            <div className="pl-step-left">
                                <span className="pl-step-num">{step.num}</span>
                                <span className="pl-step-line" />
                            </div>
                            <div className="pl-step-right">
                                <span className={`pl-tag pl-tag--${step.tag}`}>{step.tag}</span>
                                <h2 className="pl-step-title">{step.title}</h2>
                                <p className="pl-step-desc">{step.desc}</p>
                                <div className="pl-chips">
                                    {step.chips.map((c, j) => (
                                        <div className="pl-chip" key={j}>
                                            <strong>{c.label}</strong>
                                            {c.val}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="pl-skills">
                    <p className="pl-section-label">built with</p>
                    <div className="pl-skills-grid">
                        {skills.map((s, i) => (
                            <div className="pl-skill-card" data-reveal key={i} style={{ transitionDelay: `${i * 60}ms` }}>
                                <span className="pl-skill-icon">{s.icon}</span>
                                <p className="pl-skill-name">{s.name}</p>
                                <p className="pl-skill-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="pl-outro">
                    <p className="pl-outro-quote">
                        Algorithms see patterns.<br />
                        They don't see <em>you</em>.<br /><br />
                        Dastaan does something different.
                    </p>
                    <p className="pl-outro-byline">
                        Because sometimes you need Ajeeb Dastan Hai Yeh at 5am.
                    </p>
                </section>

            </div>
        </div>
    )
}