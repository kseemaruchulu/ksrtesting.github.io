import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext({})

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find(i => i.id === action.item.id)
      if (existing) {
        return { ...state, items: state.items.map(i => i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i) }
      }
      return { ...state, items: [...state.items, { ...action.item, qty: 1 }] }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case 'INCREMENT':
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, qty: i.qty + 1 } : i) }
    case 'DECREMENT': {
      const item = state.items.find(i => i.id === action.id)
      if (item?.qty === 1) return { ...state, items: state.items.filter(i => i.id !== action.id) }
      return { ...state, items: state.items.map(i => i.id === action.id ? { ...i, qty: i.qty - 1 } : i) }
    }
    case 'CLEAR':
      return { ...state, items: [], coupon: null, discount: 0 }
    case 'APPLY_COUPON':
      return { ...state, coupon: action.coupon, discount: action.discount }
    case 'REMOVE_COUPON':
      return { ...state, coupon: null, discount: 0 }
    default:
      return state
  }
}

const initialState = { items: [], coupon: null, discount: 0 }

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState, () => {
    try {
      const saved = localStorage.getItem('cart')
      return saved ? JSON.parse(saved) : initialState
    } catch { return initialState }
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state))
  }, [state])

  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const itemCount = state.items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ ...state, dispatch, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
