import { Head } from '@inertiajs/react';
import { Clock3, MonitorPlay } from 'lucide-react';
import { useEffect, useState } from 'react';

type Ticket = {
    id: number;
    display_number: string;
    status: string;
    service: { code: string; name: string; prefix: string } | null;
};

type WindowQueue = {
    id: number;
    code: string;
    name: string;
    prefix: string;
    office: { id: number; code: string; name: string } | null;
    current_ticket: Ticket | null;
    waiting_tickets: Ticket[];
};

type DisplayProps = {
    date: string;
    windows: WindowQueue[];
};

export default function PublicQueueDisplay(initial: DisplayProps) {
    const [snapshot, setSnapshot] = useState(initial);

    useEffect(() => {
        const refresh = async () => {
            const response = await fetch('/queue/display/data', {
                headers: { Accept: 'application/json' },
            });

            if (response.ok) {
                setSnapshot(await response.json());
            }
        };

        const interval = window.setInterval(refresh, 5000);

        return () => window.clearInterval(interval);
    }, []);

    return (
        <>
            <Head title="Queue Display" />
            <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-12">
                <div className="mx-auto max-w-7xl">
                    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <MonitorPlay className="size-4" />
                                ISPSC Campus Queue Display
                            </div>
                            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                                Window queues
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock3 className="size-4" />
                            {snapshot.date}
                        </div>
                    </header>

                    <section className="mt-8 grid gap-5 md:grid-cols-3">
                        {snapshot.windows.map((window) => (
                            <article
                                key={window.id}
                                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm text-slate-400">
                                            {window.office?.name ?? 'Campus office'}
                                        </div>
                                        <h2 className="text-2xl font-semibold">
                                            {window.name}
                                        </h2>
                                        <div className="text-xs text-slate-500">
                                            {window.prefix}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-300">
                                        {window.waiting_tickets.length} waiting
                                    </div>
                                </div>

                                <div className="mt-5 rounded-xl bg-white p-5 text-slate-950">
                                    <div className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
                                        Now serving
                                    </div>
                                    <div className="mt-2 text-5xl font-bold tracking-wide">
                                        {window.current_ticket
                                            ?.display_number ?? '—'}
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <div className="text-sm font-medium text-slate-400">
                                        Waiting numbers
                                    </div>
                                    {window.waiting_tickets.length === 0 ? (
                                        <p className="mt-2 text-sm text-slate-500">
                                            No students waiting.
                                        </p>
                                    ) : (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {window.waiting_tickets.map(
                                                (ticket) => (
                                                    <span
                                                        key={ticket.id}
                                                        className="rounded-lg bg-slate-800 px-3 py-2 text-lg font-semibold text-slate-100"
                                                    >
                                                        {ticket.display_number}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </section>
                </div>
            </main>
        </>
    );
}
