<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class OrdersExport implements WithMultipleSheets
{
    use Exportable;

    protected $orders;

    protected $tierName;

    public function __construct($orders, $tierName = 'SEMUA TIER')
    {
        $this->orders = $orders;
        $this->tierName = $tierName;
    }

    public function sheets(): array
    {
        $sheets = [];
        $groupedOrders = $this->orders->groupBy('buyer_id')->sortBy(function ($orders) {
            return strtolower($orders->first()->buyer->branch_name ?? $orders->first()->buyer->username);
        });

        $sheets[] = new BranchSummarySheet($groupedOrders, $this->tierName);

        foreach ($groupedOrders as $buyerId => $ordersByBranch) {
            $branchName = $ordersByBranch->first()->buyer->branch_name ?? $ordersByBranch->first()->buyer->username;
            $sheets[] = new BranchOrdersSheet($ordersByBranch, $branchName);
        }

        return $sheets;
    }
}
