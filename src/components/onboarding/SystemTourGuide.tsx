import { useEffect } from 'react'
import { useTourStore } from '@/store/tour'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X, ChevronRight, ChevronLeft, Sparkles, LayoutDashboard, ShoppingCart,
  PackageSearch, ArrowLeftRight, BarChart3, ShieldCheck, Check, SlidersHorizontal,
  Printer, ArrowRight, Grid, List, Receipt, Smartphone
} from 'lucide-react'

interface TourStep {
  id: string
  badge: string
  title: string
  subtitle: string
  icon: any
  description: string
  highlights: { title: string; desc: string }[]
  preview: React.ReactNode
}

const TOUR_STORAGE_KEY = 'pos_onboarding_tour_completed'

export function SystemTourGuide() {
  const { user } = useAuthStore()
  const { isOpen, currentStep, openTour, closeTour, nextStep, prevStep, setStep } = useTourStore()

  // Auto-launch tour on first-time login
  useEffect(() => {
    if (user) {
      const hasCompletedTour = localStorage.getItem(TOUR_STORAGE_KEY)
      if (!hasCompletedTour) {
        openTour(0)
      }
    }
  }, [user, openTour])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (currentStep < steps.length - 1) nextStep()
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) prevStep()
      } else if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep])

  const handleDismiss = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    closeTour()
  }

  const steps: TourStep[] = [
    {
      id: 'navigation',
      badge: 'Smart Navigation',
      title: 'Real-Time Navigation & Badges',
      subtitle: 'Instant visibility on pending tasks across the system',
      icon: LayoutDashboard,
      description:
        'The collapsible sidebar automatically scopes tools to your role. Dynamic notification badges update in real-time for pending approvals, returns, expenses, and active cart items.',
      highlights: [
        { title: 'Live Badge Counters', desc: 'Shows pending transfers, returns, expenses, and cart quantities.' },
        { title: 'Role-Based Access', desc: 'Super Admins, Overall Managers, and Branch staff see dedicated views.' },
        { title: 'Fast Mobile Collapsing', desc: 'Sidebar effortlessly collapses to provide maximum screen workspace.' },
      ],
      preview: (
        <div className="bg-muted/40 border rounded-xl p-3 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-2 rounded-lg bg-background border shadow-xs">
            <span className="flex items-center gap-2 font-sans font-medium text-foreground">
              <ShoppingCart className="w-4 h-4 text-primary" /> Active Cart
            </span>
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">3 items</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-background border shadow-xs">
            <span className="flex items-center gap-2 font-sans font-medium text-foreground">
              <Receipt className="w-4 h-4 text-amber-500" /> Pending Approvals
            </span>
            <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">2 pending</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-background border shadow-xs">
            <span className="flex items-center gap-2 font-sans font-medium text-foreground">
              <Smartphone className="w-4 h-4 text-emerald-500" /> Authorized Devices
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">Active</Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'pos_sales',
      badge: 'Point of Sale',
      title: 'Express POS & Direct Quantity Entry',
      subtitle: 'Type product quantities directly & switch layout views',
      icon: ShoppingCart,
      description:
        'Checkout faster than ever. Instead of clicking the plus button repeatedly, type any desired quantity directly into the cart. Switch between compact Grid and List modes to customize your workspace.',
      highlights: [
        { title: 'Direct Quantity Input', desc: 'Click inside the quantity box and type 10, 50, or any amount instantly.' },
        { title: 'Grid vs List Modes', desc: 'Toggle product layouts to prioritize product photos or dense line lists.' },
        { title: 'LPG Gas Intelligence', desc: 'Automatic detection of gas refills vs complete cylinder sets.' },
      ],
      preview: (
        <div className="bg-muted/40 border rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-muted-foreground font-medium">Cart Quantity Control</span>
            <div className="flex items-center gap-1 bg-background border rounded px-1.5 py-0.5">
              <Grid className="w-3 h-3 text-primary" />
              <span className="text-[10px]">Grid</span>
              <span className="text-muted-foreground">|</span>
              <List className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">List</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
            <div>
              <p className="font-semibold text-foreground">K-Gas 13kg (Refill)</p>
              <p className="text-[11px] text-muted-foreground">KES 3,100 / unit</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center rounded bg-muted font-bold text-muted-foreground">-</span>
              <span className="px-2.5 py-0.5 border-2 border-primary rounded font-bold text-primary bg-primary/5">25</span>
              <span className="w-6 h-6 flex items-center justify-center rounded bg-muted font-bold text-muted-foreground">+</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'inventory_adjustments',
      badge: 'Stock Control',
      title: 'Inventory & Stock Adjustments',
      subtitle: 'Track live branch quantities and authorized corrections',
      icon: PackageSearch,
      description:
        'Monitor stock levels across all branches in real-time. Branch Managers and Admins can log authorized adjustments for damages, shrinkage, or audit discrepancies with full audit notes.',
      highlights: [
        { title: 'Branch Scoping', desc: 'Staff manage their branch inventory while managers audit all locations.' },
        { title: 'Stock Adjustments', desc: 'Audit trails with reasons, item timestamps, and manager authorizations.' },
        { title: 'Closing Stock Audits', desc: 'Perform end-of-shift physical counts to prevent inventory loss.' },
      ],
      preview: (
        <div className="bg-muted/40 border rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Branch Inventory</span>
            <span className="font-semibold text-emerald-600">Live In-Stock</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-background border">
              <span className="text-[10px] text-muted-foreground uppercase">Wholesale Rice (50kg)</span>
              <p className="text-base font-bold text-foreground mt-0.5">142 Bags</p>
              <span className="text-[10px] text-emerald-600 font-medium">Healthy Stock</span>
            </div>
            <div className="p-2 rounded-lg bg-background border">
              <span className="text-[10px] text-muted-foreground uppercase">Cooking Oil 20L</span>
              <p className="text-base font-bold text-foreground mt-0.5">12 Jerricans</p>
              <span className="text-[10px] text-amber-500 font-medium">Re-order Soon</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'transfers',
      badge: 'Inter-Branch',
      title: 'Intra-Branch Stock Transfers',
      subtitle: 'Transfer items between branches with full completed histories',
      icon: ArrowLeftRight,
      description:
        'Move products seamlessly between branches. Staff confirm items line-by-line upon arrival, while Super Admins and Overall Managers have instant access to completed transfer history archives.',
      highlights: [
        { title: 'Completed History Audit', desc: 'Admin and Overall Manager views strictly highlight completed transfers.' },
        { title: 'Line-by-Line Acceptance', desc: 'Receiving branches accept or reject individual items with notes.' },
        { title: 'Multi-Branch Filtering', desc: 'Filter transfer archives by date, sending branch, or receiving branch.' },
      ],
      preview: (
        <div className="bg-muted/40 border rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Main Store → Nairobi CBD</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
              Completed
            </Badge>
          </div>
          <div className="p-2 rounded-lg bg-background border space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Sugar 50kg × 10</span>
              <span className="text-emerald-600 font-semibold">Accepted</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Cooking Oil 5L × 20</span>
              <span className="text-emerald-600 font-semibold">Accepted</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'daily_reports',
      badge: 'Reconciliation',
      title: 'Daily Reports & Live Receipt Simulation',
      subtitle: 'Automatic Paybill vs Cash calculation & thermal printout',
      icon: BarChart3,
      description:
        'Submit daily cash without manual math errors. The live end-of-day report dynamically subtracts Paybill collections and petty cash expenses from net sales to determine the exact cash to be submitted.',
      highlights: [
        { title: 'Net Sales Formula', desc: 'Net Sales (Retail + Wholesale) minus Paybill amount gives Difference 1.' },
        { title: 'Final Cash Submission', desc: 'Difference 1 minus petty cash expenses gives the exact submission cash.' },
        { title: 'Live Thermal Simulation', desc: 'Clean receipt simulation at the bottom of the reports page.' },
      ],
      preview: (
        <div className="bg-zinc-950 text-zinc-100 rounded-xl p-3 font-mono text-[11px] space-y-1 shadow-inner border border-zinc-800">
          <div className="text-center font-bold pb-1 border-b border-dashed border-zinc-700">
            NJUGUSH ENT. · FINAL REPORT
          </div>
          <div className="flex justify-between pt-1">
            <span>Net Sales:</span>
            <span>KES 54,000</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Paid to Paybill:</span>
            <span>- KES 32,000</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Day's Expenses:</span>
            <span>- KES 4,500</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-dashed border-zinc-700 font-bold text-emerald-400">
            <span>Amount Cash:</span>
            <span>KES 17,500</span>
          </div>
        </div>
      ),
    },
    {
      id: 'security_themes',
      badge: 'Security & Theme',
      title: 'Device Verification & Dark Themes',
      subtitle: 'Hardware fingerprinting, OTP access, & Dark Cyan themes',
      icon: ShieldCheck,
      description:
        'Each branch device is authorized with a unique 6-digit OTP code and hardware fingerprint. Customize your interface with high-contrast themes including Dark Cyan, Obsidian Sleek, and Emerald.',
      highlights: [
        { title: '6-Digit OTP Verification', desc: 'Secure authorization code requirement prevents unauthorized logins.' },
        { title: 'Remote Access Revoke', desc: 'Managers can revoke access for lost or old devices in one click.' },
        { title: 'Refined Dark Cyan', desc: 'Rich, high-contrast dark palette tailored for night and POS shifts.' },
      ],
      preview: (
        <div className="bg-muted/40 border rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Theme & Device Security</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-700 border border-cyan-500 inline-block" />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-emerald-400 inline-block" />
              <span className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-600 inline-block" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-background border flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Android Device (TECNO)</p>
              <p className="text-[10px] text-muted-foreground">Authorized via OTP</p>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">Approved</Badge>
          </div>
        </div>
      ),
    },
  ]

  if (!isOpen) return null

  const active = steps[currentStep]
  const IconComponent = active.icon
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar with Step Dots and Close */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Badge variant="secondary" className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1 text-primary" /> {active.badge}
            </Badge>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{active.title}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{active.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{active.description}</p>

          {/* Interactive Feature Preview Simulation */}
          <div className="pt-1">{active.preview}</div>

          {/* Key Highlights List */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Capabilities</p>
            <div className="space-y-1.5">
              {active.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">{h.title}: </span>
                    <span className="text-muted-foreground">{h.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10 gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip Tour
          </Button>

          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`transition-all duration-200 rounded-full ${
                  idx === currentStep
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={prevStep} className="h-8 text-xs">
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}

            {isLast ? (
              <Button size="sm" onClick={handleDismiss} className="h-8 text-xs bg-primary text-primary-foreground font-semibold">
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={nextStep} className="h-8 text-xs bg-primary text-primary-foreground font-semibold">
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
