// This page is kept as a compatibility alias for older links.
export { default } from './public-display';

/*
import { Head } from '@inertiajs/react';
import { Clock3, MonitorPlay } from 'lucide-react';
import { useEffect, useState } from 'react';

type Ticket = {
    id: number;
    display_number: string;
    status: string;
    service: { code: string; name: string } | null;
    window: { code: string; name: string } | null;
};

type WaitingCount = {
    code: string;
    name: string;
    waiting_count: number;
};

type DisplayProps = {
    date: string;
    current_tickets: Ticket[];
    recently_completed: Ticket[];
    waiting_counts: WaitingCount[];
};

export default function QueueDisplay(initial: DisplayProps) {
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
                                ISPSC Registrar
                            </div>
                            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                                Now serving
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock3 className="size-4" />
                            {snapshot.date}
                        </div>
                    </header>

                    <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {snapshot.current_tickets.length === 0 ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-400 md:col-span-2 xl:col-span-3">
                                Waiting for the next ticket to be called.
                            </div>
                        ) : (
                            snapshot.current_tickets.map((ticket) => (
                                <article
                                    key={ticket.id}
                                    className="rounded-2xl bg-white p-6 text-slate-950 shadow-xl"
                                >
                                    <div className="text-sm font-medium tracking-[0.2em] text-slate-500 uppercase">
                                        {ticket.service?.name}
                                    </div>
                                    <div className="mt-3 text-6xl font-bold tracking-wide">
                                        {ticket.display_number}
                                    </div>
                                    <div className="mt-4 text-xl font-medium text-slate-600">
                                        {ticket.window?.name}
                                    </div>
                                </article>
                            ))
                        )}
                    </section>

                    <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
                        <div>
                            <h2 className="text-lg font-semibold">
                                People waiting
                            </h2>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {snapshot.waiting_counts.map((service) => (
                                    <div
                                        key={service.code}
                                        className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                                    >
                                        <div className="text-sm text-slate-400">
                                            {service.name}
                                        </div>
                                        <div className="mt-1 text-3xl font-semibold">
                                            {service.waiting_count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold">
                                Recently completed
                            </h2>
                            <div className="mt-3 flex flex-wrap gap-3">
                                {snapshot.recently_completed.length === 0 ? (
                                    <span className="text-sm text-slate-400">
                                        No completed tickets yet.
                                    </span>
                                ) : (
                                    snapshot.recently_completed.map(
                                        (ticket) => (
                                            <span
                                                key={ticket.id}
                                                className="rounded-lg bg-emerald-900/60 px-4 py-2 text-lg font-semibold text-emerald-100"
                                            >
                                                {ticket.display_number}
                                            </span>
                                        ),
                                    )
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
*/
