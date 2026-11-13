<?php

it('serves the landing page', function () {
    $this->get('/')->assertOk();
});
