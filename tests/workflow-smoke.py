"""Execute the workflow's actual shell steps on tiny local npm fixtures. No network dependencies."""
import json, os, pathlib, subprocess, tempfile, yaml
workflow = yaml.safe_load((pathlib.Path(__file__).parent / '../ci/vertex-validation.yml').read_text())
steps = {s['name']: s for s in workflow['jobs']['validate']['steps']}
assert workflow['permissions'] == {'contents': 'read'}
assert set(workflow.get('on', workflow.get(True))) == {'workflow_dispatch'}
for mode in ['pass', 'no_tests', 'build_fails', 'tests_fail']:
    with tempfile.TemporaryDirectory() as folder:
        folder = pathlib.Path(folder)
        scripts = {'build': 'node -e "process.exit(%d)"' % (1 if mode == 'build_fails' else 0)}
        if mode != 'no_tests': scripts['test:ci'] = 'node -e "process.exit(%d)"' % (1 if mode == 'tests_fail' else 0)
        (folder/'package.json').write_text(json.dumps({'name':'vertex-fixture','version':'1.0.0','scripts':scripts}))
        (folder/'package-lock.json').write_text(json.dumps({'name':'vertex-fixture','version':'1.0.0','lockfileVersion':3,'packages':{'':{'name':'vertex-fixture','version':'1.0.0'}}}))
        env = dict(os.environ, CI='true', GITHUB_OUTPUT=str(folder/'outputs'), GITHUB_STEP_SUMMARY=str(folder/'summary'))
        def run(name):
            return subprocess.run(['bash','-e','-o','pipefail','-c', steps[name]['run']], cwd=folder, env=env, capture_output=True, text=True, timeout=30)
        assert run('Inspect scripts').returncode == 0
        assert run('Dependencies').returncode == 0
        assert run('Build').returncode == (1 if mode == 'build_fails' else 0)
        if mode == 'build_fails': continue
        if mode == 'no_tests':
            assert (folder/'outputs').read_text().strip() == 'test_script='
            assert run('No tests configured').returncode == 0
        else:
            env['TEST_SCRIPT'] = 'test:ci'
            assert run('Tests').returncode == (1 if mode == 'tests_fail' else 0)
print('PASS: actual npm workflow steps execute success, absent tests, failing build and failing tests correctly.')
