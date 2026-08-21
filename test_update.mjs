import { updateSpreadsheet } from './spreadsheet.mjs'

// Minimal Map-like object expected by updateSpreadsheet
const dataMap = {
  has: (k) => {
    return k === 'Luz'
  },
  get: (k) => {
    if (k === 'Luz') {
      return { toArray: () => [{ source: 'comprovante', value: 12345 }] }
    }
    return { toArray: () => [] }
  }
}

updateSpreadsheet(dataMap)
  .then(() => console.log('updateSpreadsheet finished'))
  .catch((err) => {
    console.error('[TEST ERROR] ', err)
    process.exit(1)
  })
