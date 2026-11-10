// This page is kept as a compatibility alias for older links.
export { default } from './workspace';

/*
import { Head, Link, router } from '@inertiajs/react';
import {
    ExternalLink,
    ListOrdered,
    Megaphone,
    Play,
    SkipForward,
    TicketCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

type Service = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    prefix: string;
    waiting_count: number;
    serving_count: number;
    completed_count: number;
};

type Ticket = {
    id: number;
    display_number: string;
    status: string;
    student_number?: string | null;
    service: { code: string; name: string } | null;
};

type ServiceWindow = {
    id: number;
    code: string;
    name: string;
    assigned_user: { id: number; name: string } | null;
    current_ticket: Ticket | null;
};

type QueueProps = {
    date: string;
    can_manage: boolean;
    services: Service[];
    windows: ServiceWindow[];
    recent_tickets: Ticket[];
};

const statusLabels: Record<string, string> = {
    called: 'Called',
    serving: 'Serving',
    completed: 'Completed',
    skipped: 'Skipped',
};

export default function QueueIndex({
    date,
    can_manage,
    services,
    windows,
    recent_tickets,
}: QueueProps) {
    const [selectedServices, setSelectedServices] = useState<
        Record<number, number>
    >({});

    useEffect(() => {
        setSelectedServices((current) => {
            const next = { ...current };

            windows.forEach((window) => {
                if (!next[window.id] && services[0]) {
                    next[window.id] = services[0].id;
                }
            });

            return next;
        });
    }, [services, windows]);

    const issueTicket = (serviceId: number) => {
        router.post(
            '/queue/tickets',
            { queue_service_id: serviceId },
            { preserveScroll: true },
        );
    };

    const callNext = (windowId: number) => {
        const serviceId = selectedServices[windowId];

        if (!serviceId) {
            return;
        }

        router.post(
            '/queue/call-next',
            { queue_service_id: serviceId, service_window_id: windowId },
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
            <Head title="Registrar Queue" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ListOrdered className="size-4" />
                            Registrar operations
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Queue workspace
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Issue tickets, call the next student, and keep each
                            service window moving.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={dashboard()}>Dashboard</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <a
                                href="/queue/display"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink />
                                Public display
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

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {services.map((service) => (
                        <Card key={service.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>{service.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {service.description}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline">
                                        {service.prefix}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-md bg-muted p-2">
                                        <div className="text-lg font-semibold">
                                            {service.waiting_count}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Waiting
                                        </div>
                                    </div>
                                    <div className="rounded-md bg-muted p-2">
                                        <div className="text-lg font-semibold">
                                            {service.serving_count}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Active
                                        </div>
                                    </div>
                                    <div className="rounded-md bg-muted p-2">
                                        <div className="text-lg font-semibold">
                                            {service.completed_count}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Done
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => issueTicket(service.id)}
                                >
                                    <TicketCheck />
                                    Issue next ticket
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <section>
                    <div className="mb-3 flex items-center gap-2">
                        <Megaphone className="size-5" />
                        <h2 className="text-lg font-semibold">
                            Service windows
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {date}
                        </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                        {windows.map((window) => (
                            <Card key={window.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        {window.name}
                                        <Badge
                                            variant={
                                                window.current_ticket
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {window.current_ticket
                                                ? 'Active'
                                                : 'Available'}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {window.code}
                                        {window.assigned_user &&
                                            ` · ${window.assigned_user.name}`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {window.current_ticket ? (
                                        <div className="rounded-lg border bg-muted/40 p-4">
                                            <div className="text-3xl font-semibold tracking-wide">
                                                {
                                                    window.current_ticket
                                                        .display_number
                                                }
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {
                                                    window.current_ticket
                                                        .service?.name
                                                }{' '}
                                                ·{' '}
                                                {statusLabels[
                                                    window.current_ticket.status
                                                ] ??
                                                    window.current_ticket
                                                        .status}
                                            </div>
                                            {window.current_ticket
                                                .student_number && (
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    Student:{' '}
                                                    {
                                                        window.current_ticket
                                                            .student_number
                                                    }
                                                </div>
                                            )}
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
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <label
                                                className="block text-sm font-medium"
                                                htmlFor={`service-${window.id}`}
                                            >
                                                Service to call
                                            </label>
                                            <select
                                                id={`service-${window.id}`}
                                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                value={
                                                    selectedServices[
                                                        window.id
                                                    ] ?? ''
                                                }
                                                onChange={(event) =>
                                                    setSelectedServices(
                                                        (current) => ({
                                                            ...current,
                                                            [window.id]: Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        }),
                                                    )
                                                }
                                            >
                                                {services.map((service) => (
                                                    <option
                                                        key={service.id}
                                                        value={service.id}
                                                    >
                                                        {service.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <Button
                                                className="w-full"
                                                onClick={() =>
                                                    callNext(window.id)
                                                }
                                            >
                                                <Megaphone />
                                                Call next
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent activity</CardTitle>
                        <CardDescription>
                            Completed and skipped tickets for today.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recent_tickets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No completed tickets yet.
                            </p>
                        ) : (
                            <div className="divide-y rounded-md border">
                                {recent_tickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="flex items-center justify-between gap-4 p-3 text-sm"
                                    >
                                        <div>
                                            <span className="font-semibold">
                                                {ticket.display_number}
                                            </span>
                                            <span className="ml-3 text-muted-foreground">
                                                {ticket.service?.name}
                                            </span>
                                        </div>
                                        <Badge
                                            variant={
                                                ticket.status === 'completed'
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {statusLabels[ticket.status] ??
                                                ticket.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

QueueIndex.layout = {
    breadcrumbs: [
        {
            title: 'Registrar Queue',
            href: '/queue',
        },
    ],
};
*/
