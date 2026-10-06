<?php

return [
    'search' => [
        'default_radius_km' => 25,
    ],

    'request' => [
        'urgency_options' => [
            'flexible' => 'Flexible',
            'this_week' => 'This week',
            'urgent' => 'Urgent',
        ],
        'status_options' => [
            'open' => 'Open',
            'targeted' => 'Targeted',
            'in_conversation' => 'In conversation',
            'accepted' => 'Accepted',
            'declined' => 'Declined',
            'closed' => 'Closed',
        ],
    ],

    'reviews' => [
        'report_reasons' => [
            'abusive' => 'Abusive or hateful language',
            'false_information' => 'False or misleading information',
            'personal_information' => 'Contains personal information',
            'spam' => 'Spam or irrelevant content',
            'other' => 'Other policy concern',
        ],
        'blocked_terms' => [
            'asshole',
            'bitch',
            'fuck',
            'shit',
        ],
    ],

    'chat' => [
        'report_reasons' => [
            'harassment' => 'Harassment or abusive language',
            'spam' => 'Spam or unwanted promotion',
            'fraud' => 'Fraud or suspicious payment request',
            'personal_information' => 'Personal information was exposed',
            'other' => 'Another safety concern',
        ],
    ],

    'notifications' => [
        'email_categories' => [
            'messages' => 'Messages',
            'requests' => 'Requests and bookings',
            'payments' => 'Payments',
            'reviews' => 'Reviews',
            'account' => 'Account and safety',
        ],
    ],

    'security' => [
        'jwt_access_ttl_minutes' => (int) env('BOMA_JWT_ACCESS_TTL_MINUTES', 15),
        'jwt_refresh_ttl_minutes' => (int) env('BOMA_JWT_REFRESH_TTL_MINUTES', 60 * 24 * 30),
        'malware_scanner' => [
            'enabled' => (bool) env('BOMA_MALWARE_SCAN_ENABLED', true),
            'command' => env('BOMA_MALWARE_SCAN_COMMAND'),
            'fail_closed' => (bool) env('BOMA_MALWARE_SCAN_FAIL_CLOSED', true),
        ],
    ],

    'privacy' => [
        'deleted_account_retention_days' => (int) env('BOMA_DELETED_ACCOUNT_RETENTION_DAYS', 2555),
    ],

    'payment' => [
        'driver' => env('BOMA_PAYMENT_DRIVER', 'sandbox'),
        'gateway_provider' => env('BOMA_PAYMENT_GATEWAY_PROVIDER', 'Boma Sandbox Pay'),
        'wallet_currency' => env('BOMA_WALLET_CURRENCY', 'USD'),
        'platform_fee_bps' => (int) env('BOMA_PLATFORM_FEE_BPS', 0),
        'currencies' => [
            'USD' => 'USD',
            'ZWG' => 'ZiG',
        ],
        'pesepay' => [
            'integration_key' => env('PESEPAY_INTEGRATION_KEY'),
            'encryption_key' => env('PESEPAY_ENCRYPTION_KEY'),
            'currency' => env('PESEPAY_CURRENCY', env('BOMA_WALLET_CURRENCY', 'USD')),
        ],
        'proof_max_kb' => 12288,
        'channel_options' => [
            'electronic' => 'Electronic payment',
            'manual' => 'Manual or offline payment',
        ],
        'electronic_methods' => [
            'wallet',
            'saved_card',
            'mobile_money',
            'bank_transfer',
            'card',
            'other',
        ],
        'manual_methods' => [
            'cash',
            'manual_record',
        ],
        'method_options' => [
            'wallet' => 'Boma wallet',
            'saved_card' => 'Saved card',
            'cash' => 'Cash',
            'manual_record' => 'Manual record',
            'mobile_money' => 'Mobile money',
            'bank_transfer' => 'Bank transfer',
            'card' => 'Card',
            'other' => 'Other',
        ],
        'status_options' => [
            'pending_gateway' => 'Pending gateway',
            'submitted' => 'Submitted',
            'revision_requested' => 'Revision requested',
            'confirmed' => 'Confirmed',
        ],
        'escrow_status_options' => [
            'not_held' => 'Not held',
            'held' => 'Held in escrow',
            'released' => 'Released',
            'external' => 'External payment',
        ],
    ],

    'payout' => [
        'destination_options' => [
            'mobile_money' => 'Mobile money',
            'bank_transfer' => 'Bank transfer',
            'card' => 'Card payout',
            'cash_pickup' => 'Cash pickup',
        ],
        'status_options' => [
            'pending' => 'Pending',
            'approved' => 'Approved',
            'paid' => 'Paid',
            'rejected' => 'Rejected',
        ],
    ],

    'provider' => [
        'trial_days' => 30,
        'availability_options' => [
            'available',
            'busy',
            'offline',
        ],
        'response_time_options' => [
            'Within 1 hour',
            'Same day',
            'Within 24 hours',
            'Within 48 hours',
            'By appointment',
        ],
        'verification_document_max_kb' => 12 * 1024,
        'portfolio_item_max_kb' => 100 * 1024,
        'portfolio_total_max_bytes' => 500 * 1024 * 1024,
        'verification_document_types' => [
            'National ID',
            'Passport',
            'Business registration',
            'Proof of address',
            'Professional license',
            'Tax certificate',
            'Insurance certificate',
            'Portfolio sample',
        ],
    ],

    'subscriptions' => [
        'renewal_reminder_days' => (int) env('BOMA_SUBSCRIPTION_RENEWAL_REMINDER_DAYS', 3),
        'grace_days' => (int) env('BOMA_SUBSCRIPTION_GRACE_DAYS', 7),
        'fallback_plan' => env('BOMA_SUBSCRIPTION_FALLBACK_PLAN', 'basic_trial'),
    ],

    'trade_categories' => [
        'Plumbing',
        'Electrical',
        'Carpentry',
        'Painting',
        'Cleaning',
        'Gardening & Landscaping',
        'Appliance Repair',
        'Beauty & Wellness',
        'Catering',
        'IT Support',
        'Software Development',
        'Cyber Security',
        'Network Engineering',
    ],
];
