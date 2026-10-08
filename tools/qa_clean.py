"""Rebuild an exported candidate in a new contained directory. No network. MIT."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
release = json.loads((ROOT/'dist/source-release.json').read_text(encoding='utf8'))
reader = json.loads((ROOT/'dist/public-release.json').read_text(encoding='utf8'))
archive = ROOT/release['source']['archive']
assert hashlib.sha256(archive.read_bytes()).hexdigest() == release['source']['sha256']
(ROOT/'.cache').mkdir(exist_ok=True)
dest = Path(tempfile.mkdtemp(prefix='clean-v'+release['version']+'-', dir=ROOT/'.cache')).resolve()
assert dest.is_relative_to((ROOT/'.cache').resolve())
with zipfile.ZipFile(archive) as z:
    for name in z.namelist():
        target = (dest/name).resolve()
        assert target.is_relative_to(dest) and not Path(name).is_absolute()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(name))
manifest = json.loads((dest/'manifest.json').read_text(encoding='utf8'))
for f in manifest['files']:
    assert hashlib.sha256((dest/f['path']).read_bytes()).hexdigest() == f['sha256']
commands = [['node','tools/build.mjs'], ['node','--test',*sorted(p.relative_to(dest).as_posix() for p in (dest/'tests').glob('*.test.mjs'))],
            [sys.executable,'tools/build_pdf.py'], [sys.executable,'tools/package_release.py'], [sys.executable,'tools/package_source.py']]
results=[]
for cmd in commands:
    run=subprocess.run(cmd,cwd=dest,capture_output=True,encoding='utf8',errors='replace')
    results.append({'command': [Path(cmd[0]).name,*cmd[1:]],'exitCode':run.returncode,'output':run.stdout+run.stderr})
    if run.returncode: raise RuntimeError(results[-1])
for name in ['HowToTrainBetter.html','HowToTrainBetter.pdf','stats.json']:
    assert (dest/'dist'/name).read_bytes() == (ROOT/'dist'/name).read_bytes(), name
rebuilt=json.loads((dest/'dist/source-release.json').read_text(encoding='utf8'))
rebuilt_reader=json.loads((dest/'dist/public-release.json').read_text(encoding='utf8'))
assert rebuilt['source']['sha256']==release['source']['sha256']
assert rebuilt['skill']['sha256']==release['skill']['sha256']
assert rebuilt_reader['sha256']==reader['sha256']
report={'version':release['version'],'sourceArchive':release['source']['archive'],'sourceHash':release['source']['sha256'],
        'commands':results,'offlineMatches':True,'pdfMatches':True,'sourceArchiveMatches':True,'skillArchiveMatches':True,'readerArchiveMatches':True,
        'limitations':['Local clean rebuild only; GitHub cloud runner not executed.','This check does not evaluate model answers; see the separate evaluation report.']}
(ROOT/'docs/qa').mkdir(parents=True,exist_ok=True)
(ROOT/'docs/qa/source-clean-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'version':release['version'],'checks':'passed','offlinePdfAndThreeArchives':'byte-identical'},ensure_ascii=False))
