// ESM syntax is supported.
import execa from 'execa';
import fse from 'fs-extra';

(async () => {
  const { projects } = await fse.readJSON('../angular.json');
  const projectNames = Object.keys(projects);

  const packageJson = await fse.readJSON('../package.json');

  let npmPackageNames = [];
  projectNames.forEach(project => {
    // do not convert to async
    const { name, dependencies = {}, peerDependencies = {} } = fse.readJSONSync(`../packages/${project}/package.json`);
    npmPackageNames.push(name);

    packageJson.devDependencies = { ...packageJson.devDependencies, ...dependencies, ...peerDependencies };
  });

  await fse.writeJSON('../package.json', packageJson, { spaces: 2 });

  try {
    await execa('yarn', {
      stdout: 'inherit',
      cwd: '..',
    });
  } catch (error) {
    console.error(error.stderr);
  }

  npmPackageNames.forEach(name => {
    // do not convert to async
    execa.sync('yarn', ['symlink', 'copy', '--angular', '--packages', name, '--no-watch', '--sync-build'], {
      stdout: 'inherit',
      cwd: '../',
    });
  });

  await execa('git', ['add', '../dist/*', '../package.json'], { stdout: 'inherit' });
  await execa('git', ['commit', '-m', 'Build ng packages'], { stdout: 'inherit' });

  try {
    await execa('git', ['push', 'origin']);
  } catch (error) {
    console.error('An error occured while pushing the git files:\n' + error.stderr);
  }

  process.exit(0);
})();