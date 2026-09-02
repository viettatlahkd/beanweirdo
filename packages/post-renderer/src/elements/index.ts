/**
 * The store, assembled.
 *
 * Importing this file is what puts the elements in it — each module registers
 * itself on load. Anything that looks an element up must import from here, not
 * from the individual files, or it may ask before the store is filled.
 */
export * from './registry'
export * from './read'
export * from './text'
export * from './runs'
export * from './list'
export * from './data'
export * from './media'
