import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[1.55rem] border border-border/70 bg-card/92 text-card-foreground shadow-[0_18px_42px_rgba(43,117,181,0.09)] backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 p-6', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-xl font-semibold tracking-tight', className)} {...props} />
  )
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm leading-6 text-muted-foreground', className)} {...props} />
  )
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}
