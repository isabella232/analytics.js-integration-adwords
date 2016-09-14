'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var integration = require('@segment/analytics.js-integration');
var tester = require('@segment/analytics.js-integration-tester');
var AdWords = require('../lib/');
var sandbox = require('@segment/clear-env');

describe('AdWords', function() {
  var adwords;
  var analytics;
  var options = {
    conversionId: 978352801,
    events: {
      signup: '-kGkCJ_TsgcQofXB0gM',
      login: 'QbThCM_zogcQofXB0gM',
      play: 'b91fc77f'
    }
  };

  beforeEach(function() {
    analytics = new Analytics();
    adwords = new AdWords(options);
    analytics.use(AdWords);
    analytics.use(tester);
    analytics.add(adwords);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    adwords.reset();
    sandbox();
  });

  it('should have the correct settings', function() {
    analytics.compare(AdWords, integration('AdWords')
      .option('conversionId', '')
      .option('remarketing', false)
      .mapping('events'));
  });

  describe('loading', function() {
    it('should load', function(done) {
      analytics.load(adwords, done);
    });
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window, 'google_trackConversion');
      });

      it('should not load remarketing if option is not on', function() {
        adwords.options.remarketing = false;
        analytics.page();
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: {},
          google_remarketing_only: false
        });
      });

      it('should load remarketing if option is on', function() {
        adwords.options.remarketing = true;
        analytics.page();
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: {
            path: window.location.pathname,
            referrer: document.referrer,
            search: '',
            title: '',
            url: window.location.href
          },
          google_remarketing_only: true
        });
      });

      it('should load remarketing with page props and window.google_custom_params', function() {
        adwords.options.remarketing = true;
        window.google_custom_params = {
          dynx_itemid: ['1'],
          dynx_pagetype: 'offerdetail',
          dynx_totalvalue: '42'
        };
        analytics.page();
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: {
            path: window.location.pathname,
            referrer: document.referrer,
            search: '',
            title: '',
            url: window.location.href,
            dynx_itemid: ['1'],
            dynx_pagetype: 'offerdetail',
            dynx_totalvalue: '42'
          },
          google_remarketing_only: true
        });
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.stub(window, 'google_trackConversion');
        delete window.google_custom_params;
      });

      it('should not send if event is not defined', function() {
        analytics.track('toString', {});
        analytics.didNotCall(window.google_trackConversion);
      });

      it('should send event if it is defined', function() {
        analytics.track('signup', {});
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: {},
          google_conversion_language: 'en',
          google_conversion_format: '3',
          google_conversion_color: 'ffffff',
          google_conversion_label: options.events.signup,
          google_conversion_value: 0,
          google_remarketing_only: false
        });
      });

      it('should support array events', function() {
        adwords.options.events = [{ key: 'login', value: 'QbThCM_zogcQofXB0gM' }];
        analytics.track('login');
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: {},
          google_conversion_language: 'en',
          google_conversion_format: '3',
          google_conversion_color: 'ffffff',
          google_conversion_label: adwords.options.events[0].value,
          google_conversion_value: 0,
          google_remarketing_only: false
        });
      });

      it('should send revenue', function() {
        analytics.track('login', { revenue: 90 });
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: {},
          google_conversion_language: 'en',
          google_conversion_format: '3',
          google_conversion_color: 'ffffff',
          google_conversion_label: options.events.login,
          google_conversion_value: 90,
          google_remarketing_only: false
        });
      });

      it('should support remarketing if enabled', function() {
        adwords.options.remarketing = true;
        analytics.track('login', { revenue: 90, custom: 'summer sixteen' });
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: { custom: 'summer sixteen' },
          google_conversion_language: 'en',
          google_conversion_format: '3',
          google_conversion_color: 'ffffff',
          google_conversion_label: options.events.login,
          google_conversion_value: 90,
          google_remarketing_only: true
        });
      });

      it('should send custom params from window with properties for remarketing', function() {
        window.google_custom_params = {
          dynx_itemid: ['1'],
          dynx_pagetype: 'offerdetail',
          dynx_totalvalue: '42'
        };
        adwords.options.remarketing = true;
        analytics.track('login', { revenue: 90, custom: 'summer sixteen' });
        analytics.called(window.google_trackConversion, {
          google_conversion_id: options.conversionId,
          google_custom_params: { 
            custom: 'summer sixteen',
            dynx_itemid: ['1'],
            dynx_pagetype: 'offerdetail',
            dynx_totalvalue: '42'
          },
          google_conversion_language: 'en',
          google_conversion_format: '3',
          google_conversion_color: 'ffffff',
          google_conversion_label: options.events.login,
          google_conversion_value: 90,
          google_remarketing_only: true
        });
      });
    });
  });
});
