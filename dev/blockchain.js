const sha256 = require('sha256')
const currentNodeUrl = process.argv[3]
const uuid = require('uuid/v1')

class Blockchain {
  constructor () {
    this.chain = []
    this.pendingTransactions = []

    this.currentNodeUrl = currentNodeUrl
    this.networkNodes = []

    this.createNewBLock(100, '0', '0')
  }

  createNewBLock (nonce, previousBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1,
      timestamp: Date.now(),
      transations: this.pendingTransactions,
      nonce,
      hash,
      previousBlockHash
    }

    this.pendingTransactions = []
    this.chain.push(newBlock)

    return newBlock
  }

  getLastBlock () {
    return this.chain[this.chain.length - 1]
  }

  createNewTransation (amount, sender, recipient) {
    const newTransaction = {
      amount,
      sender,
      recipient,
      transactionId: uuid().split('-').join('')
    }

    return newTransaction
  }

  addTransactionToPendingTransactions (transactionObj) {
    this.pendingTransactions.push(transactionObj)
    return this.getLastBlock()['index'] + 1
  }

  hasBlock (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData)
    const hash = sha256(dataAsString)

    return hash
  }

  proofOfWork (previousBlockHash, currentBlockData) {
    let nonce = 0
    let hash = this.hasBlock(previousBlockHash, currentBlockData, nonce)
    while (hash.substring(0, 4) !== '0000') {
      nonce++
      hash = this.hasBlock(previousBlockHash, currentBlockData, nonce)
    }

    return nonce
  }
}

module.exports = Blockchain
