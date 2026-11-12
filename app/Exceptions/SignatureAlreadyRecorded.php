<?php

namespace App\Exceptions;

use RuntimeException;

class SignatureAlreadyRecorded extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Signature already recorded.');
    }
}
