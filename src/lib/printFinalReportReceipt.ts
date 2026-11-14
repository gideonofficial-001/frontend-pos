import { formatCurrency } from './utils'
import { usePrinterStore } from '@/store/printer'

export interface FinalReportReceiptData {
  storeName?: string
  branchName: string
  date: string
  retailTotal?: number
  wholesaleTotal?: number
  netSales: number
  paybillTotal: number
  difference1: number
  expenseTotal: number
  pettyCashTotal?: number
  regularExpenseTotal?: number
  difference2: number
  amountToBeSubmittedCash: number
  cashierName?: string
  paperWidth?: '58mm' | '80mm'
  printScale?: number
}

export function printFinalReportReceipt(data: FinalReportReceiptData) {
  const printerState = usePrinterStore.getState()
  const paperWidth = data.paperWidth || printerState.paperWidth || '58mm'
  const is58mm = paperWidth === '58mm'
  const maxWidthPx = is58mm ? '216px' : '300px'
  const scale = (data.printScale || printerState.printScale || 85) / 100
  const storeName = data.storeName || printerState.storeName || 'NJUGUSH ENT'

  const win = window.open('', '_blank', 'width=380,height=600')
  if (!win) return

  const branchLabel = data.branchName ? data.branchName.toUpperCase() : 'STORE'
  const formattedDate = data.date || new Date().toLocaleDateString('en-GB')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Final Report — ${formattedDate}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: ${is58mm ? '4px 6px' : '8px 12px'};
      width: ${maxWidthPx};
      max-width: ${maxWidthPx};
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58mm ? '11px' : '12px'};
      color: #000;
      line-height: 1.25;
      zoom: ${scale};
      -webkit-print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .header-title {
      font-size: 1.15em;
      font-weight: 900;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub {
      font-size: 0.85em;
      color: #333;
    }
    .dashed {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 4px 0;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 3px;
    }
    .indent {
      padding-left: 8px;
      font-size: 0.9em;
      color: #444;
    }
    .highlight-box {
      border: 2px solid #000;
      padding: 6px 4px;
      margin: 8px 0;
      text-align: center;
      background: #f4f4f4;
    }
    @media print {
      body {
        padding: 2px 4px;
      }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="header-title">${storeName} (${branchLabel})</div>
    <div class="sub">${formattedDate}</div>
    <div class="bold" style="margin-top: 4px; font-size: 1.05em;">&gt; Final Report</div>
  </div>

  <div class="dashed"></div>

  <!-- Net Sales -->
  <div class="row bold">
    <span>Net sales (retail + wholesale)</span>
  </div>
  <div class="row bold">
    <span>Total Sales:</span>
    <span>${formatCurrency(data.netSales)}</span>
  </div>

  <!-- Amount paid to paybill -->
  <div class="row" style="margin-top: 4px;">
    <span>Amount paid to pay bill</span>
    <span>- ${formatCurrency(data.paybillTotal)}</span>
  </div>

  <div class="dashed"></div>

  <!-- Difference 1 -->
  <div class="row bold">
    <span>{Difference 1}</span>
    <span>${formatCurrency(data.difference1)}</span>
  </div>

  <!-- Day's expenses -->
  <div class="row" style="margin-top: 4px;">
    <span>Day's Expenses (petty cash inclusive)</span>
    <span>- ${formatCurrency(data.expenseTotal)}</span>
  </div>

  <div class="dashed"></div>

  <!-- Difference 2 -->
  <div class="row bold">
    <span>{Difference 2}</span>
    <span>${formatCurrency(data.difference2)}</span>
  </div>

  <div class="double" style="text-align: center;">
    <div class="sub bold">Amount to be submitted cash =</div>
    <div class="font-black" style="font-size: 1.25em; margin-top: 2px;">
      ${formatCurrency(data.amountToBeSubmittedCash)}
    </div>
  </div>

  ${data.cashierName ? `
    <div class="text-center sub" style="margin-top: 6px;">
      Submitted by: ${data.cashierName}
    </div>
  ` : ''}

  <div class="text-center sub" style="margin-top: 4px; font-size: 9px; color: #555;">
    Printed: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} &bull; Njugush POS
  </div>

  <div class="text-center" style="margin-top: 8px; font-size: 8px; letter-spacing: 2px; color: #888;">
    -- END OF DAY REPORT --
  </div>
</body>
</html>`

  win.document.write(html)
  win.document.close()
  setTimeout(() => {
    win.print()
    win.onafterprint = () => win.close()
  }, 250)
}
