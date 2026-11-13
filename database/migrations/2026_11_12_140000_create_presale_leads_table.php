<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // PUBLIC table: filled by anonymous visitors, deliberately has no therapist_id.
    public function up(): void
    {
        Schema::create('presale_leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->enum('profession', ['osteopath', 'kinesiologist', 'physiotherapist', 'other']);
            $table->boolean('consent_privacy');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presale_leads');
    }
};
