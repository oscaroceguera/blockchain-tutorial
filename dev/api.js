const app = require('express')()
const bodyParser = require('body-parser')
const Blockchain = require('./blockchain')
const uuid = require('uuid/v1')

const nodeAddress = uuid().split('-').join('')

const bitcoin = new Blockchain()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

app.get('/blockchain', (req, res) => {
  res.send(bitcoin)
})

app.post('/transaction', (req, res) => {
  const { amount, sender, recipient } = req.body
  const blockIndex = bitcoin.createNewTransation(amount, sender, recipient)
  res.json({ note: `Transaction will be added in block ${blockIndex}` })
})

app.get('/mine', (req, res) => {
  const lastBlock = bitcoin.getLastBlock()
  const previousBlockHash = lastBlock['hash']
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock['index'] + 1
  }
  const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData)
  const blockHash = bitcoin.hasBlock(previousBlockHash, currentBlockData, nonce)

  bitcoin.createNewTransation(12.5, '00', nodeAddress)

  const newBlock = bitcoin.createNewBLock(nonce, previousBlockHash, blockHash)
  res.json({
    note: 'New block mined successfully',
    block: newBlock
  })
})

app.listen(3000, () => {
  console.log('listening on port 3000')
})
