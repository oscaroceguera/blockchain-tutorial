const app = require('express')()
const bodyParser = require('body-parser')
const Blockchain = require('./blockchain')
const uuid = require('uuid/v1')
const port = process.argv[2]
const rp = require('request-promise')

const nodeAddress = uuid().split('-').join('')

const bitcoin = new Blockchain()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

app.get('/blockchain', (req, res) => {
  res.send(bitcoin)
})

app.post('/transaction', (req, res) => {
  const newTransaction = req.body
  const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction)
  res.json({note: `transaction will be added in block ${blockIndex}`})
})

app.post('/transaction/broadcast', (req, res) => {
  const newTransaction = bitcoin.createNewTransation(req.body.amount, req.body.sender, req.body.recipient)
  bitcoin.addTransactionToPendingTransactions()

  const requestPromises = []
  bitcoin.networkNodes.forEach(networkNodeurl => {
    const requestOptions = {
      uri: networkNodeurl + '/transaction',
      method: 'POST',
      body: newTransaction,
      json: true
    }

    requestPromises.push(rp(requestOptions))
  })

  Promise.all(requestPromises)
    .then(data => {
      res.json({note: 'Transaction created and broadcast successfully'})
    })
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
  const newBlock = bitcoin.createNewBLock(nonce, previousBlockHash, blockHash)

  const requestPromises = []
  bitcoin.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/recieve-new-block',
      method: 'POST',
      body: {newBlock: newBlock},
      json: true
    }
    requestPromises.push(rp(requestOptions))
  })

  Promise.all(requestPromises)
    .then(data => {
      const requestOptions = {
        uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
        method: 'POST',
        body: {
          amount: 12.5,
          sender: '00',
          recipient: nodeAddress
        },
        json: true
      }
      return rp(requestOptions)
    })
    .then(data => {
      res.json({
        note: 'New block mined & broadcast successfully',
        block: newBlock
      })
    })
})

app.post('/receive-new-block', (req, res) => {

})

// 1. register a node and broadcast it the network
app.post('/register-and-broadcast-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl

  if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
    bitcoin.networkNodes.push(newNodeUrl)
  }

  const regNodesPromises = []

  bitcoin.networkNodes.forEach(networkNodeUrl => {
    // '/register-node
    const requestOptions = {
      uri: networkNodeUrl + '/register-node',
      method: 'POST',
      body: { newNodeUrl },
      json: true
    }

    regNodesPromises.push(rp(requestOptions))
  })

  Promise.all(regNodesPromises)
    .then(data => {
      const bulkRegisterOptions = {
        uri: newNodeUrl + '/register-nodes-bulk',
        method: 'POST',
        body: {
          allNetworkNodes: [
            ...bitcoin.networkNodes,
            bitcoin.currentNodeUrl
          ]
        },
        json: true
      }

      return rp(bulkRegisterOptions)
    }).then(data => {
      res.json({note: 'new node register with network successfully'})
    }).catch(error => {
      console.error('/register-and-broadcast-node Promise error ===> ' + error)
      res.send(error)
    })
})

// 2. register a node with the network
app.post('/register-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl
  const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1
  const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl

  if (nodeNotAlreadyPresent && notCurrentNode) {
    bitcoin.networkNodes.push(newNodeUrl)
  }

  res.json({note: 'New node registered successfully with node'})
})

// 3. register multiple nodes at once
app.post('/register-nodes-bulk', (req, res) => {
  const allNetworkNodes = req.body.allNetworkNodes

  allNetworkNodes.forEach(networkNodeUrl => {
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1
    const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl

    if (nodeNotAlreadyPresent && notCurrentNode) {
      bitcoin.networkNodes.push(networkNodeUrl)
    }
  })

  res.json({note: 'Bulk registration successful'})
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
