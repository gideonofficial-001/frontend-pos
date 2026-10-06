import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PaperWidth = '58mm' | '80mm'
export type FontSize = 'compact' | 'normal' | 'large'

export interface PrinterState {
  printerName: string
  paperWidth: PaperWidth
  printScale: number // e.g. 75, 80, 85, 90, 100, 110
  fontSize: FontSize
  autoPrintOnSale: boolean
  feedBlankLines: number
  storeName: string
  storeTagline: string
  footerNote: string
  showCashierName: boolean
  showCustomerDetails: boolean

  updateSettings: (settings: Partial<PrinterState>) => void
  resetToDefaults: () => void
  runTestPrint: () => void
}

const defaultState = {
  printerName: 'POS Thermal Printer (Default)',
  paperWidth: '58mm' as PaperWidth,
  printScale: 85, // 85% compact scale for standard POS
  fontSize: 'compact' as FontSize,
  autoPrintOnSale: true,
  feedBlankLines: 3,
  storeName: 'NJUGUSH ENTERPRISES',
  storeTagline: 'Quality LPG Gas & Electronics',
  footerNote: 'Thank you for your business! Goods once sold cannot be returned without original receipt.',
  showCashierName: true,
  showCustomerDetails: true,
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      updateSettings: (newSettings) => {
        set((state) => ({ ...state, ...newSettings }))
      },

      resetToDefaults: () => {
        set(defaultState)
      },

      runTestPrint: () => {
        const state = get()
        const is58mm = state.paperWidth === '58mm'
        const maxWidthPx = is58mm ? '216px' : '300px'
        const baseFontSize =
          state.fontSize === 'compact' ? '11px' : state.fontSize === 'large' ? '14px' : '12px'
        const scaleFactor = (state.printScale || 85) / 100

        const win = window.open('', '_blank', `width=360,height=580`)
        if (!win) return

        const blankLinesHtml = Array.from({ length: state.feedBlankLines || 2 })
          .map(() => '<br/>')
          .join('')

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Printer Test — ${state.printerName}</title>
  <style>
    @page {
      size: ${state.paperWidth} auto;
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
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: ${baseFontSize};
      color: #000;
      line-height: 1.25;
      zoom: ${scaleFactor};
      -webkit-print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .header-title {
      font-size: 1.25em;
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
      margin: 6px 0;
    }
    .double {
      border-top: 1px double #000;
      border-bottom: 1px double #000;
      height: 3px;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .badge-test {
      display: inline-block;
      border: 1px solid #000;
      padding: 2px 6px;
      font-weight: bold;
      font-size: 0.9em;
      margin: 4px 0;
    }
    @media print {
      body {
        margin: 0;
        padding: ${is58mm ? '2px 4px' : '6px 8px'};
      }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="header-title">${state.storeName}</div>
    ${state.storeTagline ? `<div class="sub">${state.storeTagline}</div>` : ''}
    <div class="sub">${new Date().toLocaleString('en-GB')}</div>
    <div class="dashed"></div>
    <div class="badge-test">*** TEST RECEIPT ***</div>
  </div>

  <div class="dashed"></div>
  <div class="row">
    <span>Printer:</span>
    <span class="bold">${state.printerName}</span>
  </div>
  <div class="row">
    <span>Paper Format:</span>
    <span><strong>${state.paperWidth}</strong> (${state.printScale}%)</span>
  </div>
  <div class="row">
    <span>Font Scale:</span>
    <span>${state.fontSize} (${baseFontSize})</span>
  </div>

  <div class="dashed"></div>
  <div class="bold" style="margin-bottom: 4px;">TEST TRANSACTION ITEMS:</div>
  <div class="row">
    <span>1x 6KG Refill (AfriGas)</span>
    <span>1,400.00</span>
  </div>
  <div class="row">
    <span>1x Low Pressure Regulator</span>
    <span>850.00</span>
  </div>
  <div class="row">
    <span>2x Cylinder Hose Clips</span>
    <span>100.00</span>
  </div>

  <div class="dashed"></div>
  <div class="row">
    <span>Subtotal:</span>
    <span>2,350.00</span>
  </div>
  <div class="row" style="color: #000;">
    <span>Discount:</span>
    <span>-50.00</span>
  </div>
  <div class="row bold" style="font-size: 1.15em; margin-top: 3px;">
    <span>TOTAL:</span>
    <span>KES 2,300.00</span>
  </div>

  <div class="dashed"></div>
  <div class="row">
    <span>Payment:</span>
    <span class="bold">CASH (PAID)</span>
  </div>
  ${
    state.showCashierName
      ? `<div class="row"><span>Cashier:</span><span>Admin (Test)</span></div>`
      : ''
  }

  <div class="dashed"></div>
  <div class="text-center sub" style="margin-top: 4px;">
    ${state.footerNote}
  </div>

  <div class="text-center" style="margin-top: 8px; font-weight: bold; font-size: 0.85em;">
    [ PRINTER ALIGNMENT TEST OK ]
  </div>
  <div class="text-center sub" style="font-size: 0.75em; margin-top: 4px;">
    --------------------------------
  </div>

  ${blankLinesHtml}

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`

        win.document.write(html)
        win.document.close()
      },
    }),
    {
      name: 'njugush-printer-settings',
    },
  ),
)
