import { expect } from "chai";
import { forceRestClient } from "../../../src/database/api/test_access";

import { 
  getRandomNode,
  testAuthTokenProvider,
  getFreshRepoFromReference
} from "../helpers/util";

// Some sanity checks for the ReadonlyRestClient crawler support.
describe('Crawler Support', function() {
  var initialData;
  var normalRef;
  var restRef;
  var tokenProvider;

  beforeEach(function(done) {
    normalRef = getRandomNode();

    forceRestClient(true);
    restRef = getFreshRepoFromReference(normalRef);
    forceRestClient(false);

    tokenProvider = testAuthTokenProvider(restRef.database.app);

    setInitialData(done);
  });

  afterEach(function() {
    tokenProvider.setToken(null);
  });

  function setInitialData(done) {
    // Set some initial data.
    initialData = {
      leaf: 42,
      securedLeaf: 'secret',
      leafWithPriority: { '.value': 42, '.priority': 'pri' },
      obj: { a: 1, b: 2 },
      list: {
        10: { name: 'amy', age: 75, '.priority': 22 },
        20: { name: 'becky', age: 42, '.priority': 52 },
        30: { name: 'fred', age: 35, '.priority': 23 },
        40: { name: 'fred', age: 29, '.priority': 26 },
        50: { name: 'sally', age: 21, '.priority': 96 },
        60: { name: 'tom', age: 16, '.priority': 15 },
        70: { name: 'victor', age: 4, '.priority': 47 }
      },
      valueList: {
        10: 'c',
        20: 'b',
        30: 'e',
        40: 'f',
        50: 'a',
        60: 'd',
        70: 'e'
      }
    };

    normalRef.set(initialData, function(error) {
      expect(error).to.equal(null);
      done();
    });
  }

  it('set() is a no-op', function(done) {
    // This test mostly exists to make sure restRef really is using ReadonlyRestClient
    // and we're not accidentally testing a normal Firebase connection. It also can
    // be a little slow so adding an extra timeout to help out.
    this.timeout(3500);

    normalRef.child('leaf').on('value', function(s) {
      expect(s.val()).to.equal(42);
    });

    restRef.child('leaf').set('hello');

    // We need to wait long enough to be sure that our 'hello' didn't actually get set, but there's
    // no good way to do that.  So we just do a couple round-trips via the REST client and assume
    // that's good enough.
    restRef.child('obj').once('value', function(s) {
      expect(s.val()).to.deep.equal(initialData.obj);

      restRef.child('obj').once('value', function(s) {
        expect(s.val()).to.deep.equal(initialData.obj);

        normalRef.child('leaf').off();
        done();
      });
    });
  });

  it('set() is a no-op (Promise)', function() {
    // This test mostly exists to make sure restRef really is using ReadonlyRestClient
    // and we're not accidentally testing a normal Firebase connection.

    normalRef.child('leaf').on('value', function(s) {
      expect(s.val()).to.equal(42);
    });

    restRef.child('leaf').set('hello');

    // We need to wait long enough to be sure that our 'hello' didn't actually get set, but there's
    // no good way to do that.  So we just do a couple round-trips via the REST client and assume
    // that's good enough.
    return restRef.child('obj').once('value').then(function(s) {
      expect(s.val()).to.deep.equal(initialData.obj);

      return restRef.child('obj').once('value');
    }).then(function(s) {
      expect(s.val()).to.deep.equal(initialData.obj);
      normalRef.child('leaf').off();
    }, function (reason) {
      normalRef.child('leaf').off();
      return Promise.reject(reason);
    });
  });

  it('.info/connected fires with true', function(done) {
    restRef.root.child('.info/connected').on('value', function(s) {
      if (s.val() == true) {
        done();
      }
    });
  });

  it('Leaf read works.', function(done) {
    restRef.child('leaf').once('value', function(s) {
      expect(s.val()).to.equal(initialData.leaf);
      done();
    });
  });

  it('Leaf read works. (Promise)', function() {
    return restRef.child('leaf').once('value').then(function(s) {
      expect(s.val()).to.equal(initialData.leaf);
    });
  });

  it('Object read works.', function(done) {
    restRef.child('obj').once('value', function(s) {
      expect(s.val()).to.deep.equal(initialData.obj);
      done();
    });
  });

  it('Object read works. (Promise)', function() {
    return restRef.child('obj').once('value').then(function(s) {
      expect(s.val()).to.deep.equal(initialData.obj);
    });
  });

  it('Leaf with priority read works.', function(done) {
    restRef.child('leafWithPriority').once('value', function(s) {
      expect(s.exportVal()).to.deep.equal(initialData.leafWithPriority);
      done();
    });
  });

  it('Leaf with priority read works. (Promise)', function() {
    return restRef.child('leafWithPriority').once('value').then(function(s) {
      expect(s.exportVal()).to.deep.equal(initialData.leafWithPriority);
    });
  });

  it('Null read works.', function(done) {
    restRef.child('nonexistent').once('value', function(s) {
      expect(s.val()).to.equal(null);
      done();
    });
  });

  it('Null read works. (Promise)', function() {
    return restRef.child('nonexistent').once('value').then(function(s) {
      expect(s.val()).to.equal(null);
    });
  });

  it('on works.', function(done) {
    restRef.child('leaf').on('value', function(s) {
      expect(s.val()).to.equal(initialData.leaf);
      restRef.child('leaf').off();
      done();
    });
  });
});
