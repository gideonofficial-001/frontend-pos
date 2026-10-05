import { useState, useEffect } from 'react'
import { mpesaApi, salesApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Smartphone, Banknote, CheckCircle2, Loader2, AlertCircle, X, User, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export interface PaymentEntry {
  method: 'MPESA' | 'CASH'
  amount: number
  mpesaRef?: string
}

interface Props {
  total: number
  pendingSaleData?: any
  onConfirm: (payments: PaymentEntry[]) => void
  onStkComplete?: (sale: any) => void
  onClose: () => void
}

type MpesaStatus = 'idle' | 'sending' | 'pending' | 'confirmed' | 'failed'
type VerifyStatus = 'idle' | 'verifying' | 'verified' | 'unverified' | 'duplicate'

const s = {
  bg:         {},
  text:       {},
  subtext:    {},
  inputStyle: {},
  divider:    {},
  btnCancel:  {},
  btnWaiting: {},
  btnConfirm: {},
} as const

export function PaymentSplitModal({ total, pendingSaleData, onConfirm, onStkComplete, onClose }: Props) {
  const [mpesaAmount, setMpesaAmount] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const [mpesaStatus, setMpesaStatus]     = useState<MpesaStatus>('idle')
  const [verifyStatus, setVerifyStatus]   = useState<VerifyStatus>('idle')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)
  const [mpesaRef, setMpesaRef]           = useState<string>('')
  const [customerName, setCustomerName]   = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<string>('Payment failed or was cancelled.')
  const [mpesaReceiptInput, setMpesaReceiptInput] = useState('')
  const [pollCount, setPollCount]         = useState(0)

  const mpesaAmt       = Number(mpesaAmount) || 0
  const cashAmt        = Math.max(0, total - mpesaAmt)
  const needsMpesa     = mpesaAmt > 0
  const mpesaConfirmed = mpesaStatus === 'confirmed'
  // Allow confirm when: no M-Pesa needed, OR M-Pesa confirmed via STK, OR manual receipt verified/unverified (not duplicate)
  const canConfirm     = !needsMpesa || mpesaConfirmed || verifyStatus === 'verified' || verifyStatus === 'unverified'
  const isManualFlow   = verifyStatus !== 'idle'

  // ── Computed outside JSX to avoid TS control-flow narrowing errors ────────
  const confirmDisabled = !canConfirm || verifyStatus === 'duplicate'
  const confirmLabel =
    needsMpesa && !mpesaConfirmed && verifyStatus === 'idle'
      ? 'Awaiting M-Pesa…'
      : verifyStatus === 'unverified'
        ? 'Proceed (Unverified)'
        : `Confirm ${formatCurrency(total)}`

  // ── Phone normalization ───────────────────────────────────────────────────
  const formatPhone = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('0') && digits.length === 10)  return '254' + digits.slice(1)
    if (digits.startsWith('254') && digits.length === 12) return digits
    if (digits.startsWith('7') && digits.length === 9)    return '254' + digits
    return null
  }

  // ── STK Push (Initiates PENDING Sale FIRST) ───────────────────────────────
  const handleSendStk = async () => {
    const formatted = formatPhone(phone)
    if (!formatted) {
      setPhoneError('Enter a valid Kenyan number (07xx or 254xx)')
      return
    }
    setPhoneError('')
    setMpesaStatus('sending')
    setVerifyStatus('idle')
    setPollCount(0)
    setCustomerName(null)
    setFailureReason('Payment failed or was cancelled.')
    try {
      let reqId = ''
      if (pendingSaleData) {
        const salePayload = {
          ...pendingSaleData,
          payments: [
            { method: 'MPESA', amount: mpesaAmt, phoneNumber: formatted },
            ...(cashAmt > 0 ? [{ method: 'CASH', amount: cashAmt }] : []),
          ],
          isStkPending: true,
        }
        const res = await salesApi.create(salePayload)
        reqId = res.data.checkoutRequestId
        setPendingSaleId(res.data.id)
      } else {
        const res = await mpesaApi.stkPush(formatted, mpesaAmt)
        reqId = res.data.checkoutRequestId
      }
      setCheckoutRequestId(reqId)
      setMpesaStatus('pending')
      toast.info(`STK push sent to ${phone}. Waiting for customer PIN…`)
    } catch (err: any) {
      setMpesaStatus('failed')
      toast.error(err.response?.data?.message || 'Failed to send STK push')
    }
  }

  // ── Poll status ───────────────────────────────────────────────────────────
  const checkStatus = async () => {
    if (!checkoutRequestId) return false
    try {
      const res = await mpesaApi.getStatus(checkoutRequestId)
      const { status, receiptNumber, customerName: name, resultDesc, sale } = res.data
      if (status === 'COMPLETED') {
        const finalRef = receiptNumber || checkoutRequestId
        setMpesaRef(finalRef)
        setCustomerName(name || null)
        setMpesaStatus('confirmed')
        toast.success(`M-Pesa confirmed! Receipt: ${finalRef}`)
        if (sale && onStkComplete) {
          setTimeout(() => {
            onStkComplete(sale)
          }, 600)
        }
        return true
      } else if (status === 'FAILED') {
        setFailureReason(resultDesc || 'Payment failed or was cancelled.')
        setMpesaStatus('failed')
        return true
      }
      return false
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (mpesaStatus !== 'pending' || !checkoutRequestId) return
    if (pollCount >= 35) {
      setMpesaStatus('failed')
      setFailureReason('Payment timed out waiting for customer PIN. If payment was completed, click "Check Status Again" or enter the receipt code below.')
      toast.error('Payment timed out.')
      return
    }
    const timer = setTimeout(async () => {
      const finished = await checkStatus()
      if (!finished) {
        setPollCount(c => c + 1)
      }
    }, 3500)
    return () => clearTimeout(timer)
  }, [mpesaStatus, checkoutRequestId, pollCount])

  // ── Manual receipt verification — calls backend ───────────────────────────
  const handleManualVerify = async () => {
    const clean = mpesaReceiptInput.trim().toUpperCase()
    if (clean.length < 6) {
      toast.error('Enter a valid M-Pesa receipt code')
      return
    }
    setVerifyStatus('verifying')
    try {
      const res = await mpesaApi.verifyManualReceipt(clean, mpesaAmt)
      const { verified, alreadyUsed } = res.data

      if (alreadyUsed) {
        setVerifyStatus('duplicate')
        toast.error('This receipt is already linked to another sale.')
        return
      }

      setMpesaRef(clean)
      setVerifyStatus(verified ? 'verified' : 'unverified')
      if (verified) {
        toast.success('Receipt verified — found in system.')
      } else {
        toast.warning('Receipt not in system — flagged for manager reconciliation.')
      }
    } catch {
      setVerifyStatus('idle')
      toast.error('Could not verify receipt. Check your connection and try again.')
    }
  }

  // ── Final confirm (Immediate CASH or verified manual MPESA) ───────────────
  const handleConfirm = () => {
    const payments: PaymentEntry[] = []
    if (mpesaAmt > 0) payments.push({
      method:   'MPESA',
      amount:   mpesaAmt,
      mpesaRef: mpesaRef || undefined,
    })
    if (cashAmt > 0) payments.push({ method: 'CASH', amount: cashAmt })
    onConfirm(payments)
  }

  const handleCancel = () => {
    if (pendingSaleId && mpesaStatus === 'pending') {
      salesApi.cancel(pendingSaleId).catch(() => {})
    }
    onClose()
  }

  const resetManual = () => {
    setMpesaReceiptInput('')
    setVerifyStatus('idle')
    setMpesaRef('')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="sm:max-w-sm bg-card text-card-foreground border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Payment</DialogTitle>
        </DialogHeader>

        {/* Total */}
        <div className="rounded-xl bg-slate-900 dark:bg-emerald-950/60 text-white border border-slate-700 dark:border-emerald-500/30 p-4 text-center">
          <p className="text-sm opacity-70 uppercase tracking-wider">Total Due</p>
          <p className="text-3xl font-black">{formatCurrency(total)}</p>
        </div>

        {/* M-Pesa amount */}
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            M-Pesa Amount (KES)
          </label>
          <Input
            type="number" min={0} max={total} placeholder="0"
            value={mpesaAmount}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), total)
              setMpesaAmount(String(v || ''))
              setMpesaStatus('idle')
              setVerifyStatus('idle')
              setCheckoutRequestId(null)
              setMpesaRef('')
              setCustomerName(null)
            }}
          />
        </div>

        {/* Cash amount */}
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-white" />
            </div>
            Cash Amount (KES)
          </label>
          <div className="h-10 px-3 flex items-center rounded-md border font-bold text-sm bg-muted text-foreground">
            {formatCurrency(cashAmt)}
          </div>
        </div>

        {/* STK section */}
        {needsMpesa && (
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">M-Pesa — {formatCurrency(mpesaAmt)}</span>
              {(mpesaConfirmed || verifyStatus === 'verified') && (
                <span className="flex items-center gap-1 text-xs text-green-700 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Confirmed
                </span>
              )}
              {verifyStatus === 'unverified' && (
                <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-emerald-400 font-bold">
                  <ShieldAlert className="w-4 h-4" /> Unverified
                </span>
              )}
            </div>

            <div className="p-4 space-y-3" style={s.bg}>

              {/* ── STK confirmed (via polling) ── */}
              {mpesaConfirmed && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-800">Payment received!</p>
                    <p className="text-xs text-green-700 font-mono mt-0.5">{mpesaRef}</p>
                    {customerName && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-green-200">
                        <User className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <p className="text-xs font-semibold text-green-800">{customerName}</p>
                      </div>
                    )}
                  </div>
                  <button className="text-green-600 hover:text-green-800 shrink-0"
                    onClick={() => { setMpesaStatus('idle'); setMpesaRef(''); setCustomerName(null) }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Manual verified ── */}
              {verifyStatus === 'verified' && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">Receipt verified in system</p>
                    <p className="text-xs font-mono text-green-700 mt-0.5">{mpesaRef}</p>
                  </div>
                  <button className="text-green-600 hover:text-green-800 shrink-0" onClick={resetManual}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Manual unverified — logged for manager reconciliation ── */}
              {verifyStatus === 'unverified' && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-emerald-950/20 rounded-lg border border-amber-200 dark:border-emerald-500/40">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800 dark:text-emerald-200">Receipt not found in system</p>
                    <p className="text-xs text-amber-700 dark:text-emerald-300/80 mt-0.5">Logged for manager reconciliation. Proceed only if you physically confirmed payment.</p>
                    <p className="text-xs font-mono text-amber-800 dark:text-emerald-200 mt-1">{mpesaRef}</p>
                  </div>
                  <button className="text-amber-600 hover:text-amber-800 dark:text-emerald-400 dark:hover:text-emerald-200 shrink-0" onClick={resetManual}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Duplicate receipt error ── */}
              {verifyStatus === 'duplicate' && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-500/40">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800 dark:text-red-300">Receipt already used</p>
                    <p className="text-xs text-red-700 dark:text-red-300/80 mt-0.5">This receipt is linked to an existing sale. Do not proceed.</p>
                  </div>
                  <button className="text-red-600 hover:text-red-800 dark:text-red-400 shrink-0" onClick={resetManual}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Phone + send (hidden once any confirmation is reached) ── */}
              {!mpesaConfirmed && !isManualFlow && (
                <>
                  <div>
                    <p className="text-xs font-semibold mb-1 text-muted-foreground">Customer's Phone Number</p>
                    <div className="flex gap-2">
                      <Input
                        type="tel" placeholder="0712 345 678"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setPhoneError('') }}
                        disabled={mpesaStatus === 'sending' || mpesaStatus === 'pending'}
                      />
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                        onClick={handleSendStk}
                        disabled={!phone || mpesaStatus === 'sending' || mpesaStatus === 'pending'}
                      >
                        {mpesaStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                      </Button>
                    </div>
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                  </div>

                  {mpesaStatus === 'pending' && (
                    <div className="p-3 bg-amber-50 dark:bg-emerald-950/20 rounded-lg border border-amber-200 dark:border-emerald-500/40">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-emerald-200">Waiting for payment…</p>
                            <p className="text-xs text-amber-600 dark:text-emerald-400">Customer should enter their PIN on phone</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 bg-card border-amber-300 dark:border-emerald-500/40 text-amber-900 dark:text-emerald-300 hover:bg-amber-100 dark:hover:bg-emerald-950/40 shrink-0"
                          onClick={() => checkStatus()}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" /> Check Now
                        </Button>
                      </div>
                    </div>
                  )}

                  {mpesaStatus === 'failed' && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-500/40 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 dark:text-red-300">{failureReason}</p>
                      </div>
                      {checkoutRequestId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-8 bg-card border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40"
                          onClick={() => {
                            setMpesaStatus('pending')
                            setPollCount(0)
                            checkStatus()
                          }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" /> Check Status Again
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Manual receipt — only shown after STK pending/failed */}
                  {(mpesaStatus === 'pending' || mpesaStatus === 'failed') && (
                    <div>
                      <p className="text-xs font-semibold mb-1 text-muted-foreground">
                        Or enter M-Pesa receipt code manually:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. RCK1AB23DE"
                          value={mpesaReceiptInput}
                          onChange={(e) => setMpesaReceiptInput(e.target.value.toUpperCase())}
                          className="font-mono uppercase tracking-wider"
                        />
                        <Button
                          onClick={handleManualVerify}
                          variant="secondary"
                          className="shrink-0"
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1 h-10">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="flex-1 h-10 font-bold"
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
