import { useState } from 'react'
import { usePrinterStore, PaperWidth, FontSize } from '@/store/printer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Printer, Check, RotateCcw, Sliders, Smartphone,
  FileText, Sparkles, CheckCircle2, Eye, ShieldCheck, ArrowRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PrinterSetup() {
  const printerStore = usePrinterStore()

  const [printerName, setPrinterName] = useState(printerStore.printerName)
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(printerStore.paperWidth)
  const [printScale, setPrintScale] = useState<number>(printerStore.printScale)
  const [fontSize, setFontSize] = useState<FontSize>(printerStore.fontSize)
  const [autoPrintOnSale, setAutoPrintOnSale] = useState(printerStore.autoPrintOnSale)
  const [feedBlankLines, setFeedBlankLines] = useState(printerStore.feedBlankLines)
  const [storeName, setStoreName] = useState(printerStore.storeName)
  const [storeTagline, setStoreTagline] = useState(printerStore.storeTagline)
  const [footerNote, setFooterNote] = useState(printerStore.footerNote)
  const [showCashierName, setShowCashierName] = useState(printerStore.showCashierName)
  const [showCustomerDetails, setShowCustomerDetails] = useState(printerStore.showCustomerDetails)

  const handleSave = () => {
    printerStore.updateSettings({
      printerName,
      paperWidth,
      printScale,
      fontSize,
      autoPrintOnSale,
      feedBlankLines,
      storeName,
      storeTagline,
      footerNote,
      showCashierName,
      showCustomerDetails,
    })
    toast.success('Thermal printer settings saved successfully!')
  }

  const handleReset = () => {
    printerStore.resetToDefaults()
    const def = usePrinterStore.getState()
    setPrinterName(def.printerName)
    setPaperWidth(def.paperWidth)
    setPrintScale(def.printScale)
    setFontSize(def.fontSize)
    setAutoPrintOnSale(def.autoPrintOnSale)
    setFeedBlankLines(def.feedBlankLines)
    setStoreName(def.storeName)
    setStoreTagline(def.storeTagline)
    setFooterNote(def.footerNote)
    setShowCashierName(def.showCashierName)
    setShowCustomerDetails(def.showCustomerDetails)
    toast.info('Printer settings reset to compact 58mm defaults')
  }

  const scaleOptions = [
    { label: '75% (Ultra Compact)', value: 75, desc: 'Tightest format for small 48mm-58mm paper rolls' },
    { label: '85% (Compact POS)', value: 85, desc: 'Standard optimal ratio for 58mm POS thermal printers' },
    { label: '90% (Medium)', value: 90, desc: 'Balanced readability and paper economy' },
    { label: '100% (1:1 Standard)', value: 100, desc: 'Full-size thermal text' },
    { label: '110% (Enlarged)', value: 110, desc: 'Large print for high visibility' },
  ]

  const is58mm = paperWidth === '58mm'
  const previewWidthPx = is58mm ? 220 : 310

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-primary" />
            Thermal Printer Setup & Calibration
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure paper width, scaling ratio, receipt typography, and perform live print tests.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </Button>
          <Button
            onClick={() => {
              handleSave()
              printerStore.runTestPrint()
            }}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            <Printer className="w-4 h-4" /> Save & Test Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings Cards */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Paper Format & Width */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Paper Width & Hardware Format
              </CardTitle>
              <CardDescription>
                Choose the paper roll size for your thermal receipt printer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 58mm Option */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paperWidth === '58mm'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-muted hover:border-muted-foreground/30 bg-card'
                  }`}
                  onClick={() => setPaperWidth('58mm')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={paperWidth === '58mm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                      58mm (2-Inch)
                    </Badge>
                    {paperWidth === '58mm' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="font-bold text-sm">Compact POS (Recommended)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard for compact thermal printers (e.g., portable Bluetooth & countertop till printers). Conserves paper.
                  </p>
                </div>

                {/* 80mm Option */}
                <div
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paperWidth === '80mm'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-muted hover:border-muted-foreground/30 bg-card'
                  }`}
                  onClick={() => setPaperWidth('80mm')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={paperWidth === '80mm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                      80mm (3-Inch)
                    </Badge>
                    {paperWidth === '80mm' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="font-bold text-sm">Standard POS</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Wider paper format used on heavy-duty restaurant & supermarket receipt printers (Epson TM-T88 etc.).
                  </p>
                </div>
              </div>

              {/* Printer Alias / Name */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold">Printer Device Name / Identifier</Label>
                <Input
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  placeholder="e.g. POS-58 USB / Bluetooth Thermal"
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Scale Ratio & Sizing */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Printing Ratio & Scale
              </CardTitle>
              <CardDescription>
                Prevents huge receipts by scaling the output percentage to fit your thermal roll.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Scale Ratio: <strong className="text-primary">{printScale}%</strong></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scaleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPrintScale(opt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        printScale === opt.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-muted hover:bg-muted/40 text-muted-foreground text-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{opt.label}</span>
                        {printScale === opt.value && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] font-normal text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Receipt Font Size</Label>
                <div className="flex gap-2">
                  {(['compact', 'normal', 'large'] as FontSize[]).map((f) => (
                    <Button
                      key={f}
                      type="button"
                      variant={fontSize === f ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFontSize(f)}
                      className="flex-1 capitalize text-xs h-8"
                    >
                      {f} ({f === 'compact' ? '11px' : f === 'large' ? '14px' : '12px'})
                    </Button>
                  ))}
                </div>
              </div>

              {/* Feed Blank Lines */}
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Paper Feed Lines Before Tear/Cut</Label>
                  <span className="text-xs font-mono font-bold">{feedBlankLines} lines</span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      size="sm"
                      variant={feedBlankLines === num ? 'default' : 'outline'}
                      onClick={() => setFeedBlankLines(num)}
                      className="h-8 w-10 text-xs"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Leaves enough margin for manual tearing or automatic cutter blades.</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Header, Footer & Behavior */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Receipt Branding & Content
              </CardTitle>
              <CardDescription>
                Customize store name, tagline, and customer policy notes on the printed receipt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Store / Header Title</Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="NJUGUSH ENTERPRISES"
                  className="h-9 text-sm uppercase tracking-wide font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tagline / Subheader</Label>
                <Input
                  value={storeTagline}
                  onChange={(e) => setStoreTagline(e.target.value)}
                  placeholder="Quality LPG Gas & Electronics"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Footer Return Policy / Thank You Note</Label>
                <Input
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  placeholder="Thank you for your business! Goods once sold..."
                  className="h-9 text-sm"
                />
              </div>

              <div className="pt-2 border-t space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrintOnSale}
                    onChange={(e) => setAutoPrintOnSale(e.target.checked)}
                    className="rounded border-muted text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Automatically open Print dialog immediately upon sale completion</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCashierName}
                    onChange={(e) => setShowCashierName(e.target.checked)}
                    className="rounded border-muted text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Display cashier / attendant name on receipt</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCustomerDetails}
                    onChange={(e) => setShowCustomerDetails(e.target.checked)}
                    className="rounded border-muted text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Display customer name and phone on receipt (if registered)</span>
                </label>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t flex justify-end gap-2">
              <Button onClick={handleSave} className="font-bold">
                Save Printer Preferences
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Live Thermal Preview & Test Print Button */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-primary/20 shadow-md sticky top-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Live Thermal Preview
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {paperWidth} &bull; {printScale}%
                </Badge>
              </div>
              <CardDescription>
                Simulated appearance on actual thermal roll.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {/* Paper roll simulation */}
              <div
                className="bg-white text-black font-mono shadow-md border rounded-t-sm p-3 border-dashed border-slate-400 text-xs transition-all overflow-hidden"
                style={{
                  width: `${previewWidthPx}px`,
                  fontSize: fontSize === 'compact' ? '10px' : fontSize === 'large' ? '13px' : '11px',
                  lineHeight: '1.25',
                  transform: `scale(${printScale / 100})`,
                  transformOrigin: 'top center',
                  marginBottom: `${Math.max(0, (printScale / 100 - 1) * 300)}px`,
                }}
              >
                <div className="text-center space-y-0.5">
                  <p className="font-black text-sm uppercase tracking-wider">{storeName || 'NJUGUSH POS'}</p>
                  {storeTagline && <p className="text-[10px] text-slate-600">{storeTagline}</p>}
                  <p className="text-[10px] text-slate-500">{new Date().toLocaleDateString('en-GB')}</p>
                  <p className="font-bold text-[11px] pt-1">SALE #SAMPLE-123</p>
                </div>

                {showCustomerDetails && (
                  <div className="border-t border-dashed border-slate-400 pt-1.5 mt-2 text-[10px]">
                    Customer: <strong>Walk-in Retail</strong>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-400 pt-1.5 mt-1.5 space-y-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">6KG AfriGas Refill</p>
                      <p className="text-[9px] text-slate-600">1 x 1,400.00</p>
                    </div>
                    <p className="font-bold text-right">1,400.00</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">LPG Regulator 30mbar</p>
                      <p className="text-[9px] text-slate-600">1 x 850.00</p>
                    </div>
                    <p className="font-bold text-right">850.00</p>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1.5 mt-1.5 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>2,250.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-50.00</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                    <span>TOTAL:</span>
                    <span>KES 2,200.00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1.5 mt-1.5">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span>PAID VIA:</span>
                    <span>M-PESA (QE123456)</span>
                  </div>
                </div>

                {showCashierName && (
                  <div className="text-center text-[10px] text-slate-600 mt-2">
                    Attendant: Cashier Demo
                  </div>
                )}

                <div className="border-t border-dashed border-slate-400 pt-2 mt-2 text-center text-[9px] text-slate-700">
                  {footerNote}
                </div>

                <div className="text-center text-[8px] text-slate-400 mt-2 tracking-widest">
                  -- NJUGUSH POS CUT --
                </div>
              </div>

              {/* Action test button */}
              <div className="w-full pt-4 space-y-2">
                <Button
                  onClick={() => {
                    handleSave()
                    printerStore.runTestPrint()
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 gap-2 shadow-md"
                >
                  <Printer className="w-5 h-5" /> Test Print Receipt Now
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Triggers your system's print dialog to test connection and alignment with your physical POS printer.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
