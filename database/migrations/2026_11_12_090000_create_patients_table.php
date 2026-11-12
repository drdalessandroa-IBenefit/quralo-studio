<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('therapist_id');
            $table->foreign('therapist_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('fiscal_code', 16)->nullable();
            $table->json('tags');
            $table->string('referred_by_code')->nullable();
            $table->boolean('consent_privacy')->default(false);
            $table->timestamp('consent_date')->nullable();
            $table->string('consent_text_version')->nullable();
            $table->string('signature_path')->nullable();
            $table->boolean('consent_marketing')->default(false);
            $table->timestamp('consent_marketing_date')->nullable();
            $table->timestamps();
            $table->index('therapist_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
