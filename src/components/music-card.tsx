'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from '../app/(home)/stores/config-store'
import { CARD_SPACING } from '@/consts'
import MusicSVG from '@/svgs/music.svg'
import PlaySVG from '@/svgs/play.svg'
import { HomeDraggableLayer } from '../app/(home)/home-draggable-layer'
import { Pause } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import AudioVisualizer from '@/components/audio-visualizer'

const MUSIC_FILES = ['/music/close-to-you.mp3']

export default function MusicCard() {
	const pathname = usePathname()
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.musicCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const calendarCardStyles = cardStyles.calendarCard

	const [isPlaying, setIsPlaying] = useState(false)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [progress, setProgress] = useState(0)
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const audioContextRef = useRef<AudioContext | null>(null)
	const currentIndexRef = useRef(0)
	const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

	const isHomePage = pathname === '/'

	const position = useMemo(() => {
		// If not on home page, always position at bottom-right corner when playing
		if (!isHomePage) {
			return {
				x: center.width - styles.width - 16,
				y: center.height - styles.height - 16
			}
		}

		// Default position on home page
		return {
			x: styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2 - styles.offset,
			y: styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING
		}
	}, [isPlaying, isHomePage, center, styles, hiCardStyles, clockCardStyles, calendarCardStyles])

	const { x, y } = position

	// Initialize audio element
	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
		}

		const audio = audioRef.current

		const updateProgress = () => {
			if (audio.duration) {
				setProgress((audio.currentTime / audio.duration) * 100)
			}
		}

		const handleEnded = () => {
			const nextIndex = (currentIndexRef.current + 1) % MUSIC_FILES.length
			currentIndexRef.current = nextIndex
			setCurrentIndex(nextIndex)
			setProgress(0)
		}

		const handleTimeUpdate = () => {
			updateProgress()
		}

		const handleLoadedMetadata = () => {
			updateProgress()
		}

		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('ended', handleEnded)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('ended', handleEnded)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
		}
	}, [])

	// Handle currentIndex change - load new audio
	useEffect(() => {
		currentIndexRef.current = currentIndex
		if (audioRef.current) {
			const wasPlaying = !audioRef.current.paused
			audioRef.current.pause()
			audioRef.current.src = MUSIC_FILES[currentIndex]
			audioRef.current.loop = false
			setProgress(0)

			if (wasPlaying) {
				audioRef.current.play().catch(console.error)
			}
		}
	}, [currentIndex])

	// Handle play/pause state change
	useEffect(() => {
		if (!audioRef.current) return

		if (isPlaying) {
			if (!audioContextRef.current) {
				const ctx = new AudioContext()
				const analyser = ctx.createAnalyser()
				analyser.fftSize = 256
				const source = ctx.createMediaElementSource(audioRef.current)
				source.connect(analyser)
				analyser.connect(ctx.destination)
				audioContextRef.current = ctx
				setAnalyserNode(analyser)
			}
			if (audioContextRef.current.state === 'suspended') {
				audioContextRef.current.resume()
			}
			audioRef.current.play().catch(console.error)
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current.src = ''
			}
			if (audioContextRef.current) {
				audioContextRef.current.close()
				audioContextRef.current = null
			}
		}
	}, [])

	const togglePlayPause = () => {
		setIsPlaying(!isPlaying)
	}

	// Hide component if not on home page and not playing
	if (!isHomePage && !isPlaying) {
		return null
	}

	const cardBody = (
		<>
			{siteContent.enableChristmas && (
				<>
					<img
						src='/images/christmas/snow-10.webp'
						alt='Christmas decoration'
						className='pointer-events-none absolute'
						style={{ width: 120, left: -8, top: -12, opacity: 0.8 }}
					/>
					<img
						src='/images/christmas/snow-11.webp'
						alt='Christmas decoration'
						className='pointer-events-none absolute'
						style={{ width: 80, right: -10, top: -12, opacity: 0.8 }}
					/>
				</>
			)}

			<MusicSVG className='h-8 w-8' />

			<div className='flex-1'>
				<div className='text-secondary text-sm'>TEST ME</div>

				<div className='mt-1 h-2 rounded-full bg-white/60'>
					<div className='bg-linear h-full rounded-full transition-all duration-300' style={{ width: `${progress}%` }} />
				</div>
			</div>

			<button onClick={togglePlayPause} className='flex h-10 w-10 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80'>
				{isPlaying ? <Pause className='text-brand h-4 w-4' /> : <PlaySVG className='text-brand ml-1 h-4 w-4' />}
			</button>
		</>
	)

	if (isHomePage) {
		return (
			<HomeDraggableLayer cardKey='musicCard' x={x} y={y} width={styles.width} height={styles.height}>
				<motion.div
					animate={isPlaying ? { scale: [1, 1.03, 1] } : { scale: 1 }}
					transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
					style={{ position: 'absolute', left: x, top: y, width: styles.width, height: styles.height }}
				>
					<AudioVisualizer
						cardWidth={styles.width}
						cardHeight={styles.height}
						x={0}
						y={0}
						analyser={analyserNode}
						isPlaying={isPlaying}
					/>
					<Card order={styles.order} width={styles.width} height={styles.height} x={0.5} y={0.5} className='flex items-center gap-3'>
						{cardBody}
					</Card>
				</motion.div>
			</HomeDraggableLayer>
		)
	}

	return (
		<HomeDraggableLayer cardKey='musicCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex items-center gap-3 fixed'>
				{cardBody}
			</Card>
		</HomeDraggableLayer>
	)
}
