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

    'payment' => [
        'method_options' => [
            'cash' => 'Cash',
            'mobile_money' => 'Mobile money',
            'bank_transfer' => 'Bank transfer',
            'card' => 'Card',
            'other' => 'Other',
        ],
        'status_options' => [
            'submitted' => 'Submitted',
            'revision_requested' => 'Revision requested',
            'confirmed' => 'Confirmed',
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
    ],
];
