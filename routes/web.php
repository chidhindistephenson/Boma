<?php

use App\Http\Controllers\AdminAnalyticsController;
use App\Http\Controllers\AdminConversationController;
use App\Http\Controllers\AdminFinanceController;
use App\Http\Controllers\AdminPayoutController;
use App\Http\Controllers\AdminProviderTradeCategoryController;
use App\Http\Controllers\AdminProviderVerificationController;
use App\Http\Controllers\AdminProviderVerificationDocumentController;
use App\Http\Controllers\AdminRequestController;
use App\Http\Controllers\AdminReportExportController;
use App\Http\Controllers\AdminReviewController;
use App\Http\Controllers\AdminSystemSettingsController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminWalletDepositController;
use App\Http\Controllers\ConversationReportController;
use App\Http\Controllers\CustomerShortlistController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\InboxMessageController;
use App\Http\Controllers\InboxReadController;
use App\Http\Controllers\JobRequestBoardController;
use App\Http\Controllers\JobRequestController;
use App\Http\Controllers\JobRequestMessageController;
use App\Http\Controllers\JobRequestMessageMediaController;
use App\Http\Controllers\JobRequestPaymentController;
use App\Http\Controllers\JobRequestPaymentDisputeController;
use App\Http\Controllers\JobRequestPaymentReleaseController;
use App\Http\Controllers\JobRequestPaymentRefundController;
use App\Http\Controllers\JobRequestPaymentStatusController;
use App\Http\Controllers\JobRequestProposalController;
use App\Http\Controllers\JobRequestQuoteController;
use App\Http\Controllers\JobRequestQuoteStatusController;
use App\Http\Controllers\JobRequestScheduleController;
use App\Http\Controllers\JobRequestScheduleStatusController;
use App\Http\Controllers\JobRequestStatusController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentMethodController;
use App\Http\Controllers\PaymentReceiptController;
use App\Http\Controllers\PesepayPaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfilePhotoController;
use App\Http\Controllers\PayoutRequestController;
use App\Http\Controllers\ProviderChatController;
use App\Http\Controllers\ProviderDirectoryController;
use App\Http\Controllers\ProviderPortfolioItemController;
use App\Http\Controllers\ProviderReviewController;
use App\Http\Controllers\ProviderServiceController;
use App\Http\Controllers\ProviderShowController;
use App\Http\Controllers\ProviderSubscriptionController;
use App\Http\Controllers\ProviderTradeCategoryController;
use App\Http\Controllers\ProviderVerificationController;
use App\Http\Controllers\ProviderVerificationDocumentController;
use App\Http\Controllers\ShortlistedProviderController;
use App\Http\Controllers\WalletDepositController;
use App\Http\Controllers\WalletStatementController;
use App\Services\SystemSettingsService;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $settings = app(SystemSettingsService::class);

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'featuredCategories' => array_slice(config('localserve.trade_categories'), 0, 6),
        'searchRadiusKm' => $settings->defaultSearchRadiusKm(),
        'laravelVersion' => Application::VERSION,
    ]);
})->name('welcome');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('/providers', ProviderDirectoryController::class)->name('providers.index');
Route::get('/providers/{provider}/portfolio/{portfolioItem}', [ProviderPortfolioItemController::class, 'media'])
    ->name('providers.portfolio.media');
Route::get('/providers/{provider}', ProviderShowController::class)->name('providers.show');
Route::get('/users/{user}/avatar', [ProfilePhotoController::class, 'show'])->name('users.avatar');
Route::match(['get', 'post'], '/payments/pesepay/result/{jobRequest}', [PesepayPaymentController::class, 'result'])
    ->name('payments.pesepay.result');
