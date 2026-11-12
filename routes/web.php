<?php

use App\Http\Controllers\AppointmentController;
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
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
