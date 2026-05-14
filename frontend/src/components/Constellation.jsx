import { useEffect, useRef } from "react"
import * as d3 from "d3"

// How long (ms) the background twinkles before the graph appears
const INTRO_DURATION = 2000

export default function Constellation({ recommendations, songs }) {

    const svgRef = useRef(null)
    const zoomRef = useRef(null)

    // persist latest recommendations without rebuilding graph
    const recommendationsRef = useRef([])

    useEffect(() => {
        recommendationsRef.current = recommendations
    }, [recommendations])

    useEffect(() => {

        if (!songs || songs.length === 0) return

        const width = window.innerWidth
        const height = window.innerHeight

        d3.select(svgRef.current).selectAll("*").remove()

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)

        // Graph group — invisible until intro finishes
        const g = svg.append("g").style("opacity", 0)

        const zoom = d3.zoom()
            .scaleExtent([0.3, 4])
            .on("zoom", event => g.attr("transform", event.transform))

        zoomRef.current = zoom
        svg.call(zoom)
        svg.call(zoom.transform, d3.zoomIdentity)

        // ─── LINKS ────────────────────────────────────────────────────────────

        const links = []

        // each song keeps up to 4 representative tags for link-matching
        const reducedTags = songs.map(song => {
            const shuffled = [...song.mood_tags].sort(() => Math.random() - 0.5)
            const count = Math.min(shuffled.length, 4)
            return shuffled.slice(0, count)
        })

        for (let i = 0; i < songs.length; i++) {

            for (let j = i + 1; j < songs.length; j++) {

                const shared = reducedTags[i].filter(tag =>
                    reducedTags[j].includes(tag)
                )

                // sparse organic linking
                if (shared.length > 0 && Math.random() < 0.45) {

                    links.push({
                        source: i,
                        target: j,

                        // stronger if more shared tags
                        strength: shared.length
                    })
                }
            }
        }

        // ─── NODES ────────────────────────────────────────────────────────────

        const nodes = songs.map((song, i) => ({ ...song, id: i }))
        const recNames = recommendationsRef.current.map(r => r.song)

        // ─── CLUSTER CENTERS ──────────────────────────────────────────────────

        const tagGroups = [...new Set(songs.map(s => s.mood_tags[0]))]
        const tagCenters = {}

        tagGroups.forEach((tag, i) => {
            const angle = (i / tagGroups.length) * 2 * Math.PI - Math.PI / 2
            tagCenters[tag] = {
                x: width / 2 + width * 0.34 * Math.cos(angle),
                y: height / 2 + height * 0.34 * Math.sin(angle)
            }
        })

        // ─── FORCE SIMULATION ─────────────────────────────────────────────────

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(
                width < 600
                    ? 120
                    : width < 1000
                        ? 170
                        : 260
            ).strength(0.018))
            .force("charge", d3.forceManyBody().strength(-180))
            .force(
                "collision",
                d3.forceCollide(
                    width < 600
                        ? 24
                        : width < 1000
                            ? 34
                            : 48
                )
            )
            .force("x", d3.forceX(d => tagCenters[d.mood_tags[0]]?.x || width / 2).strength(0.04))
            .force("y", d3.forceY(d => tagCenters[d.mood_tags[0]]?.y || height / 2).strength(0.04))

        // ─── DEFS ─────────────────────────────────────────────────────────────

        const defs = svg.append("defs")

        const addGlow = (id, blur) => {
            const f = defs.append("filter").attr("id", id)
                .attr("x", "-60%").attr("y", "-60%")
                .attr("width", "220%").attr("height", "220%")
            f.append("feGaussianBlur").attr("stdDeviation", blur).attr("result", "blur")
            const m = f.append("feMerge")
            m.append("feMergeNode").attr("in", "blur")
            m.append("feMergeNode").attr("in", "SourceGraphic")
        }

        addGlow("glow", 4)
        addGlow("glow-strong", 8)

        // ─── BACKGROUND STARS ────────────────────────────────────────────────
        // Immediately start twinkling — this is the whole intro

        const starsG = svg.insert("g", "g")

        for (let i = 0; i < 280; i++) {
            const x = Math.random() * width
            const y = Math.random() * height
            const big = Math.random() < 0.07
            const r = big ? Math.random() * 1.4 + 0.8 : Math.random() * 0.65 + 0.15

            const peak = (Math.random() * 0.6 + 0.2).toFixed(3)
            const trough = (parseFloat(peak) * 0.15).toFixed(3)
            const appearDelay = (Math.random() * 3).toFixed(2)
            const twinkleDur = (3 + Math.random() * 4).toFixed(2)
            const twinkleDelay = (Math.random() * 5).toFixed(2)

            starsG.append("circle")
                .attr("cx", x).attr("cy", y).attr("r", r)
                .attr("fill", "white")
                .attr("opacity", 0)
                .style("--peak", peak)
                .style("--trough", trough)
                .style("animation",
                    `bgStarIn 2s ${appearDelay}s ease-out forwards, ` +
                    `bgTwinkle ${twinkleDur}s ${twinkleDelay}s ease-in-out infinite alternate`
                )
        }

        // ─── LINKS DRAW ───────────────────────────────────────────────────────

        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "rgba(255,255,255,0.04)")
            .attr("stroke-width", 1)
            .attr("opacity", 0)

        // ─── NODES DRAW ───────────────────────────────────────────────────────

        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .style("cursor", "pointer")

        // Pulse ring for recommended songs
        node.filter(d => recNames.includes(d.song))
            .append("circle")
            .attr("class", "pulse-ring")
            .attr("r", 18)
            .attr("fill", "none")
            .attr("stroke", "rgba(255,255,255,0.15)")
            .attr("stroke-width", 1)

        // Main node circles — staggered entry, no twinkle
        node.append("circle")
            .attr("class", "node-circle")
            .attr("r", d => recNames.includes(d.song) ? 8 : 3.5)
            .attr("fill", d => recNames.includes(d.song) ? "white" : "rgba(255,255,255,0.5)")
            .attr("filter", d => recNames.includes(d.song) ? "url(#glow)" : null)
            .attr("opacity", 0)

        // Labels — hidden until focusNode reveals them via fill
        node.append("text")
            .text(d => d.song)
            .attr("x", 14).attr("y", 4)
            .attr("opacity", 1)
            .attr("fill", "rgba(255,255,255,0)")
            .attr("font-size", d => {
                if (width < 600) {
                    return recNames.includes(d.song) ? "10px" : "8px"
                }

                if (width < 1000) {
                    return recNames.includes(d.song) ? "11px" : "9px"
                }

                return recNames.includes(d.song) ? "13px" : "11px"
            })
            .attr("font-family", "'DM Sans', 'Helvetica Neue', sans-serif")
            .attr("font-weight", d => recNames.includes(d.song) ? "500" : "300")
            .attr("letter-spacing", "0.03em")
            .style("pointer-events", "none")

        // ─── SIMULATION TICK ──────────────────────────────────────────────────

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
            node.attr("transform", d => `translate(${d.x},${d.y})`)
        })

        // ─── INTRO → GRAPH REVEAL ─────────────────────────────────────────────

        setTimeout(() => {

            simulation.stop()

            const graphCx = d3.mean(nodes, d => d.x)
            const graphCy = d3.mean(nodes, d => d.y)

            const scale =
                width < 600
                    ? 0.72
                    : width < 1000
                        ? 0.88
                        : 1.02
            const baseTx = width / 2 - graphCx * scale
            const baseTy = height / 2 - graphCy * scale

            let currentX = baseTx
            let currentY = baseTy

            svg.call(zoom.transform, d3.zoomIdentity.translate(currentX, currentY).scale(scale))

            g.style("opacity", 1)

            const nodeEls = node.nodes()
            const order = d3.shuffle(d3.range(nodeEls.length))
            const totalTime = 2000

            order.forEach((idx, i) => {
                const delay = (i / order.length) * totalTime
                d3.select(nodeEls[idx]).select(".node-circle")
                    .transition()
                    .delay(delay)
                    .duration(500)
                    .ease(d3.easeCubicOut)
                    .attr("opacity", 1)
            })

            link.transition()
                .delay(totalTime + 100)
                .duration(600)
                .ease(d3.easeCubicOut)
                .attr("opacity", 1)

            const SETTLE = totalTime + 800

            setTimeout(() => {
                node.select(".node-circle").attr("opacity", 1)
                link.attr("opacity", 1)

                const randomNode = nodes[Math.floor(Math.random() * nodes.length)]
                focusNode(randomNode)

                node.on("mouseover", (_, d) => focusNode(d))
            }, SETTLE)

            // ─── HOVER FOCUS ──────────────────────────────────────────────────

            let hoveredNode = null
            let recommendedIds = new Set()

            function focusNode(selectedNode) {
                hoveredNode = selectedNode

                const connectedIds = new Set([
                    selectedNode.id,
                    ...recommendedIds
                ])
                links.forEach(l => {
                    if (l.source.id === selectedNode.id) connectedIds.add(l.target.id)
                    if (l.target.id === selectedNode.id) connectedIds.add(l.source.id)
                })

                node.select("text")
                    .transition().duration(550).ease(d3.easeCubicOut)
                    .attr("fill", n => connectedIds.has(n.id) ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.04)")
                    .attr("font-size", n => n.id === selectedNode.id ? "14px" : connectedIds.has(n.id) ? "11px" : "10px")
                    .attr("font-weight", n => n.id === selectedNode.id ? "600" : "300")

                node.select(".node-circle")
                    .transition().duration(550).ease(d3.easeCubicOut)
                    .attr("fill", n =>
                        n.id === selectedNode.id ? "white"
                            : connectedIds.has(n.id) ? "rgba(255,255,255,0.78)"
                                : "rgba(255,255,255,0.12)"
                    )
                    .attr("r", n =>
                        n.id === selectedNode.id ? 10
                            : connectedIds.has(n.id) ? 5 : 3
                    )
                    .attr("filter", n =>
                        n.id === selectedNode.id ? "url(#glow-strong)"
                            : connectedIds.has(n.id) ? "url(#glow)" : null
                    )

                node.select(".pulse-ring")
                    .transition().duration(550)
                    .attr("stroke", n =>
                        connectedIds.has(n.id) ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)"
                    )

                link.transition().duration(550)
                    .attr("stroke", l =>
                        l.source.id === selectedNode.id || l.target.id === selectedNode.id
                            ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.025)"
                    )
                    .attr("stroke-width", l =>
                        l.source.id === selectedNode.id || l.target.id === selectedNode.id
                            ? l.strength * 0.7 : 1
                    )
            }

            // ─── FLOATING CAMERA ──────────────────────────────────────────────

            d3.timer(elapsed => {
                const drift = elapsed * 0.000038
                const orbitX = Math.cos(drift) * 5
                const orbitY = Math.sin(drift * 0.62) * 4

                const nudgeX = hoveredNode ? (hoveredNode.x - graphCx) * 0.13 : 0
                const nudgeY = hoveredNode ? (hoveredNode.y - graphCy) * 0.13 : 0

                const isMobile = width < 900

                const recommendationsOffset =
                    recommendations.length > 0
                        ? width < 900
                            ? width * 0.18
                            : width * 0.32
                        : 0

                const desiredX =
                    baseTx
                    - nudgeX * scale
                    + orbitX
                    - recommendationsOffset
                const desiredY = baseTy - nudgeY * scale + orbitY

                currentX += (desiredX - currentX) * 0.014
                currentY += (desiredY - currentY) * 0.014

                svg.call(
                    zoom.transform,
                    d3.zoomIdentity.translate(currentX, currentY).scale(scale)
                )
            })

        }, INTRO_DURATION)

        return () => simulation.stop()

    }, [songs])

    useEffect(() => {

        if (!recommendations.length) return
        if (!svgRef.current) return

        const latestSongs = recommendations
            .slice(0, 2)
            .map(r => r.song)

        const svg = d3.select(svgRef.current)

        svg.selectAll(".node-circle")
            .transition()
            .duration(700)
            .ease(d3.easeCubicOut)
            .attr("fill", d => {
                if (latestSongs.includes(d.song)) return "white"

                let connected = false

                svg.selectAll("line").each(function (l) {
                    if ((
                        latestSongs.includes(l.source.song) &&
                        l.target.song === d.song
                    ) ||
                        (
                            latestSongs.includes(l.target.song) &&
                            l.source.song === d.song
                        )) {
                        connected = true
                    }
                })

                return connected
                    ? "rgba(255,255,255,0.78)"
                    : "rgba(255,255,255,0.12)"
            })
            .attr("r", d => {
                if (latestSongs.includes(d.song)) return 10

                let connected = false

                svg.selectAll("line").each(function (l) {
                    if ((
                        latestSongs.includes(l.source.song) &&
                        l.target.song === d.song
                    ) ||
                        (
                            latestSongs.includes(l.target.song) &&
                            l.source.song === d.song
                        )) {
                        connected = true
                    }
                })

                return connected ? 5 : 3
            })
            .attr("filter", d => {
                if (latestSongs.includes(d.song)) return "url(#glow-strong)"

                let connected = false

                svg.selectAll("line").each(function (l) {
                    if ((
                        latestSongs.includes(l.source.song) &&
                        l.target.song === d.song
                    ) ||
                        (
                            latestSongs.includes(l.target.song) &&
                            l.source.song === d.song
                        )) {
                        connected = true
                    }
                })

                return connected ? "url(#glow)" : null
            })

        svg.selectAll("line")
            .transition()
            .duration(700)
            .ease(d3.easeCubicOut)
            .attr("stroke", l =>
                latestSongs.includes(l.source.song) ||
                    latestSongs.includes(l.target.song)
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.025)"
            )
            .attr("stroke-width", l =>
                latestSongs.includes(l.source.song) ||
                    latestSongs.includes(l.target.song)
                    ? l.strength * 0.7
                    : 1
            )

        svg.selectAll("text")
            .transition()
            .duration(700)
            .ease(d3.easeCubicOut)
            .attr("fill", d => {

                if (latestSongs.includes(d.song)) {
                    return "rgba(255,255,255,0.95)"
                }

                let connected = false

                svg.selectAll("line").each(function (l) {
                    if ((
                        latestSongs.includes(l.source.song) &&
                        l.target.song === d.song
                    ) ||
                        (
                            latestSongs.includes(l.target.song) &&
                            l.source.song === d.song
                        )) {
                        connected = true
                    }
                })

                return connected
                    ? "rgba(255,255,255,0.82)"
                    : "rgba(255,255,255,0.04)"
            })

    }, [recommendations])

    return (
        // Fill all available space — parent controls the actual dimensions
        <div style={{ position: "absolute", inset: 0 }}>

            <style>{`
                @keyframes bgStarIn {
                    from { opacity: 0; }
                    to   { opacity: var(--peak, 0.4); }
                }
                @keyframes bgTwinkle {
                    from { opacity: var(--peak,   0.4); }
                    to   { opacity: var(--trough, 0.05); }
                }

                @keyframes pulse-ring {
                    0%   { transform: scale(1);   opacity: 0.45; }
                    100% { transform: scale(1.7); opacity: 0; }
                }
                .pulse-ring {
                    animation: pulse-ring 3s ease-out infinite;
                    transform-box: fill-box;
                    transform-origin: center;
                }
            `}</style>

            <svg
                ref={svgRef}
                style={{
                    width: "100%",
                    height: "100%",
                    background: "radial-gradient(ellipse at 50% 40%, #0b0b24 0%, #060610 55%, #020208 100%)"
                }}
            />

            <div style={{
                position: "absolute",
                bottom: "clamp(0.5rem, 1.5vw, 1.5rem)",
                right: "clamp(0.5rem, 1.5vw, 1.5rem)",
                display: "flex", flexDirection: "column", gap: "6px", zIndex: 10
            }}>
                {["+", "−"].map((sign, i) => (
                    <button
                        key={sign}
                        onClick={() => {
                            d3.select(svgRef.current)
                                .transition().duration(300)
                                .call(zoomRef.current.scaleBy, i === 0 ? 1.4 : 0.7)
                        }}
                        style={{
                            width: "34px", height: "34px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "8px",
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "1.1rem", cursor: "pointer", lineHeight: 1,
                            transition: "background 0.2s, color 0.2s",
                            backdropFilter: "blur(6px)"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                            e.currentTarget.style.color = "white"
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                            e.currentTarget.style.color = "rgba(255,255,255,0.6)"
                        }}
                    >{sign}</button>
                ))}
            </div>
        </div>
    )
}