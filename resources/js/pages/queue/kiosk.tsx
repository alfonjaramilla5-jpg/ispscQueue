import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CheckCircle2,
    MonitorPlay,
    Ticket,
    Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type Service = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    prefix: string;
};

type Window = {
    id: number;
    code: string;
    name: string;
    prefix: string;
};

type Office = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    services: Service[];
    windows: Window[];
};

type KioskProps = {
    issued_ticket: string | null;
    issued_ticket_id: number | null;
    offices: Office[];
};

type TicketStatus = {
    id: number;
    display_number: string;
    status: string;
    window: {
        code: string;
        name: string;
        office: { code: string; name: string } | null;
    } | null;
};

export default function QueueKiosk({
    issued_ticket,
    issued_ticket_id,
    offices,
}: KioskProps) {
    const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(
        offices[0]?.id ?? null,
    );
    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
        offices[0]?.services[0]?.id ?? null,
    );
    const [selectedWindowId, setSelectedWindowId] = useState<number | null>(
        offices[0]?.windows[0]?.id ?? null,
    );
    const [processing, setProcessing] = useState(false);
    const [ticketStatus, setTicketStatus] = useState<TicketStatus | null>(
        null,
    );
    const [alertsEnabled, setAlertsEnabled] = useState(false);
    const lastStatus = useRef<string | null>(null);
    const selectedOffice = offices.find(
        (office) => office.id === selectedOfficeId,
    );

    const chooseOffice = (office: Office) => {
        setSelectedOfficeId(office.id);
        setSelectedServiceId(office.services[0]?.id ?? null);
        setSelectedWindowId(office.windows[0]?.id ?? null);
    };

    const playCallTone = () => {
        if (!alertsEnabled || typeof window.AudioContext === 'undefined') {
            return;
        }

        const context = new window.AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.18,
            context.currentTime + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.45,
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.45);
        oscillator.addEventListener('ended', () => void context.close());
    };

    const enableAlerts = async () => {
        if (
            typeof window.Notification !== 'undefined' &&
            window.Notification.permission === 'default'
        ) {
            await window.Notification.requestPermission();
        }

        setAlertsEnabled(true);
    };

    useEffect(() => {
        if (!issued_ticket_id) {
            return;
        }

        let active = true;

        const refreshTicket = async () => {
            const response = await fetch(
                `/kiosk/tickets/${issued_ticket_id}/status`,
                {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                },
            );

            if (!active || !response.ok) {
                return;
            }

            const next = (await response.json()) as TicketStatus;
            const wasWaiting = !['called', 'serving'].includes(
                lastStatus.current ?? 'waiting',
            );
            const isBeingCalled = ['called', 'serving'].includes(next.status);

            setTicketStatus(next);

            if (wasWaiting && isBeingCalled) {
                if (
                    alertsEnabled &&
                    typeof window.Notification !== 'undefined' &&
                    window.Notification.permission === 'granted'
                ) {
                    new window.Notification('Your queue number is being called', {
                        body: `Please proceed to ${next.window?.name ?? 'the service counter'}.`,
                    });
                }

                playCallTone();
            }

            lastStatus.current = next.status;
        };

        void refreshTicket();
        const interval = window.setInterval(() => void refreshTicket(), 3000);

        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [alertsEnabled, issued_ticket_id]);

    const issueTicket = () => {
        if (!selectedOfficeId || !selectedWindowId) {
            return;
        }

        setProcessing(true);
        router.post(
            '/kiosk/tickets',
            {
                office_id: selectedOfficeId,
                queue_service_id: selectedServiceId,
                service_window_id: selectedWindowId,
            },
            { onFinish: () => setProcessing(false) },
        );
    };

    return (
        <>
            <Head title="Get a Campus Queue Ticket" />
            <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
                <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center">
                    <header className="text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-slate-950">
                            <Ticket className="size-7" />
                        </div>
                        <p className="mt-5 text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">
                            ISPSC Campus Services
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Get a queue ticket
                        </h1>
                        <p className="mx-auto mt-3 max-w-xl text-slate-400">
                            Choose an office, transaction, and service counter.
                            You do not need to create an account.
                        </p>
                    </header>

                    {issued_ticket ? (
                        <Card className="mx-auto mt-10 w-full max-w-xl border-slate-700 bg-slate-900 text-white">
                            <CardHeader className="text-center">
                                <Badge
                                    className="mx-auto"
                                    variant={
                                        ['called', 'serving'].includes(
                                            ticketStatus?.status ?? '',
                                        )
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {ticketStatus?.status === 'completed'
                                        ? 'Service completed'
                                        : ['called', 'serving'].includes(
                                                ticketStatus?.status ?? '',
                                            )
                                          ? 'Your number is being called'
                                          : 'Ticket issued'}
                                </Badge>
                                <CardTitle className="mt-4 text-6xl tracking-wider">
                                    {issued_ticket}
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    {ticketStatus?.status === 'completed'
                                        ? 'Thank you. Your transaction is complete.'
                                        : ['called', 'serving'].includes(
                                                ticketStatus?.status ?? '',
                                            )
                                          ? `Please proceed to ${ticketStatus?.window?.name ?? 'the service counter'}.`
                                          : `Please wait for your number at ${ticketStatus?.window?.office?.name ?? 'the campus service office'}.`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {['called', 'serving'].includes(
                                    ticketStatus?.status ?? '',
                                ) && (
                                    <div
                                        className="flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-emerald-100"
                                        role="alert"
                                    >
                                        <BellRing className="size-6 shrink-0" />
                                        <div>
                                            <p className="font-semibold">
                                                Please proceed now
                                            </p>
                                            <p className="text-sm text-emerald-100/80">
                                                Go to{' '}
                                                {ticketStatus?.window?.name ??
                                                    'the service counter'}.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {ticketStatus?.status === 'completed' && (
                                    <div className="flex items-center gap-3 rounded-xl border border-sky-400/40 bg-sky-400/10 p-4 text-sky-100">
                                        <CheckCircle2 className="size-6 shrink-0" />
                                        <p className="text-sm">
                                            Your ticket has been completed.
                                        </p>
                                    </div>
                                )}
                                {!alertsEnabled && (
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => void enableAlerts()}
                                    >
                                        <Volume2 />
                                        Enable call alerts
                                    </Button>
                                )}
                                <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    className="flex-1"
                                    onClick={() => router.visit('/kiosk')}
                                >
                                    Get another ticket
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    asChild
                                >
                                    <Link href="/queue/display">
                                        <MonitorPlay />
                                        View display
                                    </Link>
                                </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="mt-10 space-y-5">
                            <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {offices.map((office) => (
                                    <button
                                        key={office.id}
                                        type="button"
                                        className={`rounded-2xl border p-5 text-left transition ${
                                            selectedOfficeId === office.id
                                                ? 'border-white bg-white text-slate-950'
                                                : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                                        }`}
                                        onClick={() => chooseOffice(office)}
                                    >
                                        <span
                                            className="text-lg font-semibold"
                                        >
                                            {office.name}
                                        </span>
                                        <span
                                            className={`mt-2 block text-sm ${selectedOfficeId === office.id ? 'text-slate-600' : 'text-slate-400'}`}
                                        >
                                            {office.description}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {selectedOffice && (
                                <Card className="border-slate-700 bg-slate-900 text-white">
                                    <CardHeader>
                                        <CardTitle>{selectedOffice.name}</CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Select the transaction and counter you need.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <label className="text-sm font-medium">
                                            Transaction
                                            <select
                                                className="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                                                value={selectedServiceId ?? ''}
                                                onChange={(event) =>
                                                    setSelectedServiceId(
                                                        event.target.value
                                                            ? Number(event.target.value)
                                                            : null,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    General inquiry
                                                </option>
                                                {selectedOffice.services.map(
                                                    (service) => (
                                                        <option
                                                            key={service.id}
                                                            value={service.id}
                                                        >
                                                            {service.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                        <label className="text-sm font-medium">
                                            Service counter
                                            <select
                                                className="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                                                value={selectedWindowId ?? ''}
                                                onChange={(event) =>
                                                    setSelectedWindowId(
                                                        event.target.value
                                                            ? Number(event.target.value)
                                                            : null,
                                                    )
                                                }
                                            >
                                                {selectedOffice.windows.map(
                                                    (queueWindow) => (
                                                        <option
                                                            key={queueWindow.id}
                                                            value={queueWindow.id}
                                                        >
                                                            {queueWindow.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {!issued_ticket && (
                        <Button
                            className="mx-auto mt-8 min-w-56"
                            size="lg"
                            disabled={
                                !selectedOfficeId ||
                                !selectedWindowId ||
                                processing
                            }
                            onClick={issueTicket}
                        >
                            {processing ? 'Issuing ticket...' : 'Get ticket'}
                            <ArrowRight />
                        </Button>
                    )}
                </div>
            </main>
        </>
    );
}
