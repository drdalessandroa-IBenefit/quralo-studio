<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_counters', function (Blueprint $table) {
            $table->unsignedBigInteger('therapist_id');
            $table->foreign('therapist_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_number')->default(0);
            $table->primary(['therapist_id', 'year']);
        });

        // Money is always integer cents. Issued only via InvoiceService; never modified.
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('therapist_id');
            $table->foreign('therapist_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->string('invoice_number', 16);
            $table->date('issued_at');
            $table->unsignedInteger('total_cents');
            $table->unsignedInteger('cash_cents');
            $table->unsignedInteger('pos_cents');
            $table->boolean('stamp_duty_due')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['therapist_id', 'invoice_number']);
            $table->index(['therapist_id', 'issued_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('invoice_counters');
    }
};
