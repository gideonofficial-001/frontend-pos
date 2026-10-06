import { formatCurrency } from './utils'

export interface DailyReportPrintData {
  title?: string
  date: string
  branchName: string
  retailSales: {
    items: any[]
    total: number
    discountTotal: number
    itemsCount: number
  }
  wholesaleSales: {
    items: any[]
    total: number
    discountTotal: number
    itemsCount: number
  }
  expenses: {
    items: any[]
    total: number
  }
  summary: {
    retailTotal: number
    wholesaleTotal: number
    totalDiscount: number
    grandTotal: number
    expenseTotal: number
    netTotal: number
  }
}

export function printDailyReport(data: DailyReportPrintData) {
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return

  const retailRows = data.retailSales.items.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${item.productName || item.productNameSnapshot}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.markedPrice)}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.sellingPrice)}</td>
      <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #16a34a;">${item.discount > 0 ? '-' + formatCurrency(item.discount) : '-'}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('')

  const wholesaleRows = data.wholesaleSales.items.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${item.productName || item.productNameSnapshot}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-style: italic;">${item.customerName || 'Walk-in'}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.markedPrice)}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.sellingPrice)}</td>
      <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${item.quantity}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; color: #16a34a;">${item.discount > 0 ? '-' + formatCurrency(item.discount) : '-'}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('')

  const expenseRows = data.expenses.items.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${item.category || item.expenseCategory}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${item.description || '-'}</td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('')

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Daily Sales Report — ${data.date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; }
          .header p { margin: 3px 0 0; color: #64748b; font-size: 13px; }
          .section { margin-top: 20px; }
          .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { background: #f8fafc; text-align: left; padding: 7px 8px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
          .total-box { margin-top: 24px; border: 2px solid #0f172a; border-radius: 6px; padding: 14px 18px; background: #f8fafc; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .total-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          @media print { body { padding: 8px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NJUGUSH ENTERPRISES</h1>
          <p>DAILY CLOSING & SALES RECONCILIATION REPORT</p>
          <p><strong>Date:</strong> ${data.date} &nbsp;|&nbsp; <strong>Branch:</strong> ${data.branchName}</p>
        </div>

        <div class="section">
          <div class="section-title">1. Retail Sales (${data.retailSales.itemsCount} units)</div>
          ${data.retailSales.items.length === 0 ? '<p style="color:#94a3b8; font-style:italic;">No retail sales recorded today.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: right;">Marked</th>
                  <th style="text-align: right;">Selling</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Disc</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${retailRows}</tbody>
              <tfoot>
                <tr>
                  <th colspan="5" style="text-align: right;">Retail Total</th>
                  <th style="text-align: right;">${formatCurrency(data.retailSales.total)}</th>
                </tr>
              </tfoot>
            </table>
          `}
        </div>

        <div class="section">
          <div class="section-title">2. Wholesale Sales (${data.wholesaleSales.itemsCount} units)</div>
          ${data.wholesaleSales.items.length === 0 ? '<p style="color:#94a3b8; font-style:italic;">No wholesale sales recorded today.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Client</th>
                  <th style="text-align: right;">Marked</th>
                  <th style="text-align: right;">Selling</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Disc</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${wholesaleRows}</tbody>
              <tfoot>
                <tr>
                  <th colspan="6" style="text-align: right;">Wholesale Total</th>
                  <th style="text-align: right;">${formatCurrency(data.wholesaleSales.total)}</th>
                </tr>
              </tfoot>
            </table>
          `}
        </div>

        <div class="section">
          <div class="section-title">3. Expenses Incurred</div>
          ${data.expenses.items.length === 0 ? '<p style="color:#94a3b8; font-style:italic;">No approved expenses recorded today.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>${expenseRows}</tbody>
              <tfoot>
                <tr>
                  <th colspan="2" style="text-align: right;">Expenses Total</th>
                  <th style="text-align: right; color:#dc2626;">${formatCurrency(data.expenses.total)}</th>
                </tr>
              </tfoot>
            </table>
          `}
        </div>

        <div class="total-box">
          <div class="total-row"><span>Retail Sales Total:</span><span>${formatCurrency(data.summary.retailTotal)}</span></div>
          <div class="total-row"><span>Wholesale Sales Total:</span><span>${formatCurrency(data.summary.wholesaleTotal)}</span></div>
          ${data.summary.totalDiscount > 0 ? `<div class="total-row" style="color: #16a34a;"><span>Total Discounts Applied:</span><span>- ${formatCurrency(data.summary.totalDiscount)}</span></div>` : ''}
          <div class="total-row" style="font-weight: 700;"><span>Gross Sales Total:</span><span>${formatCurrency(data.summary.grandTotal)}</span></div>
          <div class="total-row" style="color: #dc2626;"><span>Less Expenses Incurred:</span><span>- ${formatCurrency(data.summary.expenseTotal)}</span></div>
          <div class="total-row grand"><span>NET DAILY BALANCE:</span><span style="color: #16a34a;">${formatCurrency(data.summary.netTotal)}</span></div>
        </div>

        <div class="footer">
          Generated automatically by Njugush POS &bull; Printed ${new Date().toLocaleString('en-GB')}
        </div>
      </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => {
    win.print()
    win.onafterprint = () => win.close()
  }, 250)
}
