import type { ComponentType } from 'react'

// What every tile's illustration gets from the grid.
// active: the visitor is pointing at (or has focused) this tile, so its little scene plays.
// open: this is the big copy inside the opened panel (always active there).
export type ArtProps = { active: boolean; open?: boolean }
export type Art = ComponentType<ArtProps>
