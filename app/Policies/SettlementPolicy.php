<?php

namespace App\Policies;

use App\Models\Settlement;
use App\Models\User;

class SettlementPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isAdminTier();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Settlement $settlement): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isAdminTier()) {
            return $user->tier_id === $settlement->buyer->tier_id;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isAdminTier();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Settlement $settlement): bool
    {
        return $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can verify the model.
     */
    public function verify(User $user, Settlement $settlement): bool
    {
        return $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Settlement $settlement): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Settlement $settlement): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Settlement $settlement): bool
    {
        return false;
    }
}
