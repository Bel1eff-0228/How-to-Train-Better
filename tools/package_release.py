"""Make a reader-only, portable release using an explicit file allowlist. MIT."""
import hashlib
import json
from pathlib import Path
import re
import zipfile
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def build():
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid version')
    stats = json.loads((ROOT / 'dist/stats.json').read_text(encoding='utf-8'))
    if stats['version'] != version:
        raise ValueError('Build before packaging this version')
    html = (ROOT / 'dist/HowToTrainBetter.html').read_bytes()
    pdf = (ROOT / 'dist/HowToTrainBetter.pdf').read_bytes()
    pdf_info = json.loads((ROOT / 'dist/pdf-manifest.json').read_text(encoding='utf8'))
    content = json.loads(subprocess.check_output(['node', 'tools/export_book.mjs'], cwd=ROOT).decode('utf8'))
    content_hash = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    if pdf_info['version'] != version or pdf_info['sha256'] != hashlib.sha256(pdf).hexdigest() or pdf_info['contentSha256'] != content_hash:
        raise ValueError('PDF is stale; rebuild it before packaging')
    notice = f'''高性价比健身指南（How to Train Better）v{version}

开始阅读：双击 HowToTrainBetter.html，用浏览器打开；无需账号或服务器。
也可以打开 index.html，内容相同。两份文件均包含正文、检索工具及完整许可。
正式PDF：HowToTrainBetter.pdf，可搜索文字、点击目录和来源；每页有署名水印。

本版{stats['chapters']}章{stats['entries']}条：力量、有氧、饮食、恢复、消费、补剂、进阶与身体不适。
从场景导读或全部问题开始；支持关键词、组合筛选、收藏、已读和备份。
条目中的S编号可跳到参考资料。外部论文和机构页面需要联网。
先看直接建议、怎么做和例子，再看调整条件与依据。复制条目附带方法、限制、出处与署名。反馈模板只生成文字，不会发送。
打印前先筛选要读的条目，打印内容会包含这些条目的来源。

阅读记录只保存在当前浏览器；清理浏览器、换设备或移动文件可能丢失记录。
请在“我的阅读”主动导出备份，换文件后再导入。文件不会自动更新。
页面没有广告、注册、分析统计或上传健康资料的功能。
网页不调用AI；配套AI技能需另取独立技能包或完整项目，并由具备文件读取能力的助手使用。

适用于普通成年健身者的一般知识与选择，不是个人训练表、疾病诊断或康复处方。
请同时看证据、适用限制和来源日期；来源核验并非医学专业审查。

分享请署名“栗子豪”，作品名“高性价比健身指南（How to Train Better）”。
原创正文与技能文档按CC BY-NC 4.0允许署名的非商业分享和改编，修改请标明。
https://creativecommons.org/licenses/by-nc/4.0/
商业使用需另获许可；代码按MIT；上游和外部来源保持各自权利。
完整范围与协议见NOTICE.txt、LICENSE、LICENSE-CODE，也可在页面内离线查看。
来源结构与界面改编自eternity4719的HowToLiveBetter，不代表其对健身内容背书。

本包为本地发布候选文件，尚未在公开网站上线。
需要网站时，可将本包文件放在静态托管目录，index.html为首页。
网站服务器的访问日志规则由实际托管方决定。
发现疑问可用条目下的“反馈这条”记录并联系向你提供本指南的人。
'''
    files = {
        'index.html': html,
        'HowToTrainBetter.html': html,
        'HowToTrainBetter.pdf': pdf,
        '开始阅读.txt': notice.encode('utf-8-sig'),
        **{name: (ROOT / source).read_bytes() for name, source in {
            'NOTICE.txt': 'licenses/NOTICE.txt', 'LICENSE': 'LICENSE',
            'LICENSE-CODE': 'LICENSE-CODE'}.items()},
    }
    for name, data in files.items():
        if re.search(rb'[A-Z]:[\\/](?:Users|How-to-Train-Better)', data, re.I):
            raise ValueError('Local machine path in public file: ' + name)
    manifest = {'version': version, 'files': [
        {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        for name, data in sorted(files.items())]}
    files['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    fingerprint = hashlib.sha256(files['manifest.json']).hexdigest()[:12]
    # Immutable directory; never remove a directory or bundle unrelated project files.
    dest = ROOT / 'dist/public' / f'v{version}-{fingerprint}'
    dest.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        target = dest / name
        if target.is_symlink() or (target.exists() and target.read_bytes() != data):
            raise ValueError('Refusing to overwrite modified release: ' + str(target))
        target.write_bytes(data)
    if set(p.name for p in dest.iterdir()) != set(files):
        raise ValueError('Unexpected files in reader release')
    archive = ROOT / 'dist' / f'HowToTrainBetter-v{version}-readers-{fingerprint}.zip'
    if not archive.exists():
        with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED) as out:
            for name, data in sorted(files.items()):
                item = zipfile.ZipInfo(name, (2026, 10, 2, 0, 0, 0))
                item.compress_type = zipfile.ZIP_DEFLATED
                out.writestr(item, data)
    with zipfile.ZipFile(archive) as bundled:
        if sorted(bundled.namelist()) != sorted(files):
            raise ValueError('Unexpected archive files')
        for name, data in files.items():
            if bundled.read(name) != data:
                raise ValueError('Archive verification failed: ' + name)
    result = {'version': version, 'folder': str(dest.relative_to(ROOT)).replace('\\', '/'),
              'archive': str(archive.relative_to(ROOT)).replace('\\', '/'),
              'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': len(files)}
    (ROOT / 'dist/public-release.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    build()
