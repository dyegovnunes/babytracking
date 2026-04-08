import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  imageFile: File
  onConfirm: (croppedBlob: Blob) => void
  onClose: () => void
}

export default function ImageCropModal({ imageFile, onConfirm, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // Pinch zoom state
  const lastPinchDist = useRef<number | null>(null)
  const activeTouches = useRef<Map<number, { x: number; y: number }>>(new Map())

  const CANVAS_SIZE = 280
  const CIRCLE_RADIUS = 120

  // Load image
  useEffect(() => {
    setLoadError(false)
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        setImg(image)
        const minDim = Math.min(image.width, image.height)
        const initialScale = (CIRCLE_RADIUS * 2) / minDim
        setScale(initialScale)
        setOffset({ x: 0, y: 0 })
      }
      image.onerror = () => setLoadError(true)
      image.src = reader.result as string
    }
    reader.onerror = () => setLoadError(true)
    reader.readAsDataURL(imageFile)
  }, [imageFile])

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // 1. Draw the full image
    const w = img.width * scale
    const h = img.height * scale
    const x = cx - w / 2 + offset.x
    const y = cy - h / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)

    // 2. Draw dark overlay ONLY outside the circle
    ctx.save()
    // Create a path: full rectangle with circle hole
    ctx.beginPath()
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2, true) // counterclockwise = hole
    ctx.closePath()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fill()
    ctx.restore()

    // 3. Draw circle border
    ctx.strokeStyle = 'rgba(183, 159, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2)
    ctx.stroke()
  }, [img, scale, offset])

  useEffect(() => {
    draw()
  }, [draw])

  // Touch handlers for pinch-to-zoom + drag
  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      activeTouches.current.set(t.identifier, { x: t.clientX, y: t.clientY })
    }

    if (activeTouches.current.size === 1) {
      const t = e.touches[0]
      setDragging(true)
      setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y })
    } else if (activeTouches.current.size === 2) {
      setDragging(false)
      const touches = Array.from(activeTouches.current.values())
      lastPinchDist.current = Math.hypot(
        touches[1].x - touches[0].x,
        touches[1].y - touches[0].y,
      )
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      activeTouches.current.set(t.identifier, { x: t.clientX, y: t.clientY })
    }

    if (e.touches.length === 1 && dragging) {
      // Single finger drag
      const t = e.touches[0]
      setOffset({
        x: t.clientX - dragStart.x,
        y: t.clientY - dragStart.y,
      })
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      // Pinch zoom
      const touches = Array.from(activeTouches.current.values())
      const dist = Math.hypot(
        touches[1].x - touches[0].x,
        touches[1].y - touches[0].y,
      )
      const delta = (dist - lastPinchDist.current) * 0.005
      setScale((s) => Math.max(0.1, Math.min(5, s + delta)))
      lastPinchDist.current = dist
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      activeTouches.current.delete(e.changedTouches[i].identifier)
    }
    if (activeTouches.current.size < 2) {
      lastPinchDist.current = null
    }
    if (activeTouches.current.size === 0) {
      setDragging(false)
    }
  }

  // Mouse/pointer fallback for drag
  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return // handled by touch events
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    if (!dragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType === 'touch') return
    setDragging(false)
  }

  function handleZoom(delta: number) {
    setScale((s) => Math.max(0.1, Math.min(5, s + delta)))
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    handleZoom(e.deltaY > 0 ? -0.05 : 0.05)
  }

  async function handleConfirm() {
    if (!img) return
    setProcessing(true)

    const outputSize = 512
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = outputSize
    outputCanvas.height = outputSize
    const ctx = outputCanvas.getContext('2d')
    if (!ctx) return

    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2
    const w = img.width * scale
    const h = img.height * scale
    const imgX = cx - w / 2 + offset.x
    const imgY = cy - h / 2 + offset.y

    const scaleOut = outputSize / (CIRCLE_RADIUS * 2)
    const srcX = (imgX - (cx - CIRCLE_RADIUS)) * scaleOut
    const srcY = (imgY - (cy - CIRCLE_RADIUS)) * scaleOut

    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.clip()

    ctx.drawImage(img, srcX, srcY, w * scaleOut, h * scaleOut)

    outputCanvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob)
        setProcessing(false)
      },
      'image/jpeg',
      0.85,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-container-highest rounded-3xl p-5 max-w-sm w-full mx-4 animate-slide-up">
        <h2 className="font-headline text-lg font-bold text-on-surface text-center mb-4">
          Ajustar foto
        </h2>

        {loadError ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="material-symbols-outlined text-error text-3xl">broken_image</span>
            <p className="font-label text-sm text-on-surface-variant text-center">
              Não foi possível carregar a imagem.<br />Tente outra foto.
            </p>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="rounded-2xl cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            />
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            onClick={() => handleZoom(-0.1)}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              remove
            </span>
          </button>
          <div className="w-24 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((scale / 3) * 100, 100)}%` }}
            />
          </div>
          <button
            onClick={() => handleZoom(0.1)}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center active:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              add
            </span>
          </button>
        </div>

        <p className="text-center font-label text-[10px] text-on-surface-variant mb-4">
          Arraste para mover, use pinça para zoom
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || loadError}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-semibold text-sm disabled:opacity-50"
          >
            {processing ? (
              <span className="material-symbols-outlined animate-spin text-lg align-middle">
                progress_activity
              </span>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
