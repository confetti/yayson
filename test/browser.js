// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
mocha.setup('bdd');

require('./yayson/store');
require('./yayson/presenter');
require('./yayson/utils');
require('./yayson/adapter');
require('./yayson/adapters/sequelize');

mocha.checkLeaks();
mocha.run();
