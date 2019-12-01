require('./common')

mocha.setup('bdd')

require('./yayson/store')
require('./yayson/presenter')
require('./yayson/utils')
require('./yayson/adapter')
require('./yayson/adapters/sequelize')

mocha.checkLeaks()
mocha.run()
