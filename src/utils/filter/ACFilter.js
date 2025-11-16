export default class ACFilter {
  /**
   * @param {string[]} words
   */
  constructor(words) {
    this.root = { next: {}, fail: null, output: [] }

    if (Array.isArray(words) && words.length > 0) {
      for (const w of words) this.insert(w)
      this.build()
    }
  }

  insert(word) {
    let node = this.root
    for (const ch of word) {
      if (!node.next[ch]) node.next[ch] = { next: {}, fail: null, output: [] }
      node = node.next[ch]
    }
    node.output.push(word)
  }

  build() {
    const queue = []
    for (const key in this.root.next) {
      const child = this.root.next[key]
      child.fail = this.root
      queue.push(child)
    }

    while (queue.length) {
      const node = queue.shift()
      for (const key in node.next) {
        const child = node.next[key]
        let fail = node.fail
        while (fail && !fail.next[key]) fail = fail.fail
        child.fail = fail ? fail.next[key] : this.root
        child.output = child.output.concat(child.fail.output)
        queue.push(child)
      }
    }
  }

  /**
   * @param {string} text
   */
  filter(text) {
    let node = this.root
    const result = text.split('')

    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      while (node && !node.next[ch]) node = node.fail
      node = node ? node.next[ch] : this.root

      if (!node) node = this.root

      if (node.output.length > 0) {
        for (const w of node.output) {
          const start = i - w.length + 1
          for (let k = start; k <= i; k++) {
            result[k] = '*'
          }
        }
      }
    }
    return result.join('')
  }

  /**
   * @param {string} text
   */
  hit(text) {
    let node = this.root

    for (let i = 0; i < text.length; i++) {
      const ch = text[i]

      while (node && !node.next[ch]) node = node.fail
      node = node ? node.next[ch] : this.root

      if (!node) node = this.root

      if (node.output.length > 0) {
        return true
      }
    }
    return false
  }

  /**
   * @param {string} text
   */
  verify(text) {
    return !this.hit(text)
  }
}
