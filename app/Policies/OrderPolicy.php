<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * Perform pre-authorization checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isSuperAdmin()) {
            // Superadmins bypass everything EXCEPT status-dependent logic
            return in_array($ability, ['cancel', 'approve', 'reject', 'update']) ? null : true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Filtering happens in the controller query
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Order $order): bool
    {
        if ($user->isAdminTier()) {
            return $user->tier_id === $order->tier_id;
        }

        return $user->id === $order->buyer_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isBuyer() || $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Order $order): bool
    {
        // Superadmins can edit orders that are PENDING or APPROVED.
        if ($user->isSuperAdmin()) {
            return in_array($order->status, ['PENDING', 'APPROVED']);
        }

        // Admin Tiers can ONLY edit PENDING orders in their specific tier.
        if ($user->isAdminTier()) {
            return $order->status === 'PENDING' && $user->tier_id === $order->tier_id;
        }

        return false;
    }

    /**
     * Determine whether the user can approve the model.
     */
    public function approve(User $user, Order $order): bool
    {
        if ($user->isSuperAdmin()) {
            return $order->status === 'PENDING';
        }

        if ($user->isAdminTier()) {
            return $order->status === 'PENDING' &&
                   ! empty($user->tier_id) &&
                   $user->tier_id === $order->tier_id;
        }

        return false;
    }

    /**
     * Determine whether the user can reject the model.
     */
    public function reject(User $user, Order $order): bool
    {
        if ($user->isSuperAdmin()) {
            return $order->status === 'PENDING';
        }

        if ($user->isAdminTier()) {
            return $order->status === 'PENDING' &&
                   ! empty($user->tier_id) &&
                   $user->tier_id === $order->tier_id;
        }

        return false;
    }

    /**
     * Determine whether the user can cancel the model.
     */
    public function cancel(User $user, Order $order): bool
    {
        if ($user->isSuperAdmin()) {
            return in_array($order->status, ['PENDING', 'UNPAID']);
        }

        return $user->id === $order->buyer_id && in_array($order->status, ['PENDING', 'UNPAID']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Order $order): bool
    {
        return false;
    }

    /**
     * Determine whether the user can generate an invoice.
     */
    public function generateInvoice(User $user, Order $order): bool
    {
        // Only Superadmins can generate invoices for B2B Dot Matrix
        return $user->isSuperAdmin();
    }
}
