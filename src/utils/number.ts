const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const units = ['', '拾', '佰', '仟']
const bigUnits = ['', '万', '亿', '兆']

export function amountToChinese(n: number): string {
  if (n === 0) return '零元整'
  const num = Math.round(n * 100)
  const integerPart = Math.floor(num / 100)
  const decimalPart = num % 100
  let result = ''
  if (integerPart > 0) {
    result += integerToChinese(integerPart) + '元'
  }
  if (decimalPart === 0) {
    result += '整'
  } else {
    const jiao = Math.floor(decimalPart / 10)
    const fen = decimalPart % 10
    if (jiao > 0) {
      result += digits[jiao] + '角'
    } else if (integerPart > 0) {
      result += '零'
    }
    if (fen > 0) {
      result += digits[fen] + '分'
    }
  }
  return result
}

function integerToChinese(n: number): string {
  if (n === 0) return digits[0]
  let result = ''
  let bigUnitIndex = 0
  let needZero = false
  while (n > 0) {
    const segment = n % 10000
    n = Math.floor(n / 10000)
    let segmentStr = ''
    if (segment === 0) {
      needZero = true
    } else {
      segmentStr = segmentToChinese(segment)
      if (needZero) {
        segmentStr = digits[0] + segmentStr
        needZero = false
      }
      segmentStr += bigUnits[bigUnitIndex]
    }
    result = segmentStr + result
    bigUnitIndex++
  }
  return result
}

function segmentToChinese(n: number): string {
  let result = ''
  let unitIndex = 0
  let needZero = false
  while (n > 0) {
    const digit = n % 10
    n = Math.floor(n / 10)
    if (digit === 0) {
      needZero = true
    } else {
      if (needZero) {
        result = digits[0] + result
        needZero = false
      }
      result = digits[digit] + units[unitIndex] + result
    }
    unitIndex++
  }
  return result
}
