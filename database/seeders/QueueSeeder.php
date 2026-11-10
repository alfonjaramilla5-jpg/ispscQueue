<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\QueueService;
use App\Models\ServiceWindow;
use Illuminate\Database\Seeder;

class QueueSeeder extends Seeder
{
    /**
     * Seed the campus offices, services, and initial queue windows.
     */
    public function run(): void
    {
        $offices = collect([
            [
                'code' => 'registrar',
                'name' => "Registrar's Office",
                'description' => 'Academic records, certificates, transcripts, and enrollment transactions.',
                'sort_order' => 1,
            ],
            [
                'code' => 'cashier',
                'name' => "Cashier's Office",
                'description' => 'Tuition, school fees, payment verification, and financial transactions.',
                'sort_order' => 2,
            ],
            [
                'code' => 'admissions',
                'name' => 'Admissions Office',
                'description' => 'Student applications, admission requirements, and enrollment assistance.',
                'sort_order' => 3,
            ],
            [
                'code' => 'guidance',
                'name' => 'Guidance Office',
                'description' => 'Counseling appointments, student assistance, and guidance inquiries.',
                'sort_order' => 4,
            ],
            [
                'code' => 'it',
                'name' => 'IT Office',
                'description' => 'Student account assistance, technical support, and school system inquiries.',
                'sort_order' => 5,
            ],
        ])->mapWithKeys(function (array $office): array {
            $record = Office::updateOrCreate(
                ['code' => $office['code']],
                [...$office, 'is_active' => true],
            );

            return [$record->code => $record];
        });

        $services = [
            'registrar' => [
                ['code' => 'certificates', 'name' => 'Certificates and certifications', 'prefix' => 'CERT'],
                ['code' => 'transcripts', 'name' => 'Transcript requests', 'prefix' => 'TOR'],
                ['code' => 'enrollment', 'name' => 'Enrollment transactions', 'prefix' => 'ENR'],
            ],
            'cashier' => [
                ['code' => 'tuition-payments', 'name' => 'Tuition and school fee payments', 'prefix' => 'PAY'],
                ['code' => 'payment-verification', 'name' => 'Payment verification', 'prefix' => 'VER'],
                ['code' => 'financial-transactions', 'name' => 'Other financial transactions', 'prefix' => 'FIN'],
            ],
            'admissions' => [
                ['code' => 'applications', 'name' => 'Student application inquiries', 'prefix' => 'APP'],
                ['code' => 'requirements', 'name' => 'Admission requirements', 'prefix' => 'REQ'],
                ['code' => 'enrollment-assistance', 'name' => 'Enrollment assistance', 'prefix' => 'ADM'],
            ],
            'guidance' => [
                ['code' => 'counseling', 'name' => 'Counseling appointments', 'prefix' => 'GUD'],
                ['code' => 'student-assistance', 'name' => 'Student assistance', 'prefix' => 'AST'],
                ['code' => 'guidance-inquiries', 'name' => 'Guidance-related inquiries', 'prefix' => 'INQ'],
            ],
            'it' => [
                ['code' => 'account-assistance', 'name' => 'Student account assistance', 'prefix' => 'ACC'],
                ['code' => 'technical-support', 'name' => 'Technical support', 'prefix' => 'ITS'],
                ['code' => 'system-inquiries', 'name' => 'School system inquiries', 'prefix' => 'SYS'],
            ],
        ];

        foreach ($services as $officeCode => $officeServices) {
            foreach ($officeServices as $sortOrder => $service) {
                QueueService::updateOrCreate(
                    ['code' => $service['code']],
                    [
                        ...$service,
                        'office_id' => $offices[$officeCode]->id,
                        'is_active' => true,
                        'sort_order' => $sortOrder + 1,
                    ],
                );
            }
        }

        foreach ([
            ['code' => 'window-1', 'name' => 'Window 1', 'office' => 'registrar'],
            ['code' => 'window-2', 'name' => 'Window 2', 'office' => 'registrar'],
            ['code' => 'window-3', 'name' => 'Window 3', 'office' => 'registrar'],
            ['code' => 'cashier', 'name' => 'Cashier Counter', 'office' => 'cashier'],
            ['code' => 'admissions', 'name' => 'Admissions Counter', 'office' => 'admissions'],
            ['code' => 'guidance', 'name' => 'Guidance Counter', 'office' => 'guidance'],
            ['code' => 'it-support', 'name' => 'IT Support Counter', 'office' => 'it'],
        ] as $window) {
            $officeCode = $window['office'];
            unset($window['office']);

            ServiceWindow::updateOrCreate(
                ['code' => $window['code']],
                [...$window, 'office_id' => $offices[$officeCode]->id, 'is_active' => true],
            );
        }
    }
}
