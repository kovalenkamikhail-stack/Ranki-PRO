import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[1.1rem] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(43,117,181,0.22)] hover:-translate-y-0.5 hover:bg-primary/92',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[0_10px_26px_rgba(43,117,181,0.08)] hover:bg-secondary/86',
        outline:
          'border border-border/70 bg-background/82 text-foreground hover:border-primary/20 hover:bg-accent/72 hover:text-accent-foreground',
        ghost: 'text-muted-foreground hover:bg-accent/72 hover:text-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3.5',
        lg: 'h-11 px-6 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
