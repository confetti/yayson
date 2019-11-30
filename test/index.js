var context = require.context('.', false, /\.js?$/)
context.keys().forEach(context)
module.exports = context
