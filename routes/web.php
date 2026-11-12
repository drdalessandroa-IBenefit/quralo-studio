<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ClinicalNoteController;
use App\Http\Controllers\GrowthController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\StudioController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::get('/studio', [StudioController::class, 'edit'])->name('studio.edit');
    Route::put('/studio', [StudioController::class, 'update'])->name('studio.update');
    Route::resource('patients', PatientController::class)->only(['index', 'store', 'show']);
    Route::post('/patients/{patient}/signature', [SignatureController::class, 'store'])->name('patients.signature.store');
    Route::get('/patients/{patient}/signature', [SignatureController::class, 'show'])->name('patients.signature.show');
    Route::get('/agenda', [AppointmentController::class, 'index'])->name('agenda.index');
    Route::post('/agenda', [AppointmentController::class, 'store'])->name('agenda.store');
    Route::get('/agenda/export.ics', [AppointmentController::class, 'export'])->name('agenda.export');
    Route::get('/agenda/{appointment}/ics', [AppointmentController::class, 'exportOne'])->name('agenda.ics');
    Route::patch('/agenda/{appointment}/status', [AppointmentController::class, 'status'])->name('agenda.status');
    Route::resource('clinical-notes', ClinicalNoteController::class)->only(['index', 'store']);
    // Append-only record: modification verbs are explicitly refused (no controller action exists).
    Route::match(['put', 'patch', 'delete'], '/clinical-notes/{note}', fn () => abort(405, 'Method Not Allowed'))
        ->setBindingFields([])->whereUuid('note');
    Route::get('/invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::post('/invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    Route::get('/invoices/export.csv', [InvoiceController::class, 'export'])->name('invoices.export');
    // Issue-only: modification verbs are explicitly refused.
    Route::match(['put', 'patch', 'delete'], '/invoices/{invoice}', fn () => abort(405, 'Method Not Allowed'))
        ->setBindingFields([])->whereUuid('invoice');
    Route::get('/growth', [GrowthController::class, 'index'])->name('growth.index');
    Route::post('/growth/events', [GrowthController::class, 'logEvent'])->name('growth.events');
    Route::post('/growth/referral-codes', [GrowthController::class, 'generateCode'])->name('growth.referral');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
