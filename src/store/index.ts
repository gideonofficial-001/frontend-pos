import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, CartItem, Product } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'njugush-auth' },
  ),
)

export interface ParkedCart {
  id: string
  label?: string
  note?: string
  createdAt: string
  items: CartItem[]
  customerName: string
  customerPhone: string
}

interface CartState {
  items: CartItem[]
  customerName: string
  customerPhone: string
  parkedCarts: ParkedCart[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateItemDiscount: (productId: string, discount: number) => void
  setCustomerInfo: (name: string, phone: string) => void
  clearCart: () => void
  parkCurrentCart: (label?: string) => boolean
  recallCart: (id: string) => void
  removeParkedCart: (id: string) => void
  getSubtotal: () => number      // sum of (unitPrice × qty) — before discounts
  getTotalDiscount: () => number // sum of all item discounts
  getTotal: () => number         // subtotal - totalDiscount
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: '',
      customerPhone: '',
      parkedCarts: [],

      addItem: (product, quantity) => {
        const items = get().items
        const existing = items.find((item) => item.productId === product.id)
        if (existing) {
          const newQty = existing.quantity + quantity
          const maxDiscount = existing.unitPrice * newQty
          const safeDiscount = Math.max(0, Math.min(existing.discount, maxDiscount))
          set({
            items: items.map((item) =>
              item.productId === product.id
                ? {
                    ...item,
                    quantity: newQty,
                    discount: safeDiscount,
                    total: newQty * item.unitPrice - safeDiscount,
                  }
                : item,
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                productId: product.id,
                product,
                quantity,
                unitPrice: product.price,
                discount: 0,
                total: product.price * quantity,
              },
            ],
          })
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((item) => item.productId !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((item) => item.productId !== productId) })
        } else {
          set({
            items: get().items.map((item) => {
              if (item.productId !== productId) return item
              const maxDiscount = item.unitPrice * quantity
              const safeDiscount = Math.max(0, Math.min(item.discount || 0, maxDiscount))
              return {
                ...item,
                quantity,
                discount: safeDiscount,
                total: quantity * item.unitPrice - safeDiscount,
              }
            }),
          })
        }
      },

      updateItemDiscount: (productId, discount) => {
        set({
          items: get().items.map((item) => {
            if (item.productId !== productId) return item
            const maxDiscount = item.unitPrice * item.quantity
            const safeDiscount = Math.max(0, Math.min(discount, maxDiscount))
            return {
              ...item,
              discount: safeDiscount,
              total: item.unitPrice * item.quantity - safeDiscount,
            }
          }),
        })
      },

      setCustomerInfo: (name, phone) => set({ customerName: name, customerPhone: phone }),

      clearCart: () => set({ items: [], customerName: '', customerPhone: '' }),

      parkCurrentCart: (label) => {
        const { items, customerName, customerPhone, parkedCarts } = get()
        if (items.length === 0) return false
        const defaultLabel = customerName || `Cart #${parkedCarts.length + 1}`
        const finalLabel = label || defaultLabel
        const newParked: ParkedCart = {
          id: `parked_${Date.now()}`,
          label: finalLabel,
          note: finalLabel,
          createdAt: new Date().toISOString(),
          items: [...items],
          customerName,
          customerPhone,
        }
        set({
          parkedCarts: [newParked, ...parkedCarts],
          items: [],
          customerName: '',
          customerPhone: '',
        })
        return true
      },

      recallCart: (id) => {
        const { parkedCarts } = get()
        const target = parkedCarts.find((c) => c.id === id)
        if (!target) return
        set({
          items: target.items,
          customerName: target.customerName,
          customerPhone: target.customerPhone,
          parkedCarts: parkedCarts.filter((c) => c.id !== id),
        })
      },

      removeParkedCart: (id) => {
        set({ parkedCarts: get().parkedCarts.filter((c) => c.id !== id) })
      },

      getSubtotal: () =>
        get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),

      getTotalDiscount: () =>
        get().items.reduce((sum, item) => sum + item.discount, 0),

      getTotal: () => {
        const subtotal = get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
        const discount = get().items.reduce((sum, item) => sum + item.discount, 0)
        return Math.max(0, subtotal - discount)
      },
    }),
    { name: 'njugush-cart' },
  ),
)

interface SidebarState {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  toggleMobile: () => void
  setMobileOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>()((set, get) => ({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => set({ collapsed: !get().collapsed }),
  toggleMobile: () => set({ mobileOpen: !get().mobileOpen }),
  setMobileOpen: (open) => set({ mobileOpen: open }),
}))

interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}))
