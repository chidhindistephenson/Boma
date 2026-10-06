<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Middleware\AuthenticateApiJwt;
use Illuminate\Support\Facades\Route;

$registerApiAuthRoutes = function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('throttle:30,1');
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware(AuthenticateApiJwt::class)->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
    });
};

Route::prefix('auth')->group($registerApiAuthRoutes);

Route::prefix('v1/auth')->group($registerApiAuthRoutes);
