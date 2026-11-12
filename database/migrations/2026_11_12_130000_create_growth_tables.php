<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('therapist_id');
            $table->foreign('therapist_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->enum('type', ['dormant', 'review', 'campaign']);
            $table->dateTime('sent_at');
            $table->timestamps();
            $table->index(['therapist_id', 'patient_id', 'type', 'sent_at']);
        });

        Schema::create('referral_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('therapist_id');
            $table->foreign('therapist_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->unique()->constrained('patients')->cascadeOnDelete();
            $table->string('code');
            $table->timestamps();
            $table->unique(['therapist_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_codes');
        Schema::dropIfExists('marketing_events');
    }
};
