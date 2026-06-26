const bodyParser = require('body-parser')

function jsonBodyParser() {
  return bodyParser.json({
    verify: (req, _res, buf) => {
      req.rawBody = Buffer.from(buf || '')
    }
  })
}

module.exports = {
  jsonBodyParser
}
