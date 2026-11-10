import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type Window = {
    id: number;
    code: string;
    name: string;
    office?: { id: number; name: string } | null;
    assigned_user_id: number | null;
    assigned_user: { id: number; name: string } | null;
};

type Service = {
    id: number;
    code: string;
    name: string;
    prefix: string;
    description: string | null;
    is_active: boolean;
};

type Office = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    services: Service[];
    windows: Window[];
};

type Staff = {
    id: number;
    name: string;
    email: string;
    role: string;
    office_id: number | null;
    office: { id: number; name: string } | null;
};

type SettingsProps = {
    offices: Office[];
    windows: Window[];
    staff: Staff[];
};

export default function QueueSettings({ offices, windows, staff }: SettingsProps) {
    const [assignments, setAssignments] = useState<Record<number, string>>(
        Object.fromEntries(
            windows.map((window) => [
                window.id,
                window.assigned_user_id?.toString() ?? '',
            ]),
        ),
    );
    const [roles, setRoles] = useState<Record<number, string>>(
        Object.fromEntries(staff.map((member) => [member.id, member.role])),
    );
    const [staffOffices, setStaffOffices] = useState<Record<number, string>>(
        Object.fromEntries(
            staff.map((member) => [
                member.id,
                member.office_id?.toString() ?? '',
            ]),
        ),
    );
    const [newOffice, setNewOffice] = useState({
        code: '',
        name: '',
        description: '',
    });
    const [newService, setNewService] = useState({
        office_id: offices[0]?.id.toString() ?? '',
        code: '',
        name: '',
        prefix: '',
    });
    const [newWindow, setNewWindow] = useState({
        office_id: offices[0]?.id.toString() ?? '',
        code: '',
        name: '',
    });

    const saveAssignment = (windowId: number) => {
        router.patch(
            `/queue/settings/windows/${windowId}`,
            { assigned_user_id: assignments[windowId] || null },
            { preserveScroll: true },
        );
    };

    const saveRole = (userId: number) => {
        router.patch(
            `/queue/settings/users/${userId}/role`,
            { role: roles[userId] },
            { preserveScroll: true },
        );
    };

    const saveOffice = (userId: number) => {
        router.patch(
            `/queue/settings/users/${userId}/office`,
            { office_id: staffOffices[userId] || null },
            { preserveScroll: true },
        );
    };

    const createOffice = () => {
        router.post('/queue/settings/offices', newOffice, {
            preserveScroll: true,
            onSuccess: () => setNewOffice({ code: '', name: '', description: '' }),
        });
    };

    const createService = () => {
        router.post('/queue/settings/services', newService, {
            preserveScroll: true,
            onSuccess: () =>
                setNewService((current) => ({
                    ...current,
                    code: '',
                    name: '',
                    prefix: '',
                })),
        });
    };

    const createWindow = () => {
        router.post('/queue/settings/windows', newWindow, {
            preserveScroll: true,
            onSuccess: () =>
                setNewWindow((current) => ({ ...current, code: '', name: '' })),
        });
    };

    return (
        <>
            <Head title="Queue Settings" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <Button variant="ghost" asChild className="mb-3 -ml-3">
                        <Link href="/queue">
                            <ArrowLeft />
                            Back to queue
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="size-4" />
                        Supervisor settings
                    </div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                        Assign queue windows
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Configure offices, services, counters, staff assignments,
                        and queue roles from one place.
                    </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add office</CardTitle>
                            <CardDescription>
                                Offices are configurable and can be added without code changes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                placeholder="Code, e.g. library"
                                value={newOffice.code}
                                onChange={(event) =>
                                    setNewOffice((current) => ({
                                        ...current,
                                        code: event.target.value,
                                    }))
                                }
                            />
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                placeholder="Office name"
                                value={newOffice.name}
                                onChange={(event) =>
                                    setNewOffice((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                            />
                            <textarea
                                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Description"
                                value={newOffice.description}
                                onChange={(event) =>
                                    setNewOffice((current) => ({
                                        ...current,
                                        description: event.target.value,
                                    }))
                                }
                            />
                            <Button className="w-full" onClick={createOffice}>
                                Create office
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Add service</CardTitle>
                            <CardDescription>
                                Define the transactions students can select.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={newService.office_id}
                                onChange={(event) =>
                                    setNewService((current) => ({
                                        ...current,
                                        office_id: event.target.value,
                                    }))
                                }
                            >
                                {offices.map((office) => (
                                    <option key={office.id} value={office.id}>
                                        {office.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                placeholder="Code, e.g. id-renewal"
                                value={newService.code}
                                onChange={(event) =>
                                    setNewService((current) => ({
                                        ...current,
                                        code: event.target.value,
                                    }))
                                }
                            />
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                placeholder="Service name"
                                value={newService.name}
                                onChange={(event) =>
                                    setNewService((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                            />
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm uppercase"
                                placeholder="Prefix, e.g. ID"
                                value={newService.prefix}
                                onChange={(event) =>
                                    setNewService((current) => ({
                                        ...current,
                                        prefix: event.target.value,
                                    }))
                                }
                            />
                            <Button className="w-full" onClick={createService}>
                                Create service
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Add counter</CardTitle>
                            <CardDescription>
                                Add a physical queue counter to an office.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                value={newWindow.office_id}
                                onChange={(event) =>
                                    setNewWindow((current) => ({
                                        ...current,
                                        office_id: event.target.value,
                                    }))
                                }
                            >
                                {offices.map((office) => (
                                    <option key={office.id} value={office.id}>
                                        {office.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                placeholder="Code, e.g. library-1"
                                value={newWindow.code}
                                onChange={(event) =>
                                    setNewWindow((current) => ({
                                        ...current,
                                        code: event.target.value,
                                    }))
                                }
                            />
                            <input
                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                placeholder="Counter name"
                                value={newWindow.name}
                                onChange={(event) =>
                                    setNewWindow((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                            />
                            <Button className="w-full" onClick={createWindow}>
                                Create counter
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <h2 className="mb-3 text-lg font-semibold">Campus offices</h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {offices.map((office) => (
                            <Card key={office.id}>
                                <CardHeader>
                                    <CardTitle>{office.name}</CardTitle>
                                    <CardDescription>
                                        {office.description || office.code}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <div className="text-sm font-medium">Services</div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {office.services.map((service) => (
                                                <span
                                                    key={service.id}
                                                    className="rounded-md border px-2 py-1 text-xs"
                                                >
                                                    {service.name} ({service.prefix})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">Counters</div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {office.windows.map((window) => (
                                                <span
                                                    key={window.id}
                                                    className="rounded-md border px-2 py-1 text-xs"
                                                >
                                                    {window.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div className="grid max-w-3xl gap-4">
                    {windows.map((window) => (
                        <Card key={window.id}>
                            <CardHeader>
                                <CardTitle>{window.name}</CardTitle>
                                <CardDescription>
                                    {window.office?.name ?? 'Unassigned office'} · {window.code}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <label className="flex-1 text-sm font-medium">
                                    Staff member
                                    <select
                                        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                        value={assignments[window.id] ?? ''}
                                        onChange={(event) =>
                                            setAssignments((current) => ({
                                                ...current,
                                                [window.id]: event.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">
                                            Any staff in this office
                                        </option>
                                        {staff.map((member) => (
                                            <option
                                                key={member.id}
                                                value={member.id}
                                            >
                                                {member.name} · {member.role}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <Button
                                    onClick={() => saveAssignment(window.id)}
                                >
                                    Save assignment
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="max-w-3xl">
                    <h2 className="mb-3 text-lg font-semibold">User roles</h2>
                    <Card>
                        <CardContent className="divide-y p-0">
                            {staff.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {member.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {member.email}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <select
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            value={staffOffices[member.id] ?? ''}
                                            onChange={(event) =>
                                                setStaffOffices((current) => ({
                                                    ...current,
                                                    [member.id]: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">All offices</option>
                                            {offices.map((office) => (
                                                <option
                                                    key={office.id}
                                                    value={office.id}
                                                >
                                                    {office.name}
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => saveOffice(member.id)}
                                        >
                                            Save office
                                        </Button>
                                        <select
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            value={
                                                roles[member.id] ?? member.role
                                            }
                                            onChange={(event) =>
                                                setRoles((current) => ({
                                                    ...current,
                                                    [member.id]:
                                                        event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="staff">Staff</option>
                                            <option value="supervisor">
                                                Supervisor
                                            </option>
                                            <option value="admin">
                                                Administrator
                                            </option>
                                        </select>
                                        <Button
                                            size="sm"
                                            onClick={() => saveRole(member.id)}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

QueueSettings.layout = {
    breadcrumbs: [
        {
            title: 'Queue Settings',
            href: '/queue/settings',
        },
    ],
};