Route::match(['get', 'post'], '/wallet/deposits/{deposit}/pesepay-result', [WalletDepositController::class, 'result'])
    ->name('wallet.deposits.pesepay.result');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/shortlist', CustomerShortlistController::class)->name('shortlist.index');
    Route::get('/inbox', [InboxController::class, 'index'])->name('inbox.index');
    Route::get('/inbox/{jobRequest}', [InboxController::class, 'index'])->name('inbox.show');
    Route::get('/inbox/{jobRequest}/messages', [InboxController::class, 'messages'])
        ->name('inbox.messages.index');
    Route::post('/inbox/{jobRequest}/messages', InboxMessageController::class)
        ->name('inbox.messages.store');
    Route::post('/inbox/{jobRequest}/read', InboxReadController::class)
        ->name('inbox.read');
    Route::post('/inbox/{jobRequest}/reports', ConversationReportController::class)
        ->name('inbox.reports.store');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/{notification}', [NotificationController::class, 'visit'])->name('notifications.visit');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAll'])->name('notifications.markAll');
    Route::patch('/notifications/preferences', [NotificationController::class, 'updatePreferences'])
        ->name('notifications.preferences.update');
    Route::post('/wallet/deposits', [WalletDepositController::class, 'store'])->name('wallet.deposits.store');
    Route::get('/wallet/deposits/{deposit}/pesepay-return', [WalletDepositController::class, 'return'])
        ->name('wallet.deposits.pesepay.return');
    Route::post('/wallet/deposits/{deposit}/pesepay-sync', [WalletDepositController::class, 'sync'])
        ->name('wallet.deposits.pesepay.sync');
    Route::post('/wallet/payouts', [PayoutRequestController::class, 'store'])->name('wallet.payouts.store');
    Route::get('/wallet/statement', WalletStatementController::class)->name('wallet.statement');
    Route::post('/payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store');
    Route::patch('/payment-methods/{paymentMethod}/default', [PaymentMethodController::class, 'makeDefault'])
        ->name('payment-methods.default');
    Route::delete('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy'])
        ->name('payment-methods.destroy');
    Route::get('/requests', [JobRequestController::class, 'index'])->name('requests.index');
    Route::get('/request-board', JobRequestBoardController::class)->name('request-board.index');
    Route::get('/requests/create', [JobRequestController::class, 'create'])->name('requests.create');
    Route::get('/requests/{jobRequest}/follow-up', [JobRequestController::class, 'createFollowUp'])
        ->name('requests.followup.create');
    Route::post('/requests', [JobRequestController::class, 'store'])->name('requests.store');
    Route::get('/requests/{jobRequest}', [JobRequestController::class, 'show'])->name('requests.show');
    Route::post('/requests/{jobRequest}/messages', [JobRequestMessageController::class, 'store'])
        ->name('requests.messages.store');
    Route::get('/requests/{jobRequest}/messages/{message}/media', JobRequestMessageMediaController::class)
        ->name('requests.messages.media');
    Route::put('/requests/{jobRequest}/quote', [JobRequestQuoteController::class, 'upsert'])
        ->name('requests.quote.upsert');
    Route::patch('/requests/{jobRequest}/quote', [JobRequestQuoteStatusController::class, 'update'])
        ->name('requests.quote.status.update');
    Route::put('/requests/{jobRequest}/proposal', [JobRequestProposalController::class, 'upsert'])
        ->name('requests.proposal.upsert');
    Route::patch('/requests/{jobRequest}/proposal', [JobRequestProposalController::class, 'withdraw'])
        ->name('requests.proposal.withdraw');
    Route::patch('/requests/{jobRequest}/proposals/{proposal}', [JobRequestProposalController::class, 'respond'])
        ->name('requests.proposals.respond');
    Route::put('/requests/{jobRequest}/schedule', [JobRequestScheduleController::class, 'upsert'])
        ->name('requests.schedule.upsert');
    Route::patch('/requests/{jobRequest}/schedule', [JobRequestScheduleStatusController::class, 'update'])
        ->name('requests.schedule.status.update');
    Route::put('/requests/{jobRequest}/payment', [JobRequestPaymentController::class, 'upsert'])
        ->name('requests.payment.upsert');
    Route::get('/requests/{jobRequest}/payment/pesepay-return', [PesepayPaymentController::class, 'return'])
        ->name('requests.payment.return');
    Route::post('/requests/{jobRequest}/payment/sync', [PesepayPaymentController::class, 'sync'])
        ->name('requests.payment.sync');
    Route::post('/requests/{jobRequest}/payment/dispute', JobRequestPaymentDisputeController::class)
        ->name('requests.payment.dispute');
    Route::post('/requests/{jobRequest}/payment/release', JobRequestPaymentReleaseController::class)
        ->name('requests.payment.release');
    Route::post('/requests/{jobRequest}/payment/refund', JobRequestPaymentRefundController::class)
        ->name('requests.payment.refund');
    Route::patch('/requests/{jobRequest}/payment', [JobRequestPaymentStatusController::class, 'update'])
        ->name('requests.payment.status.update');
    Route::get('/requests/{jobRequest}/payment/proof', [JobRequestPaymentController::class, 'proof'])
        ->name('requests.payment.proof');
    Route::get('/requests/{jobRequest}/payment/receipt', PaymentReceiptController::class)
        ->name('requests.payment.receipt');
    Route::put('/requests/{jobRequest}/review', [ProviderReviewController::class, 'upsert'])
        ->name('requests.review.upsert');
    Route::patch('/reviews/{review}/response', [ProviderReviewController::class, 'respond'])
        ->name('reviews.response');
    Route::post('/reviews/{review}/reports', [ProviderReviewController::class, 'report'])
        ->name('reviews.reports.store');
    Route::patch('/requests/{jobRequest}/status', [JobRequestStatusController::class, 'update'])
        ->name('requests.status.update');
    Route::post('/provider/verification', [ProviderVerificationController::class, 'store'])
        ->name('provider.verification.store');
    Route::post('/provider/verification/documents', [ProviderVerificationDocumentController::class, 'store'])
        ->name('provider.verification.documents.store');
    Route::post('/provider/verification/documents/{document}/replacement', [ProviderVerificationDocumentController::class, 'replace'])
        ->name('provider.verification.documents.replace');
    Route::post('/provider/trade-categories', [ProviderTradeCategoryController::class, 'store'])
        ->name('provider.trade-categories.store');
    Route::delete('/provider/trade-categories/{tradeCategory}', [ProviderTradeCategoryController::class, 'destroy'])
        ->name('provider.trade-categories.destroy');
    Route::post('/provider/services', [ProviderServiceController::class, 'store'])
        ->name('provider.services.store');
    Route::patch('/provider/services/{service}', [ProviderServiceController::class, 'update'])
        ->name('provider.services.update');
    Route::delete('/provider/services/{service}', [ProviderServiceController::class, 'destroy'])
        ->name('provider.services.destroy');
    Route::post('/provider/portfolio', [ProviderPortfolioItemController::class, 'store'])
        ->name('provider.portfolio.store');
    Route::patch('/provider/portfolio/{portfolioItem}', [ProviderPortfolioItemController::class, 'update'])
        ->name('provider.portfolio.update');
    Route::delete('/provider/portfolio/{portfolioItem}', [ProviderPortfolioItemController::class, 'destroy'])
        ->name('provider.portfolio.destroy');
    Route::get('/provider/verification/documents/{document}', [ProviderVerificationDocumentController::class, 'show'])
        ->name('provider.verification.documents.show');
    Route::delete('/provider/verification/documents/{document}', [ProviderVerificationDocumentController::class, 'destroy'])
        ->name('provider.verification.documents.destroy');
    Route::post('/provider/subscriptions/{plan}', [ProviderSubscriptionController::class, 'store'])
        ->name('provider.subscriptions.store');
    Route::delete('/provider/subscriptions/current', [ProviderSubscriptionController::class, 'destroy'])
        ->name('provider.subscriptions.destroy');
    Route::get('/admin/requests', AdminRequestController::class)
        ->name('admin.requests.index');
    Route::get('/admin/conversations', [AdminConversationController::class, 'index'])
        ->name('admin.conversations.index');
    Route::patch('/admin/conversations/{jobRequest}', [AdminConversationController::class, 'update'])
        ->name('admin.conversations.update');
    Route::get('/admin/analytics', AdminAnalyticsController::class)
        ->name('admin.analytics.index');
    Route::get('/admin/reviews', [AdminReviewController::class, 'index'])
        ->name('admin.reviews.index');
    Route::patch('/admin/reviews/{review}', [AdminReviewController::class, 'update'])
        ->name('admin.reviews.update');
    Route::get('/admin/payouts', [AdminPayoutController::class, 'index'])
        ->name('admin.payouts.index');
    Route::patch('/admin/payouts/{payout}', [AdminPayoutController::class, 'update'])
        ->name('admin.payouts.update');
    Route::get('/admin/finance', [AdminFinanceController::class, 'index'])
        ->name('admin.finance.index');
    Route::get('/admin/finance/export', [AdminFinanceController::class, 'export'])
        ->name('admin.finance.export');
    Route::get('/admin/reports/{report}/export', AdminReportExportController::class)
        ->name('admin.reports.export');
    Route::get('/admin/settings', [AdminSystemSettingsController::class, 'index'])
        ->name('admin.settings.index');
    Route::patch('/admin/settings', [AdminSystemSettingsController::class, 'update'])
        ->name('admin.settings.update');
    Route::patch('/admin/settings/subscription-plans/{plan}', [AdminSystemSettingsController::class, 'updatePlan'])
        ->name('admin.settings.plans.update');
    Route::get('/admin/wallet-deposits', [AdminWalletDepositController::class, 'index'])
        ->name('admin.wallet-deposits.index');
    Route::patch('/admin/wallet-deposits/{deposit}', [AdminWalletDepositController::class, 'update'])
        ->name('admin.wallet-deposits.update');
    Route::get('/admin/providers', [AdminProviderVerificationController::class, 'index'])
        ->name('admin.providers.index');
    Route::patch('/admin/providers/{provider}/verification', [AdminProviderVerificationController::class, 'update'])
        ->name('admin.providers.update');
    Route::patch('/admin/provider-trade-categories/{tradeCategory}', [AdminProviderTradeCategoryController::class, 'update'])
        ->name('admin.provider-trade-categories.update');
    Route::patch('/admin/provider-verification-documents/{document}', [AdminProviderVerificationDocumentController::class, 'update'])
        ->name('admin.provider-verification-documents.update');
    Route::get('/admin/users', [AdminUserController::class, 'index'])
        ->name('admin.users.index');
    Route::patch('/admin/users/{user}', [AdminUserController::class, 'update'])
        ->name('admin.users.update');
    Route::post('/admin/users/{user}/reset-password', [AdminUserController::class, 'resetPassword'])
        ->name('admin.users.reset-password');
    Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy'])
        ->name('admin.users.destroy');
    Route::get('/providers/{provider}/request', [JobRequestController::class, 'createForProvider'])
        ->name('providers.requests.create');
    Route::post('/providers/{provider}/chat', [ProviderChatController::class, 'store'])
        ->name('providers.chat.store');
    Route::post('/providers/{provider}/shortlist', [ShortlistedProviderController::class, 'store'])
        ->name('providers.shortlist.store');
    Route::delete('/providers/{provider}/shortlist', [ShortlistedProviderController::class, 'destroy'])
        ->name('providers.shortlist.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/photo', [ProfilePhotoController::class, 'store'])->name('profile.photo.store');
    Route::delete('/profile/photo', [ProfilePhotoController::class, 'destroy'])->name('profile.photo.destroy');
});

require __DIR__.'/auth.php';
