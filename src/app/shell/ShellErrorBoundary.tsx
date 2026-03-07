import { AlertTriangle } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { ShellFrame } from '@/app/shell/ShellFrame'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ShellErrorBoundary() {
  const error = useRouteError()

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Route unavailable'

  const description = isRouteErrorResponse(error)
    ? 'The requested route could not be resolved. The app shell is still intact, and you can return to a known screen.'
    : 'Something interrupted the current route. Ranki kept the shell loaded so you can recover without leaving the app frame.'

  return (
    <ShellFrame>
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="gap-5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Route Boundary
            </p>
            <CardTitle className="text-3xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
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
    </ShellFrame>
  )
}
