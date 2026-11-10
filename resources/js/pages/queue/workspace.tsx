import { Head, Link, router } from '@inertiajs/react';
import {
    ExternalLink,
    ListOrdered,
    Megaphone,
    Play,
    SkipForward,
    TicketCheck,
    Undo2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type Ticket = {
    id: number;
    display_number: string;
    status: string;
};

type QueueWindow = {
    id: number;
    code: string;
    name: string;
    prefix: string;
    office: { id: number; code: string; name: string } | null;
    assigned_user: { id: number; name: string } | null;
    can_operate: boolean;
    current_ticket: Ticket | null;
    waiting_tickets: Ticket[];
    skipped_tickets: Ticket[];
};

type QueueProps = {
    date: string;
    can_manage: boolean;
    windows: QueueWindow[];
    recent_tickets: Ticket[];
};

const statusLabels: Record<string, string> = {
    called: 'Called',
    serving: 'Serving',
};

export default function QueueWorkspace({
    date,
    can_manage,
    windows,
    recent_tickets,
}: QueueProps) {
    const callNext = (windowId: number) => {
        router.post(
            '/queue/call-next',
            { service_window_id: windowId },
            { preserveScroll: true },
        );
    };

    const updateStatus = (ticketId: number, status: string) => {
        router.patch(
            `/queue/tickets/${ticketId}/status`,
            { status },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Campus Queue Workspace" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ListOrdered className="size-4" />
                            Campus queue operations
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Office queues
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Call and manage the separate waiting line for each
                            campus office and service counter.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href="/queue/display"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink />
                                TV display
                            </a>
                        </Button>
                        {can_manage && (
                            <Button variant="outline" asChild>
                                <Link href="/queue/settings">
                                    Queue settings
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {windows.map((window) => (
                        <Card key={window.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>
                                        <span className="block text-xs font-normal text-muted-foreground">
                                            {window.office?.name ?? 'Unassigned office'}
                                        </span>
                                        {window.name}
                                    </span>
                                    <Badge variant="outline">
                                        {window.prefix}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    {window.assigned_user
                                        ? `Assigned to ${window.assigned_user.name}`
                                        : 'Available to queue staff'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {window.current_ticket ? (
                                    <div className="rounded-lg border bg-muted/40 p-4">
                                        <div className="text-xs font-medium text-muted-foreground uppercase">
                                            Now serving
                                        </div>
                                        <div className="mt-1 text-4xl font-semibold tracking-wide">
                                            {
                                                window.current_ticket
                                                    .display_number
                                            }
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {statusLabels[
                                                window.current_ticket.status
                                            ] ?? window.current_ticket.status}
                                        </div>
                                        {window.can_operate && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {window.current_ticket
                                                    .status === 'called' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            updateStatus(
                                                                window
                                                                    .current_ticket!
                                                                    .id,
                                                                'serving',
                                                            )
                                                        }
                                                    >
                                                        <Play />
                                                        Start serving
                                                    </Button>
                                                )}
                                                {window.current_ticket
                                                    .status === 'serving' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() =>
                                                            updateStatus(
                                                                window
                                                                    .current_ticket!
                                                                    .id,
                                                                'completed',
                                                            )
                                                        }
                                                    >
                                                        <TicketCheck />
                                                        Complete
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        updateStatus(
                                                            window
                                                                .current_ticket!
                                                                .id,
                                                            'skipped',
                                                        )
                                                    }
                                                >
                                                    <SkipForward />
                                                    Skip
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                        No ticket is currently being served.
                                    </div>
                                )}

                                <div>
                                    <div className="mb-2 flex items-center justify-between text-sm font-medium">
                                        <span>Waiting</span>
                                        <Badge variant="secondary">
                                            {window.waiting_tickets.length}
                                        </Badge>
                                    </div>
                                    {window.waiting_tickets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No students waiting.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {window.waiting_tickets.map(
                                                (ticket) => (
                                                    <span
                                                        key={ticket.id}
                                                        className="rounded-md border px-2 py-1 text-sm font-medium"
                                                    >
                                                        {ticket.display_number}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                {window.skipped_tickets.length > 0 && (
                                    <div className="border-t pt-4">
                                        <div className="mb-2 flex items-center justify-between text-sm font-medium">
                                            <span>Skipped numbers</span>
                                            <Badge variant="outline">
                                                {window.skipped_tickets.length}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {window.skipped_tickets.map(
                                                (ticket) => (
                                                    <div
                                                        key={ticket.id}
                                                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                                                    >
                                                        <span className="text-sm font-medium">
                                                            {
                                                                ticket.display_number
                                                            }
                                                        </span>
                                                        {window.can_operate && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    updateStatus(
                                                                        ticket.id,
                                                                        'waiting',
                                                                    )
                                                                }
                                                            >
                                                                <Undo2 />
                                                                Recall
                                                            </Button>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full"
                                    disabled={
                                        !window.can_operate ||
                                        Boolean(window.current_ticket) ||
                                        window.waiting_tickets.length === 0
                                    }
                                    onClick={() => callNext(window.id)}
                                >
                                    <Megaphone />
                                    Call next
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Completed today</CardTitle>
                        <CardDescription>
                            Completed queue numbers for {date}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recent_tickets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No completed tickets yet.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {recent_tickets.map((ticket) => (
                                    <Badge key={ticket.id} variant="secondary">
                                        {ticket.display_number}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

QueueWorkspace.layout = {
    breadcrumbs: [
        {
            title: 'Registrar Queue',
            href: '/queue',
        },
    ],
};
