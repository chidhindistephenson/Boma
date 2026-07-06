<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AdminAnalyticsController;
use App\Http\Controllers\AdminRequestController;
use App\Http\Controllers\AdminProviderVerificationController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\CustomerShortlistController;
use App\Http\Controllers\JobRequestController;
use App\Http\Controllers\JobRequestMessageController;
use App\Http\Controllers\JobRequestPaymentController;
use App\Http\Controllers\JobRequestPaymentStatusController;
use App\Http\Controllers\JobRequestQuoteController;
use App\Http\Controllers\JobRequestQuoteStatusController;
use App\Http\Controllers\JobRequestScheduleController;
use App\Http\Controllers\JobRequestScheduleStatusController;
use App\Http\Controllers\JobRequestStatusController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProviderDirectoryController;
use App\Http\Controllers\ProviderReviewController;
use App\Http\Controllers\ProviderServiceController;
use App\Http\Controllers\ProviderShowController;
use App\Http\Controllers\ProviderVerificationDocumentController;
use App\Http\Controllers\ProviderVerificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ShortlistedProviderController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'featuredCategories' => array_slice(config('localserve.trade_categories'), 0, 6),
        'searchRadiusKm' => config('localserve.search.default_radius_km'),
        'laravelVersion' => Application::VERSION,
    ]);
})->name('welcome');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('/providers', ProviderDirectoryController::class)->name('providers.index');
Route::get('/providers/{provider}', ProviderShowController::class)->name('providers.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/shortlist', CustomerShortlistController::class)->name('shortlist.index');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/{notification}', [NotificationController::class, 'visit'])->name('notifications.visit');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAll'])->name('notifications.markAll');
    Route::get('/requests', [JobRequestController::class, 'index'])->name('requests.index');
    Route::get('/requests/create', [JobRequestController::class, 'create'])->name('requests.create');
    Route::get('/requests/{jobRequest}/follow-up', [JobRequestController::class, 'createFollowUp'])
        ->name('requests.followup.create');
    Route::post('/requests', [JobRequestController::class, 'store'])->name('requests.store');
    Route::get('/requests/{jobRequest}', [JobRequestController::class, 'show'])->name('requests.show');
    Route::post('/requests/{jobRequest}/messages', [JobRequestMessageController::class, 'store'])
        ->name('requests.messages.store');
    Route::put('/requests/{jobRequest}/quote', [JobRequestQuoteController::class, 'upsert'])
        ->name('requests.quote.upsert');
    Route::patch('/requests/{jobRequest}/quote', [JobRequestQuoteStatusController::class, 'update'])
        ->name('requests.quote.status.update');
    Route::put('/requests/{jobRequest}/schedule', [JobRequestScheduleController::class, 'upsert'])
        ->name('requests.schedule.upsert');
    Route::patch('/requests/{jobRequest}/schedule', [JobRequestScheduleStatusController::class, 'update'])
        ->name('requests.schedule.status.update');
    Route::put('/requests/{jobRequest}/payment', [JobRequestPaymentController::class, 'upsert'])
        ->name('requests.payment.upsert');
    Route::patch('/requests/{jobRequest}/payment', [JobRequestPaymentStatusController::class, 'update'])
        ->name('requests.payment.status.update');
    Route::put('/requests/{jobRequest}/review', [ProviderReviewController::class, 'upsert'])
        ->name('requests.review.upsert');
    Route::patch('/requests/{jobRequest}/status', [JobRequestStatusController::class, 'update'])
        ->name('requests.status.update');
    Route::post('/provider/verification', [ProviderVerificationController::class, 'store'])
        ->name('provider.verification.store');
    Route::post('/provider/verification/documents', [ProviderVerificationDocumentController::class, 'store'])
        ->name('provider.verification.documents.store');
    Route::post('/provider/services', [ProviderServiceController::class, 'store'])
        ->name('provider.services.store');
    Route::patch('/provider/services/{service}', [ProviderServiceController::class, 'update'])
        ->name('provider.services.update');
    Route::delete('/provider/services/{service}', [ProviderServiceController::class, 'destroy'])
        ->name('provider.services.destroy');
    Route::get('/provider/verification/documents/{document}', [ProviderVerificationDocumentController::class, 'show'])
        ->name('provider.verification.documents.show');
    Route::delete('/provider/verification/documents/{document}', [ProviderVerificationDocumentController::class, 'destroy'])
        ->name('provider.verification.documents.destroy');
    Route::get('/admin/requests', AdminRequestController::class)
        ->name('admin.requests.index');
    Route::get('/admin/analytics', AdminAnalyticsController::class)
        ->name('admin.analytics.index');
    Route::get('/admin/providers', [AdminProviderVerificationController::class, 'index'])
        ->name('admin.providers.index');
    Route::patch('/admin/providers/{provider}/verification', [AdminProviderVerificationController::class, 'update'])
        ->name('admin.providers.update');
    Route::get('/admin/users', [AdminUserController::class, 'index'])
        ->name('admin.users.index');
    Route::patch('/admin/users/{user}', [AdminUserController::class, 'update'])
        ->name('admin.users.update');
    Route::get('/providers/{provider}/request', [JobRequestController::class, 'createForProvider'])
        ->name('providers.requests.create');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/providers/{provider}/shortlist', [ShortlistedProviderController::class, 'store'])
        ->name('providers.shortlist.store');
    Route::delete('/providers/{provider}/shortlist', [ShortlistedProviderController::class, 'destroy'])
        ->name('providers.shortlist.destroy');
});

require __DIR__.'/auth.php';
