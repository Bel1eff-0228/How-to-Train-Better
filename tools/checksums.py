"""Write checksums for this build's named release artifacts. MIT."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
def build():
    version = json.loads((ROOT/'package.json').read_text(encoding='utf8'))['version']
    reader = json.loads((ROOT/'dist/public-release.json').read_text(encoding='utf8'))
    exports = json.loads((ROOT/'dist/source-release.json').read_text(encoding='utf8'))
    assert reader['version'] == exports['version'] == version
    names = [reader['archive'], exports['skill']['archive'], exports['source']['archive'], 'dist/HowToTrainBetter.pdf']
    rows=[]
    for name in names:
        path=(ROOT/name).resolve()
        assert path.is_relative_to((ROOT/'dist').resolve())
        rows.append(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name)
    target=ROOT/'dist'/f'SHA256SUMS-v{version}.txt'
    target.write_text('\n'.join(rows)+'\n',encoding='utf8')
    print(target.name)
if __name__ == '__main__':
    build()
