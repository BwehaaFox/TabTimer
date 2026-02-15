'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    autoImport: {
      publicAssetURL: './assets/', // Добавьте это поле специально для чанков!
      webpack: {
        output: {
          publicPath: './', // Оставьте пустым
        },
        optimization: {
          minimize: false, // Отключаем минимизацию в вебпаке
        },
      },
    },
    'ember-cli-terser': {
      enabled: false, // Отключаем сжатие для обхода бага компиляции
    },
    minifyJS: {
      enabled: false, // Полностью отключаем минификацию JS
    },
  });

  return app.toTree();
};
