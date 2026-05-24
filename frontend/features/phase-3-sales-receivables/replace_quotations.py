import re

file_path = "/home/whitespider/Desktop/work_project/simple-account/frontend/features/phase-3-sales-receivables/sales-receivables-page.tsx"

with open(file_path, "r") as f:
    content = f.read()

start_pattern = r'\{activeTab === "quotations" \? \([\s\S]*?\{activeTab === "orders" \? \('

replacement = """{activeTab === "quotations" ? (
          <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sales Quotations / عروض الأسعار</h2>
                <p className="text-sm text-gray-500">Create, send, approve, and convert quotations into sales orders.</p>
              </div>
              <Button
                className="shrink-0 gap-2 rounded-full bg-[#1D9E75] px-6 text-white hover:bg-[#15815e]"
                onClick={() => {
                  setQuotationEditorClientError(null);
                  setQuotationEditor(createEmptyQuotationEditor());
                  setIsQuotationEditorOpen(true);
                }}
              >
                <CirclePlus className="h-5 w-5" />
                New Quotation
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="flex items-center p-5 border-gray-100 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[#1D9E75] mr-4 shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Quotations</div>
                  <div className="text-2xl font-black text-gray-900">{quotations.length}</div>
                  <div className="text-xs text-gray-500">All time quotations</div>
                </div>
              </Card>
              <Card className="flex items-center p-5 border-gray-100 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mr-4 shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Draft / Pending</div>
                  <div className="text-2xl font-black text-gray-900">{quotations.filter((row) => row.status === "DRAFT").length}</div>
                  <div className="text-xs text-gray-500">Awaiting review or action</div>
                </div>
              </Card>
              <Card className="flex items-center p-5 border-gray-100 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mr-4 shrink-0">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Approved</div>
                  <div className="text-2xl font-black text-gray-900">{quotations.filter((row) => row.status === "APPROVED").length}</div>
                  <div className="text-xs text-gray-500">Ready for conversion</div>
                </div>
              </Card>
              <Card className="flex items-center p-5 border-gray-100 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-[#1D9E75] mr-4 shrink-0">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Quoted Value</div>
                  <div className="text-2xl font-black text-gray-900">{formatCurrency(quotations.reduce((sum, row) => sum + Number(row.totalAmount), 0))}</div>
                  <div className="text-xs text-gray-500">Total quoted amount</div>
                </div>
              </Card>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {["All", "Draft", "Sent", "Approved", "Converted", "Expired", "Cancelled"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setQuotationTabFilter(tab)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                    quotationTabFilter === tab
                      ? "bg-green-50 text-[#1D9E75]"
                      : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <Card className="p-2 border-gray-100 shadow-sm">
              <div className="grid gap-2 lg:grid-cols-[1.5fr_1fr_1.5fr_1fr_auto]">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input 
                    className="pl-9 bg-gray-50/50 border-transparent focus:border-green-500 focus:bg-white"
                    value={quotationSearch} 
                    onChange={(event) => setQuotationSearch(event.target.value)} 
                    placeholder="Search by reference or customer..." 
                  />
                </div>
                <Select className="bg-gray-50/50 border-transparent focus:border-green-500 focus:bg-white" value={quotationStatusFilter} onChange={(event) => setQuotationStatusFilter(event.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
                <Select className="bg-gray-50/50 border-transparent focus:border-green-500 focus:bg-white" defaultValue="">
                  <option value="">24 May 2026 – 24 Jun 2026</option>
                </Select>
                <Select className="bg-gray-50/50 border-transparent focus:border-green-500 focus:bg-white" defaultValue="">
                  <option value="">All Customers</option>
                </Select>
                <Button className="gap-2 bg-gray-50 text-gray-700 hover:bg-gray-100 shadow-none border border-gray-200">
                  <FilterIcon className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card className="overflow-hidden p-0 border-gray-100 shadow-sm">
                <div className="border-b border-gray-100 bg-white px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">Sales Quotations</div>
                  <div className="text-xs text-gray-500">Draft, review, approve, and track quotation validity before conversion.</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <TableHead>Reference</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.filter(q => quotationTabFilter === "All" || (quotationTabFilter === "Sent" ? q.status === "SENT" : quotationTabFilter === "Converted" ? q.status === "CONVERTED" : q.status === quotationTabFilter.toUpperCase())).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                              <div className="text-sm font-bold text-gray-900">No quotations yet</div>
                              <div className="text-xs text-gray-500 mt-1 mb-4">Start by creating your first sales quotation for a customer.</div>
                              <Button className="gap-2 text-xs h-8 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" onClick={() => { setQuotationEditorClientError(null); setQuotationEditor(createEmptyQuotationEditor()); setIsQuotationEditorOpen(true); }}>
                                <CirclePlus className="h-3 w-3" />
                                Create Quotation
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        quotations
                          .filter(q => quotationTabFilter === "All" || (quotationTabFilter === "Sent" ? q.status === "SENT" : quotationTabFilter === "Converted" ? q.status === "CONVERTED" : q.status === quotationTabFilter.toUpperCase()))
                          .map((row) => {
                            const isSelected = selectedQuotation?.id === row.id;
                            return (
                              <tr 
                                key={row.id} 
                                className={cn(
                                  "border-t border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer relative", 
                                  isSelected && "bg-[#F0FBF6] hover:bg-[#F0FBF6]"
                                )}
                                onClick={() => setSelectedQuotationId(row.id)}
                              >
                                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1D9E75]" />}
                                <td className="px-6 py-4 font-bold text-gray-900">{row.reference}</td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-gray-900">{row.customer.name}</div>
                                  <div className="text-xs text-gray-500">{row.customer.code}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-700">{formatDate(row.quotationDate)}</td>
                                <td className="px-6 py-4 text-gray-700">{formatDate(row.validityDate)}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider",
                                    row.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                    row.status === "DRAFT" ? "bg-gray-100 text-gray-600" :
                                    row.status === "SENT" ? "bg-blue-100 text-blue-700" :
                                    row.status === "EXPIRED" ? "bg-red-100 text-red-700" :
                                    row.status === "CONVERTED" ? "bg-teal-100 text-teal-700" :
                                    "bg-gray-100 text-gray-600"
                                  )}>
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                    {row.status === "DRAFT" ? (
                                      <>
                                        <button type="button" className="text-xs font-semibold text-[#1D9E75] hover:text-[#15815e]" onClick={() => {
                                          setQuotationEditorClientError(null);
                                          setQuotationEditor({ id: row.id, reference: row.reference, quotationDate: row.quotationDate.slice(0, 10), validityDate: row.validityDate.slice(0, 10), currencyCode: row.currencyCode, customerId: row.customer.id, description: row.description ?? "", lines: row.lines.map(mapLineToEditor) });
                                          setIsQuotationEditorOpen(true);
                                        }}>Edit</button>
                                        <span className="text-gray-300">|</span>
                                        <button type="button" className="text-xs font-semibold text-gray-600 hover:text-gray-900" onClick={() => approveQuotationMutation.mutate(row.id)}>Send</button>
                                      </>
                                    ) : row.status === "SENT" ? (
                                      <>
                                        <button type="button" className="text-xs font-semibold text-[#1D9E75] hover:text-[#15815e]" onClick={() => approveQuotationMutation.mutate(row.id)}>Approve</button>
                                        <span className="text-gray-300">|</span>
                                        <button type="button" className="text-xs font-semibold text-gray-600 hover:text-gray-900">PDF</button>
                                      </>
                                    ) : row.status === "APPROVED" ? (
                                      <>
                                        <button type="button" className="text-xs font-semibold text-sky-600 hover:text-sky-800" onClick={() => convertQuotationToOrderMutation.mutate(row.id)}>Convert</button>
                                        <span className="text-gray-300">|</span>
                                        <button type="button" className="text-xs font-semibold text-gray-600 hover:text-gray-900">PDF</button>
                                      </>
                                    ) : row.status === "EXPIRED" ? (
                                      <>
                                        <button type="button" className="text-xs font-semibold text-gray-600 hover:text-gray-900">Extend</button>
                                      </>
                                    ) : (
                                      <button type="button" className="text-xs font-semibold text-gray-600 hover:text-gray-900" onClick={() => setSelectedQuotationId(row.id)}>View</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                    <div className="text-xs text-gray-500">Showing 1 to {Math.min(10, quotations.length)} of {quotations.length} entries</div>
                    <div className="flex items-center gap-1">
                       <button className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">&lt;</button>
                       <button className="flex h-7 w-7 items-center justify-center rounded bg-[#1D9E75] text-white font-bold text-xs">1</button>
                       <button className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-bold text-xs">2</button>
                       <button className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-bold text-xs">3</button>
                       <span className="px-1 text-gray-400">...</span>
                       <button className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">&gt;</button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col border-gray-100 shadow-sm p-0 overflow-hidden">
                <div className="border-b border-gray-100 bg-white px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">Quotation Details</div>
                  <div className="text-xs text-gray-500">
                    {selectedQuotation ? selectedQuotation.reference : "Select a quotation to view details."}
                  </div>
                </div>
                {selectedQuotation ? (
                  <div className="flex flex-col flex-1 p-6 space-y-6 bg-gray-50/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xl font-bold text-gray-900">{selectedQuotation.reference}</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">{selectedQuotation.customer.name}</div>
                        <div className="text-xs text-gray-500">{selectedQuotation.customer.code}</div>
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider",
                        selectedQuotation.status === "APPROVED" ? "bg-green-100 text-green-700 border border-green-200" :
                        selectedQuotation.status === "DRAFT" ? "bg-gray-100 text-gray-600 border border-gray-200" :
                        selectedQuotation.status === "SENT" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                        selectedQuotation.status === "EXPIRED" ? "bg-red-100 text-red-700 border border-red-200" :
                        selectedQuotation.status === "CONVERTED" ? "bg-teal-100 text-teal-700 border border-teal-200" :
                        "bg-gray-100 text-gray-600 border border-gray-200"
                      )}>
                        {selectedQuotation.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                       <div>
                         <div className="text-xs text-gray-500 mb-1">Quotation Date</div>
                         <div className="font-semibold text-gray-900">{formatDate(selectedQuotation.quotationDate)}</div>
                       </div>
                       <div>
                         <div className="text-xs text-gray-500 mb-1">Valid Until</div>
                         <div className="font-semibold text-gray-900">{formatDate(selectedQuotation.validityDate)}</div>
                       </div>
                       <div>
                         <div className="text-xs text-gray-500 mb-1">Sales Rep</div>
                         <div className="font-semibold text-gray-900">Omar Khaled</div>
                       </div>
                    </div>

                    <div className="rounded-lg bg-white p-4 border border-gray-100 shadow-sm">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">Item Summary ({selectedQuotation.lines.length} items)</div>
                      <div className="space-y-3">
                        {selectedQuotation.lines.slice(0, 3).map((line) => (
                          <div key={line.id} className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                            <div className="pr-4">
                              <div className="text-[13px] font-semibold text-gray-900">{formatSalesLineTitle(line)}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5">Qty {line.quantity} | Unit Price {formatCurrency(line.unitPrice)}</div>
                            </div>
                            <div className="text-[13px] font-mono font-bold text-gray-900 whitespace-nowrap">{formatCurrency(line.lineAmount)}</div>
                          </div>
                        ))}
                      </div>
                      {selectedQuotation.lines.length > 3 && (
                         <div className="mt-3 pt-3 border-t border-gray-50">
                           <button className="text-xs font-semibold text-[#1D9E75] hover:underline">View all items</button>
                         </div>
                      )}
                    </div>

                    <div className="rounded-lg bg-white p-4 border border-gray-100 shadow-sm space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Subtotal</span>
                         <span className="font-mono font-semibold text-gray-900">{formatCurrency(selectedQuotation.totalAmount)}</span>
                       </div>
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Discount</span>
                         <span className="font-mono font-semibold text-gray-900">$0.00</span>
                       </div>
                       <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Tax</span>
                         <span className="font-mono font-semibold text-gray-900">$0.00</span>
                       </div>
                       <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100 mt-2">
                         <span className="text-gray-900">Total</span>
                         <span className="font-mono text-[#1D9E75]">{formatCurrency(selectedQuotation.totalAmount)}</span>
                       </div>
                    </div>

                    <div className="mt-auto pt-6 flex flex-col gap-2">
                      <Button 
                        className="w-full bg-[#1D9E75] hover:bg-[#15815e] text-white shadow-sm"
                        onClick={() => convertQuotationToOrderMutation.mutate(selectedQuotation.id)}
                      >
                        Convert to Sales Order
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-none">Edit</Button>
                        <Button className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-none">Download PDF</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 h-full text-center min-h-[300px]">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                      <FileText className="h-6 w-6 text-gray-300" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1">No quotation selected</div>
                    <div className="text-xs text-gray-500">Select a quotation from the list to view its full details and take actions.</div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === "orders" ? ("""

new_content = re.sub(start_pattern, replacement, content)

with open(file_path, "w") as f:
    f.write(new_content)

print("Replacement complete.")
