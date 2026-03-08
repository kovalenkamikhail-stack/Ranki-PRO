import { useEffect, useRef } from 'react'

interface CardBackImageProps {
  blob: Blob
  alt: string
  className?: string
}

export function CardBackImage({
  blob,
  alt,
  className,
}: CardBackImageProps) {
  const imageElementRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const imageElement = imageElementRef.current

    if (!imageElement) {
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    imageElement.src = objectUrl

    return () => {
      imageElement.removeAttribute('src')
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return <img ref={imageElementRef} alt={alt} className={className} />
}
