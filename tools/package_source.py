"""Export reviewed public source and a self-contained skill. Standard library only; MIT."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ROOT_FILES = ['AGENTS.md', 'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', '.gitignore', 'package.json', 'index.html', 'LICENSE', 'LICENSE-CODE']
PUBLIC_DOCS = ['来源说明.md', '核验记录.md', '引用对照.md', '版本管理.md', '公开发布准备.md', 'v0.2使用说明.md', '创作与授权记录.md', 'v0.8发布检查.md', 'v0.9发布检查.md', 'PDF构建说明.md', '首次发布指南.md', '案例整理模板.md', '月度维护.md']


def read_safe(relative):
    p = ROOT / relative
    if p.is_symlink() or not p.resolve().is_relative_to(ROOT):
        raise ValueError('Unsafe file: ' + relative)
    data = p.read_bytes()
    for pattern in [rb'[A-Z]:[\\/](?:Users|How-to-Train-Better)', rb'gh[pousr]_[A-Za-z0-9]{30,}', rb'-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----', rb'(?i)[?&](?:sig|x-amz-signature|access_token)=']:
        if re.search(pattern, data):
            raise ValueError('Review potentially private data: ' + relative)
    return data


def export(kind, files, version):
    manifest = {'version': version, 'kind': kind, 'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(files.items())]}
    encoded = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    fingerprint = hashlib.sha256(encoded).hexdigest()[:12]
    files = {**files, 'manifest.json': encoded}
    folder = ROOT / 'dist' / 'exports' / f'v{version}-{kind}-{fingerprint}'
    folder.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        out = folder / name
        out.parent.mkdir(parents=True, exist_ok=True)
        if out.exists() and out.read_bytes() != data:
            raise ValueError('Refusing to change immutable export: ' + name)
        out.write_bytes(data)
    archive = ROOT / 'dist' / f'HowToTrainBetter-v{version}-{kind}-{fingerprint}.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data)
    with zipfile.ZipFile(archive) as z:
        assert set(z.namelist()) == set(files)
        for name, data in files.items():
            assert z.read(name) == data == (folder / name).read_bytes()
    return {'folder': folder.relative_to(ROOT).as_posix(), 'archive': archive.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': len(files)}


def build():
    version = json.loads(read_safe('package.json'))['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid version')
    paths = ROOT_FILES + ['docs/' + p for p in PUBLIC_DOCS] + ['evaluation/cases.json', 'evaluation/README.md', 'dist/HowToTrainBetter.html', 'dist/stats.json', 'dist/HowToTrainBetter.pdf', 'dist/pdf-manifest.json']
    for directory in ['assets', 'book', 'skills', 'tools', 'tests', 'licenses', '.github']:
        for p in sorted((ROOT / directory).rglob('*')):
            if p.is_symlink():
                raise ValueError('Symlink in export')
            if p.is_file() and '__pycache__' not in p.parts:
                paths.append(p.relative_to(ROOT).as_posix())
    source = {p: read_safe(p) for p in sorted(set(paths))}
    # Generated only; no second manually maintained knowledge base.
    base = 'train-better-guide/'
    skill = {base + 'SKILL.md': read_safe('skills/train-better-guide/SKILL.md'), base + 'agents/openai.yaml': read_safe('skills/train-better-guide/agents/openai.yaml')}
    for p in sorted((ROOT / 'book').glob('*.md')):
        skill[base + 'references/book/' + p.name] = read_safe(p.relative_to(ROOT).as_posix())
    index = '# How to Train Better · v' + version + '\n\n署名：栗子豪。原创正文 CC BY-NC 4.0。\n\n自动从项目 book/ 生成；不要手工维护此副本。先读完整条目，保留备注与限制。\n\n'
    index += '\n'.join('- [' + p.stem + '](book/' + p.name + ')' for p in sorted((ROOT / 'book').glob('*.md')))
    index += '\n\n证据A：质量较好且总体一致；B：重要限制；C：实践建议或推断。补剂推荐A：目标匹配时优先考虑；B：条件性；C：一般不优先。两种分级不同，A不代表必买。性价比是按条目目标与成本作出的编辑判断，不合成总分。\n\n来源读取层级见 [核验记录](核验记录.md)。'
    skill[base + 'references/INDEX.md'] = index.encode()
    skill[base + 'references/核验记录.md'] = read_safe('docs/核验记录.md')
    for p in ['LICENSE', 'LICENSE-CODE', 'licenses/NOTICE.txt']:
        skill[base + p] = read_safe(p)
    skill[base + 'licenses/README.md'] = '原创技能和知识库 CC BY-NC 4.0；代码 MIT。完整范围见 NOTICE.txt，完整协议在上级 LICENSE 与 LICENSE-CODE。第三方原始论文不随包分发。\n'.encode()
    skill[base + 'README.md'] = ('# 独立技能包\n\n署名：栗子豪 · 高性价比健身指南（How to Train Better）。原创正文与技能 CC BY-NC 4.0，代码 MIT。\n\n保留整个 train-better-guide 文件夹，由支持技能的助手读取 SKILL.md。知识库已在 references/book/，无需原项目目录。未自动安装或注册。更新请换用完整新版，并保留许可；不要只复制 SKILL.md。\n\n版本 ' + version + '，正文是项目 book/ 的生成副本。\n').encode()
    result = {'version': version, 'source': export('source', source, version), 'skill': export('skill', skill, version)}
    (ROOT / 'dist/source-release.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps(result, ensure_ascii=False))
    return result


if __name__ == '__main__':
    build()
