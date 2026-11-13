<?php

namespace App\Exceptions;

use RuntimeException;

class AppointmentOverlapException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Questo orario si sovrappone a un altro appuntamento.');
    }
}
