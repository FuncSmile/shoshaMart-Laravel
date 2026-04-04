<?php

namespace App\Exports;
 
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
 
class BranchOrdersSheet implements FromView, WithTitle, ShouldAutoSize
{
    protected $orders;
    protected $branchName;
 
    public function __construct($orders, $branchName)
    {
        $this->orders = $orders;
        $this->branchName = $branchName;
    }
 
    public function view(): View
    {
        return view('reports.excel_branch', [
            'orders' => $this->orders,
            'branchName' => $this->branchName
        ]);
    }
 
    public function title(): string
    {
        // Excel sheet title max length 31 chars
        return substr($this->branchName, 0, 31);
    }
}
