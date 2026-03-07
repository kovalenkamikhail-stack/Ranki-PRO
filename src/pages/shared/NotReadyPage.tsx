import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface NotReadyPageProps {
  eyebrow: string
  title: string
  description: string
  nextSlice: string
}

export function NotReadyPage({
  eyebrow,
  title,
  description,
  nextSlice,
}: NotReadyPageProps) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="gap-5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-primary/12 text-primary">
          <Construction className="h-7 w-7" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
          <p className="text-sm font-medium text-muted-foreground">Next slice</p>
          <p className="mt-2 text-base font-medium">{nextSlice}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decks
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings">Inspect seeded settings</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
