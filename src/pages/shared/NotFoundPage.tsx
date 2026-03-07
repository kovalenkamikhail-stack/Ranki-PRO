import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="gap-5">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-primary/12 text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Not Found
          </p>
          <CardTitle className="text-3xl">That route is not part of Ranki.</CardTitle>
          <CardDescription className="text-base">
            The installed shell is still healthy. Jump back to a known screen
            and keep working offline.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">Back to decks</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/settings">Open settings</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
