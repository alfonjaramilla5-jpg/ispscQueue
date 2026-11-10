<?php

use App\Http\Controllers\QueueController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('kiosk', [QueueController::class, 'kiosk'])->name('kiosk');
Route::post('kiosk/tickets', [QueueController::class, 'issueFromKiosk'])
    ->middleware('throttle:30,1')
    ->name('kiosk.tickets.store');
Route::get('kiosk/tickets/{ticket}/status', [QueueController::class, 'ticketStatus'])
    ->middleware('throttle:120,1')
    ->name('kiosk.tickets.status');
Route::get('queue/display', [QueueController::class, 'display'])->name('queue.display');
Route::get('queue/display/data', [QueueController::class, 'displayData'])->name('queue.display.data');

Route::middleware(['auth'])->group(function () {
    Route::redirect('dashboard', '/queue')->name('dashboard');

    Route::get('queue', [QueueController::class, 'index'])->name('queue.index');
    Route::get('queue/settings', [QueueController::class, 'settings'])->name('queue.settings');
    Route::post('queue/settings/offices', [QueueController::class, 'storeOffice'])
        ->name('queue.settings.offices.store');
    Route::post('queue/settings/services', [QueueController::class, 'storeService'])
        ->name('queue.settings.services.store');
    Route::post('queue/settings/windows', [QueueController::class, 'storeWindow'])
        ->name('queue.settings.windows.store');
    Route::patch('queue/settings/windows/{window}', [QueueController::class, 'updateWindowAssignment'])
        ->name('queue.settings.windows.update');
    Route::patch('queue/settings/users/{user}/role', [QueueController::class, 'updateUserRole'])
        ->name('queue.settings.users.role');
    Route::patch('queue/settings/users/{user}/office', [QueueController::class, 'updateUserOffice'])
        ->name('queue.settings.users.office');
    Route::post('queue/call-next', [QueueController::class, 'callNext'])->name('queue.call-next');
    Route::patch('queue/tickets/{ticket}/status', [QueueController::class, 'updateStatus'])
        ->name('queue.tickets.status');
});

require __DIR__.'/settings.php';
