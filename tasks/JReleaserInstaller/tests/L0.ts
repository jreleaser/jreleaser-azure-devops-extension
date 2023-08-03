import * as path from 'path';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as Mocha from 'mocha';
import { expect,assert } from 'chai';

describe('JReleaserInstaller L0 Suite', function () {
  before(function () {
  });

  after(() => {});

  it('should install JReleaser successfully', function (done: Mocha.Done) {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0InstallJReleaserSuccess.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.stdout);
    assert(tr.succeeded, 'true');

    done();
  });
});