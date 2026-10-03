import { createContext, useContext } from 'react'

// Lets an opened panel send the visitor to another tile's panel (e.g. the slot machine landing on Haven).
export const GridNav = createContext<{ openTile: (id: string) => void }>({ openTile: () => {} })
export const useGridNav = () => useContext(GridNav)
