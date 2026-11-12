<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only medical record: no updated_at, rows are never modified.
        Schema::create('clinical_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('therapist_id');
            $table->foreign('therapist_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->text('anamnesis')->nullable();
            $table->text('treatment_plan')->nullable();
            $table->text('session_notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['therapist_id', 'patient_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinical_notes');
    }
};
